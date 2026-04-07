import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { UpdateCaseItemBodyDto } from './update-case.body.dto';

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

function parseUpdateItemsFormValue(
  value: unknown,
): UpdateCaseItemBodyDto[] | undefined {
  let raw: unknown;
  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return undefined;
    }
  } else {
    return undefined;
  }
  if (!Array.isArray(raw)) return undefined;
  return raw.map((entry) =>
    plainToInstance(UpdateCaseItemBodyDto, entry as Record<string, unknown>),
  );
}

function optionalImageUrlFormValue(value: unknown): string | null {
  if (value === '' || value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  return null;
}

/**
 * `PATCH /admin/cases/:id` as `multipart/form-data` (fields + optional `image` file).
 * `items` must be a JSON array string matching {@link UpdateCaseItemBodyDto}.
 */
export class UpdateCaseMultipartBodyDto {
  @IsString()
  name: string;

  @IsOptional()
  @Transform(({ value }) => optionalImageUrlFormValue(value))
  @IsString()
  imageUrl?: string | null;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0.01)
  price: number;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isActive: boolean;

  @Transform(({ value }) => parseUpdateItemsFormValue(value))
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateCaseItemBodyDto)
  items: UpdateCaseItemBodyDto[];
}
