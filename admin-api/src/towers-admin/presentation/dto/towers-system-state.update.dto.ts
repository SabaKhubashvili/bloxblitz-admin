import { IsEnum } from 'class-validator';
import { TowersSystemMode } from '../../domain/towers-system-state';

export class TowersSystemStateUpdateDto {
  @IsEnum(TowersSystemMode)
  mode!: TowersSystemMode;
}
