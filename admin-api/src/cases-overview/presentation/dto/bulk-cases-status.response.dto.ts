export class BulkCasesStatusResponseDto {
  success!: true;
  updatedCount!: number;

  static ok(updatedCount: number): BulkCasesStatusResponseDto {
    const o = new BulkCasesStatusResponseDto();
    o.success = true;
    o.updatedCount = updatedCount;
    return o;
  }
}
