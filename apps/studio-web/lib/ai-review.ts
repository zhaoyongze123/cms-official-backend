type DjangoErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

import { studioBrowserPath } from "./routes";

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

export type AiPatchRecord = {
  patch_id: string;
  patch_schema_version: "v1";
  operation: "insert_after" | "delete" | "replace_text" | "alt_text";
  target_block_id: string;
  old_text?: string | null;
  new_text?: string | null;
  new_block?: unknown;
  position?: number | null;
  content_hash: string;
  reason?: string | null;
};

export type AiReviewSuggestionRecord = {
  suggestion_id: string;
  schema_version: "v1";
  run_id: string;
  article_id: number;
  type: string;
  status: "pending" | "accepted" | "rejected" | "edited" | "expired" | "failed";
  severity: "low" | "medium" | "high";
  title: string;
  reason: string;
  payload: Record<string, unknown>;
  patches: AiPatchRecord[];
  source_chunks: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
};

export type AiReviewRunRecord = {
  run_id: string;
  schema_version: "v1";
  article_id: number;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  provider: string;
  model: string;
  prompt_version: string;
  trace_id: string;
  token_usage: Record<string, unknown>;
  error: Record<string, unknown> | null;
  created_at: string | null;
  completed_at: string | null;
};

export type AiReviewResponse = {
  run: AiReviewRunRecord;
  suggestions: AiReviewSuggestionRecord[];
};

export type AiGenerateMetadataResponse = {
  trace_id: string;
  provider: string;
  model: string;
  seo_context: {
    seo_context_schema_version: "v1";
    title: string;
    description: string;
    canonical: string;
    robots: string;
    og: Record<string, unknown>;
    twitter?: Record<string, unknown>;
    json_ld: Array<Record<string, unknown>>;
    breadcrumbs?: Array<Record<string, unknown>>;
  };
};

export type AiGenerateTitleResponse = {
  trace_id: string;
  provider: string;
  model: string;
  article_id: number;
  titles: Array<{
    text: string;
    reason?: string;
  }>;
};

export type AiGenerateSlugResponse = {
  trace_id: string;
  provider: string;
  model: string;
  article_id: number;
  slugs: Array<{
    text: string;
    reason?: string;
  }>;
};

export type AiGenerateTagsResponse = {
  trace_id: string;
  provider: string;
  model: string;
  article_id: number;
  tags: Array<{
    name: string;
    reason?: string;
  }>;
};

export type AiGenerateDescriptionResponse = {
  trace_id: string;
  provider: string;
  model: string;
  article_id: number;
  descriptions: Array<{
    text: string;
    reason?: string;
  }>;
};

export type AiGenerateAltResponse = {
  trace_id: string;
  provider: string;
  model: string;
  suggestion: AiReviewSuggestionRecord;
};

export type AiReviewRunListResponse = AiReviewRunRecord[];

export type AiReviewSuggestionListResponse = AiReviewSuggestionRecord[];

export function getReviewSummaryLabel(count: number) {
  return count > 0 ? `${count} 条真实建议` : "暂无真实建议";
}

export async function submitAiReview(articleId: number, payload: Record<string, unknown> = {}) {
  const response = await fetch(studioBrowserPath(`/api/articles/${articleId}/ai-review/`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJson<AiReviewResponse>(response);
}

export async function fetchArticleAiReviewRuns(articleId: number) {
  const response = await fetch(studioBrowserPath(`/api/articles/${articleId}/ai-review-runs/`), {
    method: "GET",
    cache: "no-store",
  });

  return readJson<AiReviewRunListResponse>(response);
}

export async function fetchAiReviewRunSuggestions(runId: string) {
  const response = await fetch(studioBrowserPath(`/api/ai-review-runs/${runId}/suggestions/`), {
    method: "GET",
    cache: "no-store",
  });

  return readJson<AiReviewSuggestionListResponse>(response);
}

export async function generateMetadata(articleId: number, payload: Record<string, unknown> = {}) {
  const response = await fetch(studioBrowserPath(`/api/articles/${articleId}/ai-generate-metadata/`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJson<AiGenerateMetadataResponse>(response);
}

export async function generateTitle(articleId: number, payload: Record<string, unknown> = {}) {
  const response = await fetch(studioBrowserPath(`/api/articles/${articleId}/ai-generate-title/`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJson<AiGenerateTitleResponse>(response);
}

export async function generateSlug(articleId: number, payload: Record<string, unknown> = {}) {
  const response = await fetch(studioBrowserPath(`/api/articles/${articleId}/ai-generate-slug/`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJson<AiGenerateSlugResponse>(response);
}

export async function generateTags(articleId: number, payload: Record<string, unknown> = {}) {
  const response = await fetch(studioBrowserPath(`/api/articles/${articleId}/ai-generate-tags/`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJson<AiGenerateTagsResponse>(response);
}

export async function generateDescription(articleId: number, payload: Record<string, unknown> = {}) {
  const response = await fetch(studioBrowserPath(`/api/articles/${articleId}/ai-generate-description/`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJson<AiGenerateDescriptionResponse>(response);
}

export async function generateAlt(articleId: number, payload: Record<string, unknown> = {}) {
  const response = await fetch(studioBrowserPath(`/api/articles/${articleId}/ai-generate-alt/`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJson<AiGenerateAltResponse>(response);
}
