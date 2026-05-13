import { createApiClientError } from './errors';
import type { HttpRequestOptions, HttpResponse } from './http';
import { createHttpClientStub } from './http';

export interface CmsApiClientConfig {
  baseUrl: string;
  token?: string;
}

export interface CmsRequestContext {
  traceId?: string;
}

export interface CmsArticleSummary {
  id: number;
  title: string;
  slug: string;
}

export interface CmsApiClient {
  listArticles(context?: CmsRequestContext): Promise<HttpResponse<CmsArticleSummary[]>>;
  getArticle(id: number, context?: CmsRequestContext): Promise<HttpResponse<unknown>>;
  request(options: HttpRequestOptions): Promise<never>;
}

export function createCmsApiClient(config: CmsApiClientConfig): CmsApiClient {
  if (!config.baseUrl) {
    throw createApiClientError({
      code: 'INVALID_CONFIG',
      message: 'baseUrl 不能为空。'
    });
  }

  const http = createHttpClientStub();

  return {
    listArticles() {
      return http.request({
        method: 'GET',
        path: '/api/articles/',
      });
    },
    getArticle(id: number) {
      return http.request({
        method: 'GET',
        path: `/api/articles/${id}/`,
      });
    },
    request(options: HttpRequestOptions) {
      return http.request(options);
    },
  };
}

export function createCmsApiClientStub(): CmsApiClient {
  return createCmsApiClient({
    baseUrl: 'http://localhost',
  });
}
