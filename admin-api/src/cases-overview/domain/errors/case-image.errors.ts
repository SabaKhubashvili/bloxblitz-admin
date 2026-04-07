export class InvalidCaseImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCaseImageError';
  }
}

export class CaseImageOptimizationError extends Error {
  constructor(message = 'Failed to optimize image') {
    super(message);
    this.name = 'CaseImageOptimizationError';
  }
}

export class CaseImageUploadError extends Error {
  constructor(message = 'Failed to upload image') {
    super(message);
    this.name = 'CaseImageUploadError';
  }
}
