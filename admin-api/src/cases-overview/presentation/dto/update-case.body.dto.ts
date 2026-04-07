import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateCaseItemBodyDto {
  @IsString()
  id: string;

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

export class UpdateCaseBodyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsBoolean()
  isActive: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateCaseItemBodyDto)
  items: UpdateCaseItemBodyDto[];
}
