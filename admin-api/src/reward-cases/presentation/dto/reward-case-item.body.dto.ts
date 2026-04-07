import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Variant } from '@prisma/client';

export class CreateRewardCaseItemBodyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  petId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  weight!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder = 0;

  @IsOptional()
  @IsArray()
  @IsEnum(Variant, { each: true })
  variant: Variant[] = [];
}

export class UpdateRewardCaseItemBodyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  petId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(Variant, { each: true })
  variant?: Variant[];
}
