import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateCaseBodyDto } from '../presentation/dto/update-case.body.dto';
import {
  dropChancesToWeights,
  isUuidV4,
  toPrismaVariants,
} from './case-pool-mutation.helpers';
import {
  assertValidCaseCoverUpload,
  type CaseCoverUploadInput,
} from './case-cover-image.validation';
import {
  CaseImageOptimizationError,
  CaseImageUploadError,
  InvalidCaseImageError,
} from '../domain/errors/case-image.errors';
import type { ImageProcessorService } from '../domain/image-processor.service';
import type { StorageService } from '../domain/storage.service';
import {
  IMAGE_PROCESSOR_SERVICE,
  STORAGE_SERVICE,
} from '../infrastructure/case-image.tokens';
import { CaseAmpCacheInvalidationService } from '../infrastructure/case-amp-cache-invalidation.service';

const CASE_COVER_CACHE_CONTROL = 'public, max-age=31536000, immutable';

@Injectable()
export class UpdateCaseUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseAmpCache: CaseAmpCacheInvalidationService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @Inject(IMAGE_PROCESSOR_SERVICE)
    private readonly imageProcessor: ImageProcessorService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    caseId: string,
    body: UpdateCaseBodyDto,
    coverImage?: CaseCoverUploadInput,
  ): Promise<{ id: string; imageUrl: string | null }> {
    const existingCase = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, slug: true, imageUrl: true },
    });
    if (!existingCase) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    const petIds = [...new Set(body.items.map((i) => i.petId))];
    const petCount = await this.prisma.pets.count({
      where: { id: { in: petIds } },
    });
    if (petCount !== petIds.length) {
      throw new BadRequestException('One or more pet IDs do not exist');
    }

    const weights = dropChancesToWeights(body.items.map((i) => i.dropChance));

    const previousImageUrl = existingCase.imageUrl ?? null;
    let imageUrlForDb = body.imageUrl ?? null;
    let newObjectKey: string | null = null;
    if (coverImage) {
      try {
        assertValidCaseCoverUpload(coverImage);
        const optimized = await this.imageProcessor.optimizeCaseCoverToWebp(
          coverImage.buffer,
        );
        const assetId = randomUUID();
        newObjectKey = `cases/${caseId}/${assetId}.webp`;
        await this.storage.putObject(newObjectKey, optimized, {
          contentType: 'image/webp',
          cacheControl: CASE_COVER_CACHE_CONTROL,
        });
        imageUrlForDb = this.publicUrlForObjectKey(newObjectKey);
      } catch (err) {
        if (err instanceof InvalidCaseImageError) {
          throw new BadRequestException(err.message);
        }
        if (err instanceof CaseImageOptimizationError) {
          throw new BadRequestException(err.message);
        }
        if (err instanceof CaseImageUploadError) {
          throw new ServiceUnavailableException(err.message);
        }
        throw err;
      }
    }

    const oldKeyToRemove =
      newObjectKey != null
        ? this.caseCoverKeyToDeleteAfterReplace(
            caseId,
            previousImageUrl,
            newObjectKey,
          )
        : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.case.update({
        where: { id: caseId },
        data: {
          name: body.name,
          imageUrl: imageUrlForDb,
          price: new Prisma.Decimal(body.price),
          isActive: body.isActive,
        },
      });

      const existingRows = await tx.caseItem.findMany({
        where: { caseId },
        select: { id: true },
      });
      const existingSet = new Set(existingRows.map((e) => e.id));

      const incomingPayloadUuids = new Set(
        body.items.filter((i) => isUuidV4(i.id)).map((i) => i.id),
      );

      for (let idx = 0; idx < body.items.length; idx++) {
        const it = body.items[idx];
        const weight = weights[idx];
        const variant = toPrismaVariants(it.variant);
        const sortOrder = it.sortOrder;

        if (isUuidV4(it.id) && existingSet.has(it.id)) {
          await tx.caseItem.update({
            where: { id: it.id },
            data: {
              petId: it.petId,
              weight,
              sortOrder,
              variant,
            },
          });
        } else {
          const newId = isUuidV4(it.id) ? it.id : randomUUID();
          await tx.caseItem.create({
            data: {
              id: newId,
              caseId,
              petId: it.petId,
              weight,
              sortOrder,
              variant,
            },
          });
        }
      }

      for (const row of existingRows) {
        if (incomingPayloadUuids.has(row.id)) continue;
        const opens = await tx.caseOpenHistory.count({
          where: { wonCaseItemId: row.id },
        });
        if (opens > 0) {
          throw new BadRequestException(
            `Cannot remove case item ${row.id}: it has open history`,
          );
        }
        await tx.caseItem.delete({ where: { id: row.id } });
      }
    });

    await this.caseAmpCache.invalidateAfterCaseMutation(existingCase.slug);

    if (oldKeyToRemove) {
      try {
        await this.storage.deleteObject(oldKeyToRemove);
      } catch {
        // Best-effort cleanup; DB and CDN already point at the new object.
      }
    }

    return { id: caseId, imageUrl: imageUrlForDb };
  }

  private normalizeCdnBase(): string {
    return this.config
      .getOrThrow<string>('R2_CDN_PUBLIC_BASE_URL')
      .trim()
      .replace(/\/$/, '');
  }

  private publicUrlForObjectKey(objectKey: string): string {
    return `${this.normalizeCdnBase()}/${objectKey}`;
  }

  /**
   * Returns a storage key to delete after a successful replace, or null.
   * Only targets this case's canonical or versioned cover paths under our CDN.
   */
  private caseCoverKeyToDeleteAfterReplace(
    caseId: string,
    previousPublicUrl: string | null,
    newObjectKey: string,
  ): string | null {
    const prevKey = this.objectKeyFromPublicUrl(previousPublicUrl);
    if (!prevKey || prevKey === newObjectKey) return null;
    if (!this.isCaseScopedCoverObjectKey(caseId, prevKey)) return null;
    return prevKey;
  }

  private objectKeyFromPublicUrl(url: string | null): string | null {
    if (!url?.trim()) return null;
    const base = this.normalizeCdnBase();
    const u = url.trim();
    if (!u.startsWith(`${base}/`)) return null;
    const key = u.slice(base.length + 1);
    return key.length > 0 ? key : null;
  }

  /** Legacy create path `cases/{id}.webp` or versioned `cases/{id}/{uuid}.webp`. */
  private isCaseScopedCoverObjectKey(caseId: string, objectKey: string): boolean {
    const prefix = `cases/${caseId}`;
    if (objectKey === `${prefix}.webp`) return true;
    if (objectKey.startsWith(`${prefix}/`) && objectKey.endsWith('.webp')) {
      return true;
    }
    return false;
  }
}
