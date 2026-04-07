import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchPetsQueryDto {
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : '',
  )
  @MinLength(1, { message: 'Search query must be at least 1 character' })
  @MaxLength(120)
  q: string;
}
