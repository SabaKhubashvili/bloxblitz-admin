/**
 * Converts raw case-cover bytes into optimized WebP suitable for CDN delivery.
 */
export interface ImageProcessorService {
  optimizeCaseCoverToWebp(input: Buffer): Promise<Buffer>;
}
