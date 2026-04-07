export type ObjectUploadMetadata = {
  contentType: string;
  cacheControl: string;
};

/**
 * S3-compatible object storage (e.g. Cloudflare R2). Implementations live in infrastructure.
 */
export interface StorageService {
  putObject(
    objectKey: string,
    body: Buffer,
    metadata: ObjectUploadMetadata,
  ): Promise<void>;

  deleteObject(objectKey: string): Promise<void>;
}
