import type { RollingAnalyticsPreset } from '../../../common/rolling-analytics-window';

export class CasesChartDatasetDto {
  label: string;
  data: number[];
}

export class CasesChartResponseDto {
  range: RollingAnalyticsPreset;
  labels: string[];
  datasets: CasesChartDatasetDto[];

  static fromSeries(
    range: RollingAnalyticsPreset,
    labels: string[],
    datasetLabel: string,
    data: number[],
  ): CasesChartResponseDto {
    const o = new CasesChartResponseDto();
    o.range = range;
    o.labels = labels;
    const ds = new CasesChartDatasetDto();
    ds.label = datasetLabel;
    ds.data = data;
    o.datasets = [ds];
    return o;
  }
}
