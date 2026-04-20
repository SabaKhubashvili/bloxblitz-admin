import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaseImageUploadError } from '../domain/errors/case-image.errors';
import {
  ObjectUploadMetadata,
  StorageService,
} from '../domain/storage.service';

@Injectable()
export class CloudflareR2StorageService
  implements StorageService, OnModuleInit
{
  private readonly logger = new Logger(CloudflareR2StorageService.name);
  private client!: S3Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const bucket =
      this.config.get<string>('R2_BUCKET_NAME')?.trim() ||
      '';
    const endpoint = this.config.get<string>('R2_ENDPOINT')?.trim();
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID')?.trim();
    const secretAccessKey = this.config
      .get<string>('R2_SECRET_ACCESS_KEY')
      ?.trim();

    if (
      !endpoint ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucket ||
      bucket.length === 0
    ) {
      this.logger.warn(
        'R2 object storage is not fully configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME (or R2_BUCKET) to your Cloudflare R2 bucket name. Case cover uploads will fail until set.',
      );
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: endpoint || 'https://invalid.local',
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : { accessKeyId: '', secretAccessKey: '' },
      forcePathStyle: true,
    });
  }

  async putObject(
    objectKey: string,
    body: Buffer,
    metadata: ObjectUploadMetadata,
  ): Promise<void> {
    if (!this.bucket) {
      throw new CaseImageUploadError(
        'R2 bucket is not configured: set R2_BUCKET_NAME (or R2_BUCKET) to the bucket name shown in Cloudflare dashboard → R2 → Buckets.',
      );
    }
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: body,
          ContentType: metadata.contentType,
          CacheControl: metadata.cacheControl,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `R2 PutObject failed for key ${objectKey}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new CaseImageUploadError();
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    if (!this.bucket) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `R2 DeleteObject failed for key ${objectKey}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
