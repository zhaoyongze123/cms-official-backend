import type { ArticleRecord } from "./mock-api";
import { toStudioArticleList, toStudioArticleRecord } from "./articles";
import type { DjangoArticleCategoryOption, DjangoArticleRecord, DjangoArticleTag } from "./articles";
import {
  fetchAiReviewRunSuggestions,
  fetchArticleAiReviewRuns,
  generateMetadata,
  submitAiReview,
  type AiGenerateMetadataResponse,
  type AiReviewResponse,
  type AiReviewRunListResponse,
  type AiReviewSuggestionListResponse,
} from "./ai-review";
import { studioProxyPath } from "./routes";

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

function getCsrfToken() {
  if (typeof document === "undefined") {
    return "";
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("csrftoken="));

  return cookie?.split("=").slice(1).join("=") ?? "";
}

function buildJsonHeaders() {
  const csrfToken = getCsrfToken();
  return {
    "Content-Type": "application/json",
    ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
  };
}

function buildSearchParams(query?: string, status?: string) {
  const searchParams = new URLSearchParams();
  if (query) {
    searchParams.set("q", query);
  }
  if (status) {
    searchParams.set("status", status);
  }
  const queryString = searchParams.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

export async function fetchArticles(query?: string, status?: string) {
  const response = await fetch(studioProxyPath(`/api/articles/${buildSearchParams(query, status)}`), {
    method: "GET",
    cache: "no-store",
  });

  const items = await readJson<DjangoArticleRecord[]>(response);
  return { items: toStudioArticleList(items) };
}

export async function fetchArticle(articleId: number) {
  const response = await fetch(studioProxyPath(`/api/articles/${articleId}/`), {
    method: "GET",
    cache: "no-store",
  });

  const article = await readJson<DjangoArticleRecord>(response);
  return toStudioArticleRecord(article);
}

export type ArticleAnalyticsResponse = {
  article: {
    article_id: number;
    title: string;
    slug: string;
    status: string;
    published_at: string | null;
  };
  latest_snapshot: {
    snapshot_id: number;
    snapshot_date: string;
    source: string;
    impressions: number;
    clicks: number;
    average_position: number;
    ctr: number;
    sessions: number;
    users: number;
    bounce_rate: number;
    avg_engagement_seconds: number;
    conversions: number;
    updated_at: string;
    web_vitals: {
      lcp_ms: number | null;
      inp_ms: number | null;
      cls_score: number | null;
      record_scope: string;
      form_factor: string;
    };
  } | null;
  snapshots: Array<{
    snapshot_id: number;
    snapshot_date: string;
    source: string;
    impressions: number;
    clicks: number;
    average_position: number;
    ctr: number;
    sessions: number;
    users: number;
    bounce_rate: number;
    avg_engagement_seconds: number;
    conversions: number;
    updated_at: string;
    web_vitals: {
      lcp_ms: number | null;
      inp_ms: number | null;
      cls_score: number | null;
      record_scope: string;
      form_factor: string;
    };
  }>;
};

export type DashboardSeoSummaryResponse = {
  totals: {
    total_articles: number;
    published_articles: number;
    draft_articles: number;
    archived_articles: number;
    articles_with_seo_metadata: number;
    articles_with_faq: number;
    articles_with_analytics: number;
  };
  performance: {
    tracked_impressions: number;
    tracked_clicks: number;
    tracked_sessions: number;
    tracked_users: number;
    tracked_conversions: number;
    average_position: number;
    average_ctr: number;
  };
  top_articles: Array<{
    article_id: number;
    title: string;
    slug: string;
    status: string;
    impressions: number;
    clicks: number;
    sessions: number;
    average_position: number;
    ctr: number;
    snapshot_date: string;
  }>;
};

export type DashboardSeoAuditResponse = {
  rows: Array<{
    article: {
      article_id: number;
      title: string;
      slug: string;
      status: string;
    };
    analytics: ArticleAnalyticsResponse;
    audit: {
      score: number;
      issues: Array<{
        severity: "严重" | "中等" | "轻微";
        code: string;
        message: string;
      }>;
      primary_issue: string;
      recommendations: string[];
    };
  }>;
  alerts: Array<{
    code: string;
    severity: "严重" | "中等" | "轻微";
    title: string;
    count: number;
    action: string;
  }>;
};

export async function fetchArticleAnalytics(articleId: number) {
  const response = await fetch(studioProxyPath(`/api/articles/${articleId}/analytics/`), {
    method: "GET",
    cache: "no-store",
  });

  return readJson<ArticleAnalyticsResponse>(response);
}

export async function fetchDashboardSeoSummary() {
  const response = await fetch(studioProxyPath("/api/dashboard/seo-summary/"), {
    method: "GET",
    cache: "no-store",
  });

  return readJson<DashboardSeoSummaryResponse>(response);
}

export async function updateArticleDraft(
  articleId: number,
  payload: Partial<ArticleRecord>
) {
  const response = await fetch(studioProxyPath(`/api/articles/${articleId}/`), {
    method: "PATCH",
    headers: buildJsonHeaders(),
    body: JSON.stringify(payload),
  });

  const article = await readJson<DjangoArticleRecord>(response);
  return toStudioArticleRecord(article);
}

export async function createArticle(
  payload: Partial<ArticleRecord>
) {
  const response = await fetch(studioProxyPath("/api/articles/"), {
    method: "POST",
    headers: buildJsonHeaders(),
    body: JSON.stringify(payload),
  });

  const article = await readJson<DjangoArticleRecord>(response);
  return toStudioArticleRecord(article);
}

type PublishArticleResponse = {
  article: DjangoArticleRecord;
  seo_check: {
    errors: Array<{ code: string; message: string }>;
    warnings: Array<{ code: string; message: string }>;
    passed: Array<{ code: string; message: string }>;
  };
};

export async function publishArticle(articleId: number) {
  const response = await fetch(studioProxyPath(`/api/articles/${articleId}/publish/`), {
    method: "POST",
    headers: buildJsonHeaders(),
  });

  const result = await readJson<PublishArticleResponse>(response);
  return {
    article: toStudioArticleRecord(result.article),
    seo_check: result.seo_check,
  };
}

export async function fetchTagSuggestions(query = "") {
  const searchParams = new URLSearchParams();
  if (query.trim()) {
    searchParams.set("q", query.trim());
  }
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const response = await fetch(studioProxyPath(`/api/tags/${suffix}`), {
    method: "GET",
    cache: "no-store",
  });

  return readJson<DjangoArticleTag[]>(response);
}

export async function fetchCategorySuggestions(query = "") {
  const searchParams = new URLSearchParams();
  if (query.trim()) {
    searchParams.set("q", query.trim());
  }
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const response = await fetch(studioProxyPath(`/api/categories/${suffix}`), {
    method: "GET",
    cache: "no-store",
  });

  return readJson<DjangoArticleCategoryOption[]>(response);
}

export type UploadedImageRecord = {
  image_id: number;
  title: string;
  alt_text: string;
  file_url: string;
  uploaded_at: string;
};

export type MediaLibraryImageRecord = UploadedImageRecord;
export type UpdateMediaLibraryImagePayload = {
  title?: string;
  alt_text?: string;
  file?: File;
};

export type MediaLibraryFileRecord = {
  file_id: number;
  title: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
};

function getDjangoPublicBaseUrl() {
  return (process.env.NEXT_PUBLIC_DJANGO_BASE_URL ?? "http://127.0.0.1:8001").replace(/\/+$/, "");
}

function normalizeUploadedFileUrl(fileUrl: string) {
  if (!fileUrl) {
    return fileUrl;
  }

  if (fileUrl.startsWith("/")) {
    return `${getDjangoPublicBaseUrl()}${fileUrl}`;
  }

  try {
    const parsedUrl = new URL(fileUrl);
    if (parsedUrl.hostname === "web" || parsedUrl.hostname === "localhost") {
      return `${getDjangoPublicBaseUrl()}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }
    return parsedUrl.toString();
  } catch {
    return fileUrl;
  }
}

export async function uploadEditorImage(file: File, altText = "", title = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("alt_text", altText);
  formData.append("title", title || file.name.replace(/\.[^.]+$/, ""));

  const csrfToken = getCsrfToken();
  const response = await fetch(studioProxyPath("/api/media/upload/"), {
    method: "POST",
    headers: {
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: formData,
  });

  const uploaded = await readJson<UploadedImageRecord>(response);
  return {
    ...uploaded,
    file_url: normalizeUploadedFileUrl(uploaded.file_url),
  };
}

export async function fetchMediaLibraryImages() {
  const response = await fetch(studioProxyPath("/api/media/images/"), {
    method: "GET",
    cache: "no-store",
  });

  const images = await readJson<MediaLibraryImageRecord[]>(response);
  return images.map((image) => ({
    ...image,
    file_url: normalizeUploadedFileUrl(image.file_url),
  }));
}

export async function updateMediaLibraryImage(
  imageId: number,
  payload: UpdateMediaLibraryImagePayload,
) {
  let body: BodyInit;
  let headers: HeadersInit;

  if (payload.file instanceof File) {
    const formData = new FormData();
    if (payload.title !== undefined) {
      formData.append("title", payload.title);
    }
    if (payload.alt_text !== undefined) {
      formData.append("alt_text", payload.alt_text);
    }
    formData.append("file", payload.file);
    const csrfToken = getCsrfToken();
    headers = csrfToken ? { "X-CSRFToken": csrfToken } : {};
    body = formData;
  } else {
    headers = buildJsonHeaders();
    body = JSON.stringify(payload);
  }

  const response = await fetch(studioProxyPath(`/api/media/images/${imageId}/`), {
    method: "PATCH",
    headers,
    body,
  });

  const image = await readJson<MediaLibraryImageRecord>(response);
  return {
    ...image,
    file_url: normalizeUploadedFileUrl(image.file_url),
  };
}

export async function fetchMediaLibraryFiles() {
  const response = await fetch(studioProxyPath("/api/media/files/"), {
    method: "GET",
    cache: "no-store",
  });

  const files = await readJson<MediaLibraryFileRecord[]>(response);
  return files.map((file) => ({
    ...file,
    file_url: normalizeUploadedFileUrl(file.file_url),
  }));
}

export async function uploadEditorFile(file: File, title = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title || file.name);

  const csrfToken = getCsrfToken();
  const response = await fetch(studioProxyPath("/api/media/files/upload/"), {
    method: "POST",
    headers: {
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: formData,
  });

  const uploaded = await readJson<MediaLibraryFileRecord>(response);
  return {
    ...uploaded,
    file_url: normalizeUploadedFileUrl(uploaded.file_url),
  };
}

export async function createArticleAiReview(
  articleId: number,
  payload: Record<string, unknown> = {}
) {
  return submitAiReview(articleId, payload);
}

export async function fetchArticleAiReviewRunList(articleId: number) {
  return fetchArticleAiReviewRuns(articleId);
}

export async function fetchAiReviewSuggestions(runId: string) {
  return fetchAiReviewRunSuggestions(runId);
}

export async function createArticleMetadataSuggestion(
  articleId: number,
  payload: Record<string, unknown> = {},
) {
  return generateMetadata(articleId, payload);
}

export type {
  AiGenerateMetadataResponse,
  AiReviewResponse,
  AiReviewRunListResponse,
  AiReviewSuggestionListResponse,
};
