import { IsUUID } from 'class-validator';

export class ResendTwoFactorRequestDto {
  @IsUUID('4')
  challengeId!: string;
}
