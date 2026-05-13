export type ApiClientErrorCode = 'UNIMPLEMENTED' | 'INVALID_CONFIG' | 'UNKNOWN';

export interface ApiClientErrorOptions {
  code: ApiClientErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiClientError extends Error {
  readonly code: ApiClientErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(options: ApiClientErrorOptions) {
    super(options.message);
    this.name = 'ApiClientError';
    this.code = options.code;
    this.details = options.details;
  }
}

export function createApiClientError(options: ApiClientErrorOptions): ApiClientError {
  return new ApiClientError(options);
}
