import type { ArticleRecord } from "./mock-api";

export type DjangoArticleCategory = {
  category_id: number;
  name: string;
  slug: string;
} | null;

export type DjangoArticleCategoryOption = {
  category_id: number;
  name: string;
  slug: string;
};

export type DjangoArticleTag = {
  tag_id: number;
  name: string;
  slug: string;
};

export type DjangoArticleImage = {
  image_id: number;
  title: string;
  alt_text: string;
  file_url: string;
};

export type DjangoArticleFaqItem = {
  question: string;
  answer: string;
  sort_order: number;
};

export type DjangoArticleRecord = {
  article_id: number;
  schema_version: "v1";
  title: string;
  summary: string;
  slug: string;
  status: ArticleRecord["status"];
  category: DjangoArticleCategory;
  tags: DjangoArticleTag[];
  content_json: ArticleRecord["content_json"];
  content_html: string;
  meta_description?: string;
  content_hash: string;
  published_at: string | null;
  updated_at: string;
  faq_items?: DjangoArticleFaqItem[];
  seo?: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    canonical_url?: string;
    robots?: string;
    og_title?: string;
    og_description?: string;
    og_image?: DjangoArticleImage | null;
    og_image_url?: string;
  };
  seo_payload?: {
    canonical_url_resolved?: string;
    faq_items?: DjangoArticleFaqItem[];
    json_ld?: {
      breadcrumb?: Record<string, unknown>;
      faq?: Record<string, unknown> | null;
    };
  };
};

export function toStudioArticleRecord(article: DjangoArticleRecord): ArticleRecord {
  return {
    article_id: article.article_id,
    schema_version: article.schema_version,
    title: article.title,
    summary: article.summary,
    slug: article.slug,
    status: article.status,
    category: article.category,
    tags: article.tags,
    content_json: article.content_json,
    content_html: article.content_html,
    meta_description: article.meta_description,
    content_hash: article.content_hash,
    published_at: article.published_at,
    updated_at: article.updated_at,
    faq_items: article.faq_items ?? [],
    seo: article.seo ?? {
      meta_title: "",
      meta_description: article.summary,
      meta_keywords: "",
      canonical_url: "",
      robots: "index,follow",
      og_title: "",
      og_description: "",
      og_image: null,
      og_image_url: "",
    },
    seo_payload: article.seo_payload ?? {},
  };
}

export function toStudioArticleList(items: DjangoArticleRecord[]) {
  return items.map((article) => toStudioArticleRecord(article));
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export function filterStudioArticles(
  items: ArticleRecord[],
  filters: {
    query?: string;
    status?: string;
  } = {},
) {
  const query = normalizeQuery(filters.query ?? "");
  const status = filters.status ?? "all";

  return items.filter((article) => {
    const matchesStatus = status === "all" ? true : article.status === status;
    const haystack = [article.title, article.slug, article.summary].join(" ").toLowerCase();
    const matchesQuery = query.length === 0 ? true : haystack.includes(query);
    return matchesStatus && matchesQuery;
  });
}
