import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ImageProcessorService } from '../domain/image-processor.service';
import { CaseImageOptimizationError } from '../domain/errors/case-image.errors';

const MAX_WIDTH = 800;
const WEBP_QUALITY = 80;

@Injectable()
export class SharpImageProcessorService implements ImageProcessorService {
  async optimizeCaseCoverToWebp(input: Buffer): Promise<Buffer> {
    try {
      return await sharp(input)
        .rotate()
        .resize({
          width: MAX_WIDTH,
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch {
      throw new CaseImageOptimizationError();
    }
  }
}
