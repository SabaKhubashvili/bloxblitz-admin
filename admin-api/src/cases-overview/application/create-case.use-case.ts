import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaseCatalogCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCaseBodyDto } from '../presentation/dto/create-case.body.dto';
import {
  dropChancesToWeights,
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

const CASE_COVER_CACHE_CONTROL = 'public, max-age=31536000, immutable';

@Injectable()
export class CreateCaseUseCase {
  private readonly logger = new Logger(CreateCaseUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @Inject(IMAGE_PROCESSOR_SERVICE)
    private readonly imageProcessor: ImageProcessorService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    body: CreateCaseBodyDto,
    coverImage?: CaseCoverUploadInput,
  ): Promise<{ id: string }> {
    const petIds = [...new Set(body.items.map((i) => i.petId))];
    const petCount = await this.prisma.pets.count({
      where: { id: { in: petIds } },
    });
    if (petCount !== petIds.length) {
      throw new BadRequestException('One or more pet IDs do not exist');
    }

    const weights = dropChancesToWeights(body.items.map((i) => i.dropChance));

    const riskLevel = body.riskLevel ?? 0;
    const sortOrder = body.sortOrder ?? 0;
    const catalogCategory = body.catalogCategory ?? CaseCatalogCategory.AMP;

    const caseId = randomUUID();
    const objectKey = `cases/${caseId}.webp`;
    let uploadedKey: string | null = null;
    let imageUrl: string | null;

    try {
      if (coverImage) {
        assertValidCaseCoverUpload(coverImage);
        const optimized = await this.imageProcessor.optimizeCaseCoverToWebp(
          coverImage.buffer,
        );
        await this.storage.putObject(objectKey, optimized, {
          contentType: 'image/webp',
          cacheControl: CASE_COVER_CACHE_CONTROL,
        });
        uploadedKey = objectKey;
        imageUrl = this.publicCaseCoverUrl(caseId);
      } else {
        imageUrl = body.imageUrl ?? null;
      }

      const created = await this.prisma.case.create({
        data: {
          id: caseId,
          slug: body.slug.trim().toLowerCase(),
          name: body.name.trim(),
          imageUrl,
          price: new Prisma.Decimal(body.price),
          variant: body.variant,
          catalogCategory,
          riskLevel: new Prisma.Decimal(riskLevel),
          isActive: body.isActive,
          sortOrder,
          items: {
            create: body.items.map((it, idx) => ({
              petId: it.petId,
              weight: weights[idx],
              sortOrder: it.sortOrder,
              variant: toPrismaVariants(it.variant),
            })),
          },
        },
        select: { id: true },
      });
      return { id: created.id };
    } catch (err) {
      if (uploadedKey) {
        await this.storage.deleteObject(uploadedKey);
        this.logger.warn(
          `Removed orphan case cover ${uploadedKey} after failed case create`,
        );
      }

      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(`Slug "${body.slug}" is already in use`);
      }

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

  private publicCaseCoverUrl(caseId: string): string {
    const base = this.config
      .getOrThrow<string>('R2_CDN_PUBLIC_BASE_URL')
      .trim()
      .replace(/\/$/, '');
    return `${base}/cases/${caseId}.webp`;
  }
}
