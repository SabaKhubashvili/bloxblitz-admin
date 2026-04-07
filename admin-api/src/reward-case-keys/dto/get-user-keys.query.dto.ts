import { IsString, MinLength } from 'class-validator';

export class GetUserKeysQueryDto {
  @IsString()
  @MinLength(1)
  username!: string;
}
