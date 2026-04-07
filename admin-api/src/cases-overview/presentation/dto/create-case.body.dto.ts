import { CaseCatalogCategory, CaseVariant } from '@prisma/client';
import { Type } from 'class-transformer';
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

export class CreateCaseItemBodyDto {
  @IsInt()
  petId: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  dropChance: number;

  @IsInt()
  @Min(0)
  sortOrder: number;

  @IsArray()
  @IsString({ each: true })
  variant: string[];
}

export class CreateCaseBodyDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, {
    message: 'slug must be URL-safe (letters, numbers, hyphens)',
  })
  slug: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsEnum(CaseVariant)
  variant: CaseVariant;

  @IsOptional()
  @IsEnum(CaseCatalogCategory)
  catalogCategory?: CaseCatalogCategory;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  riskLevel?: number;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCaseItemBodyDto)
  items: CreateCaseItemBodyDto[];
}
