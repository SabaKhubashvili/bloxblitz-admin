import { IsIn, IsOptional } from 'class-validator';

export class TowersOverviewQueryDto {
  @IsOptional()
  @IsIn(['24h', '7d', '30d', 'all'])
  range?: '24h' | '7d' | '30d' | 'all';
}
