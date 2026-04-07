import { IsNotEmpty, IsString } from 'class-validator';

export class CancelCoinflipGameDto {
  @IsString()
  @IsNotEmpty()
  gameId!: string;
}
