import type {
  ArticleAnalyticsRecord,
  ArticleRecord,
  SeoSummaryRecord,
  TiptapSuggestionRecord,
  SeoCheckRecord,
} from "./mock-api";

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

export async function createArticle(title: string) {
  const response = await fetch("/api/articles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title })
  });

  return readJson<ArticleRecord>(response);
}

export async function triggerAiReview(articleId: number) {
  const response = await fetch(`/api/articles/${articleId}/ai-review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  return readJson<{
    article_id: number;
    run: { run_id: string };
    suggestions: TiptapSuggestionRecord[];
  }>(response);
}

export async function fetchReviewRuns(articleId: number) {
  const response = await fetch(`/api/articles/${articleId}/ai-review-runs`, {
    method: "GET",
    cache: "no-store"
  });

  return readJson<{
    article_id: number;
    runs: Array<{ run_id: string; status: string; created_at: string }>;
  }>(response);
}

export async function fetchRunSuggestions(runId: string) {
  const response = await fetch(`/api/ai-review-runs/${runId}/suggestions`, {
    method: "GET",
    cache: "no-store"
  });

  return readJson<{
    run_id: string;
    suggestions: TiptapSuggestionRecord[];
  }>(response);
}

export async function acceptSuggestion(
  suggestionId: string,
  payload: {
    content_hash: string;
    content_json?: ArticleRecord["content_json"];
    content_html?: string;
  }
) {
  const response = await fetch(`/api/ai-suggestions/${suggestionId}/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return readJson<{
    suggestion: TiptapSuggestionRecord;
    article: ArticleRecord;
  }>(response);
}

export async function rejectSuggestion(suggestionId: string) {
  const response = await fetch(`/api/ai-suggestions/${suggestionId}/reject`, {
    method: "POST"
  });

  return readJson<{
    suggestion: TiptapSuggestionRecord;
  }>(response);
}

export async function runSeoCheck(articleId: number) {
  const response = await fetch(`/api/articles/${articleId}/seo-check`, {
    method: "POST"
  });

  return readJson<SeoCheckRecord>(response);
}

export async function publishArticle(articleId: number) {
  const response = await fetch(`/api/articles/${articleId}/publish`, {
    method: "POST"
  });

  return readJson<{
    article: ArticleRecord;
    seo_check: SeoCheckRecord;
  }>(response);
}
