export type ArticleStatus = "draft" | "published" | "archived";

import { createDocumentFromPlainText, normalizeTiptapDocument, type TiptapDocument } from "./tiptap-document";

export type ArticleRecord = {
  article_id: number;
  schema_version: "v1";
  title: string;
  summary: string;
  slug: string;
  status: ArticleStatus;
  category: {
    category_id: number;
    name: string;
    slug: string;
  } | null;
  tags: Array<{
    tag_id: number;
    name: string;
    slug: string;
  }>;
  content_json: TiptapDocument;
  content_html: string;
  content_hash?: string;
  published_at?: string | null;
  updated_at: string;
};

export type ArticleListFilters = {
  query?: string;
  status?: string;
};

export type AnalyticsMetric = {
  label: string;
  value: number;
  unit?: string;
  trend: number;
};

export type AnalyticsTimelinePoint = {
  snapshot_date: string;
  impressions: number;
  clicks: number;
  pageviews: number;
  internal_clicks: number;
  conversions: number;
  average_position: number;
  ctr: number;
  ai_acceptance_rate: number;
};

export type AnalyticsSourceSnapshot = {
  source: "gsc" | "ga4" | "internal";
  schema_version: "v1";
  snapshot_date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  average_position: number;
  pageviews: number;
  avg_time_on_page: number;
  bounce_rate: number;
  conversions: number;
  internal_clicks: number;
  ai_acceptance_rate: number;
  payload: Record<string, string | number | boolean>;
};

export type ArticleAnalyticsRecord = {
  article_id: number;
  article_title: string;
  article_slug: string;
  generated_at: string;
  overview: {
    published: boolean;
    snapshot_count: number;
    tracked_sources: string[];
    total_impressions: number;
    total_clicks: number;
    total_pageviews: number;
    total_internal_clicks: number;
    total_conversions: number;
    average_ai_acceptance_rate: number;
  };
  sources: Record<string, AnalyticsSourceSnapshot>;
  timeline: AnalyticsTimelinePoint[];
};

export type SeoSummaryRecord = {
  generated_at: string;
  totals: {
    published_articles: number;
    tracked_articles: number;
    total_impressions: number;
    total_clicks: number;
    total_pageviews: number;
    total_internal_clicks: number;
    total_conversions: number;
    average_ai_acceptance_rate: number;
  };
  top_articles: Array<{
    article_id: number;
    title: string;
    slug: string;
    pageviews: number;
    clicks: number;
    impressions: number;
    ai_acceptance_rate: number;
  }>;
  source_health: Array<{
    source: "gsc" | "ga4" | "internal";
    snapshot_count: number;
    article_count: number;
    latest_snapshot_date: string | null;
  }>;
};

const MOCK_ARTICLES: ArticleRecord[] = [
  {
    article_id: 101,
    schema_version: "v1",
    title: "AI SEO 发布系统季度路线图",
    summary: "定义运营工作台、AI 审核与发布监控的交付节奏。",
    slug: "ai-seo-quarterly-roadmap",
    status: "draft",
    category: {
      category_id: 8,
      name: "产品规划",
      slug: "product"
    },
    tags: [
      { tag_id: 1, name: "AI SEO", slug: "ai-seo" },
      { tag_id: 2, name: "Roadmap", slug: "roadmap" }
    ],
    content_json: createDocumentFromPlainText("本季度优先完成 Studio Shell、TipTap 基础编辑与 AI Diff 验收。"),
    content_html: "<p>本季度优先完成 Studio Shell、TipTap 基础编辑与 AI Diff 验收。</p>",
    content_hash: "sha256:a07-101",
    published_at: null,
    updated_at: "2026-05-09T09:20:00+08:00"
  },
  {
    article_id: 102,
    schema_version: "v1",
    title: "Django 与 Next.js 契约联调清单",
    summary: "梳理文章列表、详情、发布和审核接口的最小联调范围。",
    slug: "django-next-contract-checklist",
    status: "published",
    category: {
      category_id: 5,
      name: "工程实践",
      slug: "engineering"
    },
    tags: [
      { tag_id: 3, name: "Contracts", slug: "contracts" }
    ],
    content_json: createDocumentFromPlainText("联调阶段必须坚持 Next.js 仅调用 Django API，不直接访问 FastAPI。"),
    content_html: "<p>联调阶段必须坚持 Next.js 仅调用 Django API，不直接访问 FastAPI。</p>",
    content_hash: "sha256:a07-102",
    published_at: "2026-05-08T20:40:00+08:00",
    updated_at: "2026-05-08T20:40:00+08:00"
  },
  {
    article_id: 103,
    schema_version: "v1",
    title: "发布后监控面板字段预留说明",
    summary: "为 A11 Analytics 监控分支准备展示字段与页面位置。",
    slug: "analytics-panel-mock-fields",
    status: "archived",
    category: {
      category_id: 9,
      name: "数据分析",
      slug: "analytics"
    },
    tags: [
      { tag_id: 4, name: "Analytics", slug: "analytics" }
    ],
    content_json: createDocumentFromPlainText("监控页将消费 Django 聚合后的 SEO Summary 与单篇 AnalyticsSnapshot。"),
    content_html: "<p>监控页将消费 Django 聚合后的 SEO Summary 与单篇 AnalyticsSnapshot。</p>",
    content_hash: "sha256:a07-103",
    published_at: null,
    updated_at: "2026-05-07T16:15:00+08:00"
  }
];

const MOCK_ARTICLE_ANALYTICS: Record<number, ArticleAnalyticsRecord> = {
  101: {
    article_id: 101,
    article_title: "AI SEO 发布系统季度路线图",
    article_slug: "ai-seo-quarterly-roadmap",
    generated_at: "2026-05-09T16:00:00+08:00",
    overview: {
      published: false,
      snapshot_count: 3,
      tracked_sources: ["gsc", "ga4", "internal"],
      total_impressions: 4280,
      total_clicks: 382,
      total_pageviews: 1960,
      total_internal_clicks: 147,
      total_conversions: 24,
      average_ai_acceptance_rate: 0.61
    },
    sources: {
      gsc: {
        source: "gsc",
        schema_version: "v1",
        snapshot_date: "2026-05-09",
        impressions: 4280,
        clicks: 382,
        ctr: 0.0893,
        average_position: 8.4,
        pageviews: 0,
        avg_time_on_page: 0,
        bounce_rate: 0,
        conversions: 0,
        internal_clicks: 0,
        ai_acceptance_rate: 0.58,
        payload: { indexed: true, query_cluster: "roadmap" }
      },
      ga4: {
        source: "ga4",
        schema_version: "v1",
        snapshot_date: "2026-05-09",
        impressions: 0,
        clicks: 0,
        ctr: 0,
        average_position: 0,
        pageviews: 1960,
        avg_time_on_page: 214,
        bounce_rate: 0.33,
        conversions: 24,
        internal_clicks: 0,
        ai_acceptance_rate: 0.65,
        payload: { primary_channel: "organic" }
      },
      internal: {
        source: "internal",
        schema_version: "v1",
        snapshot_date: "2026-05-09",
        impressions: 0,
        clicks: 0,
        ctr: 0,
        average_position: 0,
        pageviews: 0,
        avg_time_on_page: 0,
        bounce_rate: 0,
        conversions: 0,
        internal_clicks: 147,
        ai_acceptance_rate: 0.61,
        payload: { faq_expands: 31, cta_clicks: 19 }
      }
    },
    timeline: [
      {
        snapshot_date: "2026-05-07",
        impressions: 3510,
        clicks: 288,
        pageviews: 1520,
        internal_clicks: 102,
        conversions: 18,
        average_position: 9.4,
        ctr: 0.0821,
        ai_acceptance_rate: 0.52
      },
      {
        snapshot_date: "2026-05-08",
        impressions: 3968,
        clicks: 344,
        pageviews: 1774,
        internal_clicks: 136,
        conversions: 22,
        average_position: 8.9,
        ctr: 0.0867,
        ai_acceptance_rate: 0.57
      },
      {
        snapshot_date: "2026-05-09",
        impressions: 4280,
        clicks: 382,
        pageviews: 1960,
        internal_clicks: 147,
        conversions: 24,
        average_position: 8.4,
        ctr: 0.0893,
        ai_acceptance_rate: 0.61
      }
    ]
  },
  102: {
    article_id: 102,
    article_title: "Django 与 Next.js 契约联调清单",
    article_slug: "django-next-contract-checklist",
    generated_at: "2026-05-09T16:00:00+08:00",
    overview: {
      published: true,
      snapshot_count: 3,
      tracked_sources: ["gsc", "ga4", "internal"],
      total_impressions: 6120,
      total_clicks: 519,
      total_pageviews: 2488,
      total_internal_clicks: 188,
      total_conversions: 36,
      average_ai_acceptance_rate: 0.74
    },
    sources: {
      gsc: {
        source: "gsc",
        schema_version: "v1",
        snapshot_date: "2026-05-09",
        impressions: 6120,
        clicks: 519,
        ctr: 0.0848,
        average_position: 6.7,
        pageviews: 0,
        avg_time_on_page: 0,
        bounce_rate: 0,
        conversions: 0,
        internal_clicks: 0,
        ai_acceptance_rate: 0.72,
        payload: { indexed: true, query_cluster: "contract" }
      },
      ga4: {
        source: "ga4",
        schema_version: "v1",
        snapshot_date: "2026-05-09",
        impressions: 0,
        clicks: 0,
        ctr: 0,
        average_position: 0,
        pageviews: 2488,
        avg_time_on_page: 268,
        bounce_rate: 0.27,
        conversions: 36,
        internal_clicks: 0,
        ai_acceptance_rate: 0.78,
        payload: { primary_channel: "organic" }
      },
      internal: {
        source: "internal",
        schema_version: "v1",
        snapshot_date: "2026-05-09",
        impressions: 0,
        clicks: 0,
        ctr: 0,
        average_position: 0,
        pageviews: 0,
        avg_time_on_page: 0,
        bounce_rate: 0,
        conversions: 0,
        internal_clicks: 188,
        ai_acceptance_rate: 0.74,
        payload: { faq_expands: 44, cta_clicks: 27 }
      }
    },
    timeline: [
      {
        snapshot_date: "2026-05-07",
        impressions: 5488,
        clicks: 430,
        pageviews: 2014,
        internal_clicks: 145,
        conversions: 28,
        average_position: 7.5,
        ctr: 0.0784,
        ai_acceptance_rate: 0.67
      },
      {
        snapshot_date: "2026-05-08",
        impressions: 5824,
        clicks: 486,
        pageviews: 2320,
        internal_clicks: 171,
        conversions: 33,
        average_position: 7.1,
        ctr: 0.0834,
        ai_acceptance_rate: 0.71
      },
      {
        snapshot_date: "2026-05-09",
        impressions: 6120,
        clicks: 519,
        pageviews: 2488,
        internal_clicks: 188,
        conversions: 36,
        average_position: 6.7,
        ctr: 0.0848,
        ai_acceptance_rate: 0.74
      }
    ]
  }
};

const MOCK_SEO_SUMMARY: SeoSummaryRecord = {
  generated_at: "2026-05-09T16:00:00+08:00",
  totals: {
    published_articles: 1,
    tracked_articles: 2,
    total_impressions: 10400,
    total_clicks: 901,
    total_pageviews: 4448,
    total_internal_clicks: 335,
    total_conversions: 60,
    average_ai_acceptance_rate: 0.675
  },
  top_articles: [
    {
      article_id: 102,
      title: "Django 与 Next.js 契约联调清单",
      slug: "django-next-contract-checklist",
      pageviews: 2488,
      clicks: 519,
      impressions: 6120,
      ai_acceptance_rate: 0.74
    },
    {
      article_id: 101,
      title: "AI SEO 发布系统季度路线图",
      slug: "ai-seo-quarterly-roadmap",
      pageviews: 1960,
      clicks: 382,
      impressions: 4280,
      ai_acceptance_rate: 0.61
    }
  ],
  source_health: [
    {
      source: "gsc",
      snapshot_count: 2,
      article_count: 2,
      latest_snapshot_date: "2026-05-09"
    },
    {
      source: "ga4",
      snapshot_count: 2,
      article_count: 2,
      latest_snapshot_date: "2026-05-09"
    },
    {
      source: "internal",
      snapshot_count: 2,
      article_count: 2,
      latest_snapshot_date: "2026-05-09"
    }
  ]
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export function listMockArticles(filters: ArticleListFilters = {}) {
  const query = normalizeQuery(filters.query ?? "");
  const status = filters.status ?? "all";

  return MOCK_ARTICLES.filter((article) => {
    const matchesStatus = status === "all" ? true : article.status === status;
    const haystack = [article.title, article.slug, article.summary].join(" ").toLowerCase();
    const matchesQuery = query.length === 0 ? true : haystack.includes(query);
    return matchesStatus && matchesQuery;
  });
}

export function getMockArticleById(articleId: number) {
  return MOCK_ARTICLES.find((article) => article.article_id === articleId) ?? null;
}

export function buildDraftStorageKey(articleId: string | number) {
  return `studio.article.${articleId}`;
}

export function createMockArticle(title: string) {
  const now = new Date().toISOString();
  const safeSlug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `mock-article-${Date.now()}`;

  return {
    article_id: 9000 + MOCK_ARTICLES.length + 1,
    schema_version: "v1" as const,
    title,
    summary: "新的 Mock 文章，用于验证 Studio 新建和编辑流程。",
    slug: safeSlug,
    status: "draft" as const,
    category: null,
    tags: [],
    content_json: createDocumentFromPlainText("请在编辑页继续完善这篇文章。"),
    content_html: "<p>请在编辑页继续完善这篇文章。</p>",
    content_hash: `sha256:new-${Date.now()}`,
    published_at: null,
    updated_at: now
  };
}

export function updateMockArticlePayload(
  article: ArticleRecord,
  payload: Partial<ArticleRecord>
) {
  const nextContentJson = payload.content_json
    ? normalizeTiptapDocument(payload.content_json)
    : article.content_json;

  return {
    ...article,
    ...payload,
    content_json: nextContentJson,
    content_hash: `sha256:mock-${Date.now()}`,
    updated_at: new Date().toISOString()
  };
}

export function getMockArticleAnalytics(articleId: number) {
  return MOCK_ARTICLE_ANALYTICS[articleId] ?? null;
}

export function getMockSeoSummary() {
  return MOCK_SEO_SUMMARY;
}

export function buildAnalyticsMetrics(summary: SeoSummaryRecord): AnalyticsMetric[] {
  return [
    {
      label: "总展示",
      value: summary.totals.total_impressions,
      trend: 8.4
    },
    {
      label: "总点击",
      value: summary.totals.total_clicks,
      trend: 6.1
    },
    {
      label: "总浏览量",
      value: summary.totals.total_pageviews,
      trend: 9.7
    },
    {
      label: "AI 采纳率",
      value: Math.round(summary.totals.average_ai_acceptance_rate * 100),
      unit: "%",
      trend: 4.2
    }
  ];
}
