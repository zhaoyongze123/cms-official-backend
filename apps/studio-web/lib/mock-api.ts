export type ArticleStatus = "draft" | "published" | "archived";

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
  cover_image?: {
    image_id: number;
    title: string;
    alt_text: string;
    file_url: string;
  } | null;
  tags: Array<{
    tag_id: number;
    name: string;
    slug: string;
  }>;
  content_json: {
    type: string;
    content: Array<{
      type: string;
      content?: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
  content_html: string;
  meta_description?: string;
  content_hash?: string;
  published_at?: string | null;
  updated_at: string;
  faq_items?: Array<{
    question: string;
    answer: string;
    sort_order: number;
  }>;
  seo?: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    canonical_url?: string;
    robots?: string;
    og_title?: string;
    og_description?: string;
    og_image?: {
      image_id: number;
      title: string;
      alt_text: string;
      file_url: string;
    } | null;
    og_image_url?: string;
  };
  seo_payload?: {
    canonical_url_resolved?: string;
    breadcrumbs?: Array<{
      "@type": string;
      position: number;
      name: string;
      item: string;
    }>;
    faq_items?: Array<{
      question: string;
      answer: string;
      sort_order: number;
    }>;
    json_ld?: {
      breadcrumb?: Record<string, unknown>;
      faq?: Record<string, unknown> | null;
    };
  };
};

export type ArticleListFilters = {
  query?: string;
  status?: string;
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
    content_json: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "本季度优先完成 Studio Shell、TipTap 基础编辑与 AI Diff 验收。"}]
        }
      ]
    },
    content_html: "<p>本季度优先完成 Studio Shell、TipTap 基础编辑与 AI Diff 验收。</p>",
    content_hash: "sha256:a07-101",
    published_at: null,
    updated_at: "2026-05-09T09:20:00+08:00",
    faq_items: [],
    seo: {
      meta_title: "",
      meta_description: "定义运营工作台、AI 审核与发布监控的交付节奏。",
      meta_keywords: "",
      canonical_url: "",
      robots: "index,follow",
      og_title: "",
      og_description: "",
      og_image: null,
      og_image_url: "",
    },
    seo_payload: {},
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
    content_json: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "联调阶段必须坚持 Next.js 仅调用 Django API，不直接访问 FastAPI。"}]
        }
      ]
    },
    content_html: "<p>联调阶段必须坚持 Next.js 仅调用 Django API，不直接访问 FastAPI。</p>",
    content_hash: "sha256:a07-102",
    published_at: "2026-05-08T20:40:00+08:00",
    updated_at: "2026-05-08T20:40:00+08:00",
    faq_items: [],
    seo: {
      meta_title: "Django 与 Next.js 契约联调清单",
      meta_description: "梳理文章列表、详情、发布和审核接口的最小联调范围。",
      meta_keywords: "django,nextjs,contracts",
      canonical_url: "",
      robots: "index,follow",
      og_title: "Django 与 Next.js 契约联调清单",
      og_description: "梳理文章列表、详情、发布和审核接口的最小联调范围。",
      og_image: null,
      og_image_url: "",
    },
    seo_payload: {},
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
    content_json: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "监控页将消费 Django 聚合后的 SEO Summary 与单篇 AnalyticsSnapshot。"}]
        }
      ]
    },
    content_html: "<p>监控页将消费 Django 聚合后的 SEO Summary 与单篇 AnalyticsSnapshot。</p>",
    content_hash: "sha256:a07-103",
    published_at: null,
    updated_at: "2026-05-07T16:15:00+08:00",
    faq_items: [],
    seo: {
      meta_title: "",
      meta_description: "为 A11 Analytics 监控分支准备展示字段与页面位置。",
      meta_keywords: "",
      canonical_url: "",
      robots: "index,follow",
      og_title: "",
      og_description: "",
      og_image: null,
      og_image_url: "",
    },
    seo_payload: {},
  }
];

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
    cover_image: null,
    tags: [],
    content_json: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "请在编辑页继续完善这篇文章。" }]
        }
      ]
    },
    content_html: "<p>请在编辑页继续完善这篇文章。</p>",
    content_hash: `sha256:new-${Date.now()}`,
    published_at: null,
    updated_at: now,
    faq_items: [],
    seo: {
      meta_title: "",
      meta_description: "新的 Mock 文章，用于验证 Studio 新建和编辑流程。",
      meta_keywords: "",
      canonical_url: "",
      robots: "index,follow",
      og_title: "",
      og_description: "",
      og_image: null,
      og_image_url: "",
    },
    seo_payload: {},
  };
}

export function updateMockArticlePayload(
  article: ArticleRecord,
  payload: Partial<ArticleRecord>
) {
  return {
    ...article,
    ...payload,
    updated_at: new Date().toISOString()
  };
}
