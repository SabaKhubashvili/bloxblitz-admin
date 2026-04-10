import { IsIn, IsOptional } from 'class-validator';

export class RouletteAnalyticsQueryDto {
  @IsOptional()
  @IsIn(['24h', '7d', '30d'])
  range?: '24h' | '7d' | '30d';
}
