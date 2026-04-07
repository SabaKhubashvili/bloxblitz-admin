import { CaseCatalogCategory, CaseVariant } from '@prisma/client';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateCaseItemBodyDto } from './create-case.body.dto';

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

function parseItemsFormValue(
  value: unknown,
): CreateCaseItemBodyDto[] | undefined {
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
  // Plain JSON objects must become DTO instances or forbidNonWhitelisted rejects nested keys.
  return raw.map((entry) =>
    plainToInstance(CreateCaseItemBodyDto, entry as Record<string, unknown>),
  );
}

function optionalImageUrlFormValue(value: unknown): string | null {
  if (value === '' || value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  return null;
}

/**
 * Request body for `multipart/form-data` case creation (fields + optional `image` file).
 * `items` must be a JSON array string matching {@link CreateCaseItemBodyDto}.
 */
export class CreateCaseMultipartBodyDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, {
    message: 'slug must be URL-safe (letters, numbers, hyphens)',
  })
  slug: string;

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

  @IsEnum(CaseVariant)
  variant: CaseVariant;

  @IsOptional()
  @IsEnum(CaseCatalogCategory)
  catalogCategory?: CaseCatalogCategory;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  riskLevel?: number;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @Transform(({ value }) => parseItemsFormValue(value))
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCaseItemBodyDto)
  items: CreateCaseItemBodyDto[];
}
