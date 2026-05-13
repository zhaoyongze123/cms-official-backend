import { createApiClientError } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface HttpRequestOptions {
  method: HttpMethod;
  path: string;
  body?: JsonValue;
  headers?: Record<string, string>;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export function createHttpRequestStub(): Promise<never> {
  return Promise.reject(
    createApiClientError({
      code: 'UNIMPLEMENTED',
      message: 'HTTP 请求实现尚未接入。'
    })
  );
}

export function createHttpClientStub() {
  return {
    request: createHttpRequestStub,
  };
}
