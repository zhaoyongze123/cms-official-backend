import type { ArticleAnalyticsRecord, ArticleRecord, SeoSummaryRecord } from "./mock-api";

async function readJson<T>(response: Response) {
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchArticles(query?: string, status?: string) {
  const searchParams = new URLSearchParams();
  if (query) {
    searchParams.set("q", query);
  }
  if (status) {
    searchParams.set("status", status);
  }

  const response = await fetch(`/api/articles?${searchParams.toString()}`, {
    method: "GET",
    cache: "no-store"
  });

  return readJson<{ items: ArticleRecord[] }>(response);
}

export async function fetchArticle(articleId: number) {
  const response = await fetch(`/api/articles/${articleId}`, {
    method: "GET",
    cache: "no-store"
  });

  return readJson<ArticleRecord>(response);
}

export async function updateArticleDraft(
  articleId: number,
  payload: Partial<ArticleRecord>
) {
  const response = await fetch(`/api/articles/${articleId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return readJson<ArticleRecord>(response);
}

export async function fetchArticleAnalytics(articleId: number) {
  const response = await fetch(`/api/articles/${articleId}/analytics`, {
    method: "GET",
    cache: "no-store"
  });

  return readJson<ArticleAnalyticsRecord>(response);
}

export async function fetchSeoSummary() {
  const response = await fetch("/api/dashboard/seo-summary", {
    method: "GET",
    cache: "no-store"
  });

  return readJson<SeoSummaryRecord>(response);
}
