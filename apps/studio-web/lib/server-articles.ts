import "server-only";

import { proxyDjangoRequest } from "./django-proxy";
import { filterStudioArticles, toStudioArticleList, toStudioArticleRecord } from "./articles";
import type { DjangoArticleRecord } from "./articles";
import type { ArticleRecord } from "./mock-api";

type DjangoErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class DjangoApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DjangoApiError";
    this.status = status;
  }
}

async function readJson<T>(response: Response) {
  if (!response.ok) {
    const responseText = await response.text();
    let errorMessage = `请求失败: ${response.status}`;
    try {
      const payload = JSON.parse(responseText) as DjangoErrorResponse;
      const message = payload.error?.message;
      const code = payload.error?.code;
      if (message) {
        errorMessage = code ? `${code}: ${message}` : message;
      }
    } catch {
      if (responseText.trim()) {
        errorMessage = `${errorMessage} ${responseText.slice(0, 200)}`;
      }
    }
    throw new DjangoApiError(errorMessage, response.status);
  }

  return JSON.parse(await response.text()) as T;
}

export async function fetchServerArticles(query?: string, status?: string) {
  const response = await proxyDjangoRequest("/api/articles/", {
    method: "GET",
  });
  const items = await readJson<DjangoArticleRecord[]>(response);
  const mappedItems = toStudioArticleList(items);
  return {
    items: filterStudioArticles(mappedItems, { query, status }),
    totals: {
      totalCount: mappedItems.length,
      draftCount: mappedItems.filter((article) => article.status === "draft").length,
      publishedCount: mappedItems.filter((article) => article.status === "published").length,
    },
  };
}

export async function fetchServerArticle(articleId: number): Promise<ArticleRecord> {
  const response = await proxyDjangoRequest(`/api/articles/${articleId}/`, {
    method: "GET",
  });
  const article = await readJson<DjangoArticleRecord>(response);
  return toStudioArticleRecord(article);
}
