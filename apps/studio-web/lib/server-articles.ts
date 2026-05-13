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
