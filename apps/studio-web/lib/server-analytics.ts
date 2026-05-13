import "server-only";

import { proxyDjangoRequest } from "./django-proxy";
import type { ArticleAnalyticsResponse, DashboardSeoAuditResponse, DashboardSeoSummaryResponse } from "./api-client";

type DjangoErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

async function readJson<T>(response: Response) {
  if (!response.ok) {
    let errorMessage = `请求失败: ${response.status}`;
    try {
      const payload = (await response.json()) as DjangoErrorResponse;
      const message = payload.error?.message;
      const code = payload.error?.code;
      if (message) {
        errorMessage = code ? `${code}: ${message}` : message;
      }
    } catch {
      // 保留默认错误文案
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export async function fetchServerDashboardSeoSummary() {
  const response = await proxyDjangoRequest("/api/dashboard/seo-summary/", {
    method: "GET",
  });
  return readJson<DashboardSeoSummaryResponse>(response);
}

export async function fetchServerArticleAnalytics(articleId: number) {
  const response = await proxyDjangoRequest(`/api/articles/${articleId}/analytics/`, {
    method: "GET",
  });
  return readJson<ArticleAnalyticsResponse>(response);
}

export async function fetchServerDashboardSeoAudit() {
  const response = await proxyDjangoRequest("/api/dashboard/seo-audit/", {
    method: "GET",
  });
  return readJson<DashboardSeoAuditResponse>(response);
}
