export type ArticleStatus = "draft" | "published" | "archived";

import {
  createDocumentFromPlainText,
  extractPlainText,
  normalizeTiptapDocument,
  type TiptapBlockNode,
  type TiptapDocument,
  type TiptapTextNode,
} from "./tiptap-document";

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

export type TiptapPatchRecord = {
  patch_id: string;
  patch_schema_version: "v1";
  operation: "insert_after" | "delete" | "replace_text" | "alt_text";
  target_block_id: string;
  old_text?: string | null;
  new_text?: string | null;
  new_block?: Record<string, unknown> | null;
  position?: number | null;
  content_hash: string;
  reason?: string | null;
};

export type TiptapSuggestionRecord = {
  suggestion_id: string;
  schema_version: "v1";
  article_id: number;
  type:
    | "metadata"
    | "faq"
    | "internal_link"
    | "semantic_keyword"
    | "body_insert"
    | "body_delete"
    | "body_replace"
    | "alt_text";
  status: "pending" | "accepted" | "rejected" | "edited" | "expired" | "failed";
  severity: "low" | "medium" | "high";
  title: string;
  reason: string;
  payload?: Record<string, unknown>;
  patches: TiptapPatchRecord[];
  source_chunks: Array<{
    chunk_id: string;
    source_type: string;
    source_id: number;
    title: string;
    url: string;
    score: number;
  }>;
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
  token_usage: Record<string, number>;
  error: null;
  created_at: string;
  completed_at: string | null;
};

export type SeoCheckRecord = {
  article_id: number;
  checks: Array<{
    level: "error" | "warning" | "passed";
    code: string;
    message: string;
  }>;
  summary: {
    errors: number;
    warnings: number;
    passed: number;
    can_publish: boolean;
  };
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

type MockStore = {
  articles: ArticleRecord[];
  reviewRuns: Map<string, AiReviewRunRecord>;
  runSuggestions: Map<string, TiptapSuggestionRecord[]>;
  suggestionsById: Map<string, TiptapSuggestionRecord>;
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

const firstArticleDocument = normalizeTiptapDocument({
  tiptap_schema_version: "v1",
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { blockId: "blk_roadmap_title", level: 2 },
      content: [{ type: "text", text: "本季度前端主线" }],
    },
    {
      type: "paragraph",
      attrs: { blockId: "blk_roadmap_intro" },
      content: [{ type: "text", text: "本季度优先完成 Studio Shell、TipTap 基础编辑与 AI Diff 验收。" }],
    },
    {
      type: "paragraph",
      attrs: { blockId: "blk_roadmap_seo" },
      content: [{ type: "text", text: "SEO很重要，发布前需要检查标题、描述、正文和内链。" }],
    },
  ],
});

const secondArticleDocument = normalizeTiptapDocument({
  tiptap_schema_version: "v1",
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { blockId: "blk_contract_intro" },
      content: [{ type: "text", text: "联调阶段必须坚持 Next.js 仅调用 Django API，不直接访问 FastAPI。" }],
    },
    {
      type: "paragraph",
      attrs: { blockId: "blk_contract_api" },
      content: [{ type: "text", text: "当前前端仍使用本地 Mock API 支撑演示，后端公开业务接口落地后再替换。" }],
    },
  ],
});

const initialArticles: ArticleRecord[] = [
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
      slug: "product",
    },
    tags: [
      { tag_id: 1, name: "AI SEO", slug: "ai-seo" },
      { tag_id: 2, name: "Roadmap", slug: "roadmap" },
    ],
    content_json: firstArticleDocument,
    content_html: "<h2>本季度前端主线</h2><p>本季度优先完成 Studio Shell、TipTap 基础编辑与 AI Diff 验收。</p><p>SEO很重要，发布前需要检查标题、描述、正文和内链。</p>",
    content_hash: "sha256:a07-101",
    published_at: null,
    updated_at: "2026-05-09T09:20:00+08:00",
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
      slug: "engineering",
    },
    tags: [{ tag_id: 3, name: "Contracts", slug: "contracts" }],
    content_json: secondArticleDocument,
    content_html: "<p>联调阶段必须坚持 Next.js 仅调用 Django API，不直接访问 FastAPI。</p><p>当前前端仍使用本地 Mock API 支撑演示，后端公开业务接口落地后再替换。</p>",
    content_hash: "sha256:a07-102",
    published_at: "2026-05-08T20:40:00+08:00",
    updated_at: "2026-05-08T20:40:00+08:00",
  },
  {
    article_id: 103,
    schema_version: "v1",
    title: "发布后监控面板字段预留说明",
    summary: "为 Analytics 监控准备展示字段与页面位置。",
    slug: "analytics-panel-mock-fields",
    status: "archived",
    category: {
      category_id: 9,
      name: "数据分析",
      slug: "analytics",
    },
    tags: [{ tag_id: 4, name: "Analytics", slug: "analytics" }],
    content_json: createDocumentFromPlainText("监控页将消费 Django 聚合后的 SEO Summary 与单篇 AnalyticsSnapshot。"),
    content_html: "<p>监控页将消费 Django 聚合后的 SEO Summary 与单篇 AnalyticsSnapshot。</p>",
    content_hash: "sha256:a07-103",
    published_at: null,
    updated_at: "2026-05-07T16:15:00+08:00",
  },
];

function getMockStore() {
  const globalStore = globalThis as typeof globalThis & {
    __cmsStudioMockStore?: MockStore;
  };

  if (!globalStore.__cmsStudioMockStore) {
    globalStore.__cmsStudioMockStore = {
      articles: structuredClone(initialArticles),
      reviewRuns: new Map<string, AiReviewRunRecord>(),
      runSuggestions: new Map<string, TiptapSuggestionRecord[]>(),
      suggestionsById: new Map<string, TiptapSuggestionRecord>(),
    };
  }

  return globalStore.__cmsStudioMockStore;
}

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
      average_ai_acceptance_rate: 0.61,
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
        payload: { indexed: true, query_cluster: "roadmap" },
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
        payload: { primary_channel: "organic" },
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
        payload: { faq_expands: 31, cta_clicks: 19 },
      },
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
        ai_acceptance_rate: 0.52,
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
        ai_acceptance_rate: 0.57,
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
        ai_acceptance_rate: 0.61,
      },
    ],
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
      average_ai_acceptance_rate: 0.74,
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
        payload: { indexed: true, query_cluster: "contract" },
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
        payload: { primary_channel: "organic" },
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
        payload: { faq_expands: 44, cta_clicks: 27 },
      },
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
        ai_acceptance_rate: 0.67,
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
        ai_acceptance_rate: 0.71,
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
        ai_acceptance_rate: 0.74,
      },
    ],
  },
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function cloneArticle(article: ArticleRecord): ArticleRecord {
  return structuredClone(article);
}

function buildContentHash(articleId: number) {
  return `sha256:mock-${articleId}-${Date.now()}`;
}

function createRunId(articleId: number) {
  return `run_${articleId}_${Date.now()}`;
}

function createSuggestionId(articleId: number, index: number) {
  return `sug_${articleId}_${Date.now()}_${index}`;
}

function findArticleIndex(articleId: number) {
  return getMockStore().articles.findIndex((article) => article.article_id === articleId);
}

function buildSeoSummary(): SeoSummaryRecord {
  const publishedArticles = getMockStore().articles.filter((article) => article.status === "published").length;
  const analytics = Object.values(MOCK_ARTICLE_ANALYTICS);
  const totals = analytics.reduce(
    (accumulator, item) => ({
      total_impressions: accumulator.total_impressions + item.overview.total_impressions,
      total_clicks: accumulator.total_clicks + item.overview.total_clicks,
      total_pageviews: accumulator.total_pageviews + item.overview.total_pageviews,
      total_internal_clicks: accumulator.total_internal_clicks + item.overview.total_internal_clicks,
      total_conversions: accumulator.total_conversions + item.overview.total_conversions,
      ai_acceptance_rate: accumulator.ai_acceptance_rate + item.overview.average_ai_acceptance_rate,
    }),
    {
      total_impressions: 0,
      total_clicks: 0,
      total_pageviews: 0,
      total_internal_clicks: 0,
      total_conversions: 0,
      ai_acceptance_rate: 0,
    }
  );

  return {
    generated_at: "2026-05-09T16:00:00+08:00",
    totals: {
      published_articles: publishedArticles,
      tracked_articles: analytics.length,
      total_impressions: totals.total_impressions,
      total_clicks: totals.total_clicks,
      total_pageviews: totals.total_pageviews,
      total_internal_clicks: totals.total_internal_clicks,
      total_conversions: totals.total_conversions,
      average_ai_acceptance_rate: analytics.length > 0 ? totals.ai_acceptance_rate / analytics.length : 0,
    },
    top_articles: analytics
      .map((item) => ({
        article_id: item.article_id,
        title: item.article_title,
        slug: item.article_slug,
        pageviews: item.overview.total_pageviews,
        clicks: item.overview.total_clicks,
        impressions: item.overview.total_impressions,
        ai_acceptance_rate: item.overview.average_ai_acceptance_rate,
      }))
      .sort((left, right) => right.pageviews - left.pageviews),
    source_health: ["gsc", "ga4", "internal"].map((source) => ({
      source: source as "gsc" | "ga4" | "internal",
      snapshot_count: analytics.length,
      article_count: analytics.length,
      latest_snapshot_date: "2026-05-09",
    })),
  };
}

function isTextNode(node: TiptapBlockNode | TiptapTextNode): node is TiptapTextNode {
  return node.type === "text";
}

function getNodeText(node: TiptapBlockNode | TiptapTextNode): string {
  if (isTextNode(node)) {
    return node.text;
  }

  return (node.content ?? []).map((child) => getNodeText(child)).join("");
}

function replaceTextInNode(
  node: TiptapBlockNode | TiptapTextNode,
  oldText: string,
  newText: string
): TiptapBlockNode | TiptapTextNode {
  if (isTextNode(node)) {
    return {
      ...node,
      text: node.text.replace(oldText, newText),
    };
  }

  return {
    ...node,
    content: node.content?.map((child) => replaceTextInNode(child, oldText, newText)),
  };
}

function createBlockFromPatch(patch: TiptapPatchRecord): TiptapBlockNode {
  const newBlock = patch.new_block;
  if (newBlock) {
    return normalizeTiptapDocument({ type: "doc", content: [newBlock] }).content[0];
  }

  return normalizeTiptapDocument(createDocumentFromPlainText(patch.new_text ?? "")).content[0];
}

function applyPatchToDocument(document: TiptapDocument, patch: TiptapPatchRecord) {
  const source = normalizeTiptapDocument(document);
  const content: TiptapBlockNode[] = [];

  for (const block of source.content) {
    const blockId = block.attrs?.blockId;
    if (blockId !== patch.target_block_id) {
      content.push(block);
      continue;
    }

    if (patch.operation === "delete") {
      continue;
    }

    if (patch.operation === "replace_text" && patch.old_text && patch.new_text) {
      content.push(replaceTextInNode(block, patch.old_text, patch.new_text) as TiptapBlockNode);
      continue;
    }

    content.push(block);
    if (patch.operation === "insert_after") {
      content.push(createBlockFromPatch(patch));
    }
  }

  return normalizeTiptapDocument({ type: "doc", content });
}

function buildMockSuggestions(article: ArticleRecord): TiptapSuggestionRecord[] {
  const blocks = article.content_json.content;
  const firstParagraph = blocks.find((block) => block.type === "paragraph") ?? blocks[0];
  const targetBlockId = firstParagraph.attrs?.blockId ?? "blk_missing";
  const targetText = getNodeText(firstParagraph);
  const replaceOldText = targetText.includes("SEO很重要") ? "SEO很重要" : targetText.slice(0, Math.min(targetText.length, 16));
  const replaceNewText = targetText.includes("SEO很重要")
    ? "SEO 是提升搜索曝光、点击率和转化的重要基础能力"
    : `${replaceOldText}，并需要在发布前完成 SEO 检查`;

  return [
    {
      suggestion_id: createSuggestionId(article.article_id, 1),
      schema_version: "v1",
      article_id: article.article_id,
      type: "body_replace",
      status: "pending",
      severity: "high",
      title: "强化正文表达",
      reason: "原段落对 SEO 价值描述过短，建议改为更具体的运营收益表达。",
      patches: [
        {
          patch_id: `patch_${article.article_id}_replace`,
          patch_schema_version: "v1",
          operation: "replace_text",
          target_block_id: targetBlockId,
          old_text: replaceOldText,
          new_text: replaceNewText,
          content_hash: article.content_hash ?? "",
          reason: "正文替换建议必须携带 blockId 与 content_hash，接受前用于冲突检测。",
        },
      ],
      source_chunks: [
        {
          chunk_id: "chk_contract_001",
          source_type: "article",
          source_id: 102,
          title: "Django 与 Next.js 契约联调清单",
          url: "/django-next-contract-checklist/",
          score: 0.86,
        },
      ],
    },
    {
      suggestion_id: createSuggestionId(article.article_id, 2),
      schema_version: "v1",
      article_id: article.article_id,
      type: "body_insert",
      status: "pending",
      severity: "medium",
      title: "补充发布前检查段落",
      reason: "当前正文缺少发布前检查如何阻断 Error、提示 Warning 的说明。",
      patches: [
        {
          patch_id: `patch_${article.article_id}_insert`,
          patch_schema_version: "v1",
          operation: "insert_after",
          target_block_id: targetBlockId,
          new_text: "发布前检查会把标题、Slug、正文、Schema 等严重问题标记为 Error，并阻止发布；Warning 只提示运营继续优化。",
          new_block: {
            type: "paragraph",
            attrs: { blockId: `blk_ai_insert_${article.article_id}` },
            content: [
              {
                type: "text",
                text: "发布前检查会把标题、Slug、正文、Schema 等严重问题标记为 Error，并阻止发布；Warning 只提示运营继续优化。",
              },
            ],
          },
          content_hash: article.content_hash ?? "",
          reason: "新增内容用于解释发布前检查边界。",
        },
      ],
      source_chunks: [
        {
          chunk_id: "chk_publish_001",
          source_type: "article",
          source_id: 101,
          title: "AI SEO 发布系统季度路线图",
          url: "/ai-seo-quarterly-roadmap/",
          score: 0.81,
        },
      ],
    },
    {
      suggestion_id: createSuggestionId(article.article_id, 3),
      schema_version: "v1",
      article_id: article.article_id,
      type: "metadata",
      status: "pending",
      severity: "low",
      title: "补齐 Meta Description 建议",
      reason: "摘要可以更明确覆盖 AI 审核、发布检查和监控闭环。",
      payload: {
        meta_title: `${article.title}｜AI SEO Studio`,
        meta_description: "围绕内容编辑、AI 建议审核、发布前 SEO 检查和发布后监控构建运营闭环。",
      },
      patches: [],
      source_chunks: [],
    },
  ];
}

export function listMockArticles(filters: ArticleListFilters = {}) {
  const { articles } = getMockStore();
  const query = normalizeQuery(filters.query ?? "");
  const status = filters.status ?? "all";

  return articles
    .filter((article) => {
      const matchesStatus = status === "all" ? true : article.status === status;
      const haystack = [article.title, article.slug, article.summary].join(" ").toLowerCase();
      const matchesQuery = query.length === 0 ? true : haystack.includes(query);
      return matchesStatus && matchesQuery;
    })
    .map(cloneArticle);
}

export function getMockArticleById(articleId: number) {
  const { articles } = getMockStore();
  const article = articles.find((item) => item.article_id === articleId) ?? null;
  return article ? cloneArticle(article) : null;
}

export function buildDraftStorageKey(articleId: string | number) {
  return `studio.article.${articleId}`;
}

export function createMockArticle(title: string) {
  const { articles } = getMockStore();
  const now = new Date().toISOString();
  const safeSlug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `mock-article-${Date.now()}`;
  const nextArticleId = Math.max(...articles.map((article) => article.article_id)) + 1;
  const article: ArticleRecord = {
    article_id: nextArticleId,
    schema_version: "v1",
    title,
    summary: "新的 Mock 文章，用于验证 Studio 新建和编辑流程。",
    slug: safeSlug,
    status: "draft",
    category: null,
    tags: [],
    content_json: createDocumentFromPlainText("请在编辑页继续完善这篇文章。"),
    content_html: "<p>请在编辑页继续完善这篇文章。</p>",
    content_hash: buildContentHash(nextArticleId),
    published_at: null,
    updated_at: now,
  };

  articles.unshift(article);
  return cloneArticle(article);
}

export function updateMockArticlePayload(article: ArticleRecord, payload: Partial<ArticleRecord>) {
  const nextContentJson = payload.content_json ? normalizeTiptapDocument(payload.content_json) : article.content_json;

  return {
    ...article,
    ...payload,
    content_json: nextContentJson,
    content_hash: buildContentHash(article.article_id),
    updated_at: new Date().toISOString(),
  };
}

export function updateMockArticle(articleId: number, payload: Partial<ArticleRecord>) {
  const { articles } = getMockStore();
  const index = findArticleIndex(articleId);
  if (index === -1) {
    return null;
  }

  const updated = updateMockArticlePayload(articles[index], payload);
  articles[index] = updated;
  return cloneArticle(updated);
}

export function triggerMockAiReview(articleId: number) {
  const { articles, reviewRuns, runSuggestions, suggestionsById } = getMockStore();
  const article = articles.find((item) => item.article_id === articleId);
  if (!article) {
    return null;
  }

  const now = new Date().toISOString();
  const run: AiReviewRunRecord = {
    run_id: createRunId(articleId),
    schema_version: "v1",
    article_id: articleId,
    status: "completed",
    provider: "mock",
    model: "mock-ai-review-v1",
    prompt_version: "v1",
    trace_id: `trace_${articleId}_${Date.now()}`,
    token_usage: { prompt_tokens: 1240, completion_tokens: 680, total_tokens: 1920 },
    error: null,
    created_at: now,
    completed_at: now,
  };
  const suggestions = buildMockSuggestions(article);

  reviewRuns.set(run.run_id, run);
  runSuggestions.set(run.run_id, suggestions);
  for (const suggestion of suggestions) {
    suggestionsById.set(suggestion.suggestion_id, suggestion);
  }

  return {
    article_id: articleId,
    run,
    suggestions: structuredClone(suggestions),
  };
}

export function listMockReviewRuns(articleId: number) {
  const { reviewRuns } = getMockStore();
  return Array.from(reviewRuns.values())
    .filter((run) => run.article_id === articleId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function getMockRunSuggestions(runId: string) {
  const { runSuggestions } = getMockStore();
  return structuredClone(runSuggestions.get(runId) ?? []);
}

export function acceptMockSuggestion(
  suggestionId: string,
  payload: {
    content_hash: string;
    content_json?: TiptapDocument;
    content_html?: string;
    edited?: boolean;
  }
) {
  const { articles, suggestionsById } = getMockStore();
  const suggestion = suggestionsById.get(suggestionId);
  if (!suggestion) {
    return null;
  }

  const index = findArticleIndex(suggestion.article_id);
  if (index === -1) {
    return null;
  }

  const article = articles[index];
  if (suggestion.status !== "pending") {
    return { article: cloneArticle(article), suggestion: structuredClone(suggestion) };
  }

  const hasConflict = payload.content_hash && article.content_hash && payload.content_hash !== article.content_hash;
  if (hasConflict) {
    suggestion.status = "expired";
    suggestionsById.set(suggestionId, suggestion);
    return { article: cloneArticle(article), suggestion: structuredClone(suggestion) };
  }

  let nextContentJson = payload.content_json ? normalizeTiptapDocument(payload.content_json) : article.content_json;
  if (!payload.edited && !payload.content_json) {
    for (const patch of suggestion.patches) {
      nextContentJson = applyPatchToDocument(nextContentJson, patch);
    }
  }

  const nextArticle = updateMockArticlePayload(article, {
    content_json: nextContentJson,
    content_html: payload.content_html ?? article.content_html,
  });
  articles[index] = nextArticle;
  suggestion.status = payload.edited ? "edited" : "accepted";
  suggestionsById.set(suggestionId, suggestion);

  return { article: cloneArticle(nextArticle), suggestion: structuredClone(suggestion) };
}

export function rejectMockSuggestion(suggestionId: string) {
  const { suggestionsById } = getMockStore();
  const suggestion = suggestionsById.get(suggestionId);
  if (!suggestion) {
    return null;
  }

  if (suggestion.status === "pending") {
    suggestion.status = "rejected";
    suggestionsById.set(suggestionId, suggestion);
  }

  return structuredClone(suggestion);
}

export function runMockSeoCheck(articleId: number): SeoCheckRecord | null {
  const { articles, suggestionsById } = getMockStore();
  const article = articles.find((item) => item.article_id === articleId);
  if (!article) {
    return null;
  }

  const plainText = extractPlainText(article.content_json);
  const pendingSuggestions = Array.from(suggestionsById.values()).filter(
    (suggestion) => suggestion.article_id === articleId && suggestion.status === "pending"
  );
  const checks: SeoCheckRecord["checks"] = [
    article.title.trim()
      ? { level: "passed", code: "title_exists", message: "标题已填写。" }
      : { level: "error", code: "title_exists", message: "标题不能为空。" },
    article.slug.trim()
      ? { level: "passed", code: "slug_exists", message: "Slug 已填写。" }
      : { level: "error", code: "slug_exists", message: "Slug 不能为空。" },
    plainText.trim()
      ? { level: "passed", code: "content_exists", message: "正文已填写。" }
      : { level: "error", code: "content_exists", message: "正文不能为空。" },
    article.summary.trim()
      ? { level: "passed", code: "summary_exists", message: "摘要已填写，可用于 Meta Description fallback。" }
      : { level: "warning", code: "summary_exists", message: "摘要为空，建议发布前补齐。" },
    pendingSuggestions.length === 0
      ? { level: "passed", code: "ai_suggestions_resolved", message: "没有待处理 AI 建议。" }
      : {
          level: "warning",
          code: "ai_suggestions_resolved",
          message: `仍有 ${pendingSuggestions.length} 条 AI 建议待处理。`,
        },
    article.tags.length > 0
      ? { level: "passed", code: "semantic_tags", message: "已选择标签。" }
      : { level: "warning", code: "semantic_tags", message: "建议补充标签，当前仅做 Mock 提示。" },
    { level: "passed", code: "canonical_buildable", message: "Canonical 可由 Django 规则生成。" },
    { level: "passed", code: "schema_buildable", message: "Schema 可由 Django SEO Context 规则生成。" },
  ];

  const errors = checks.filter((check) => check.level === "error").length;
  const warnings = checks.filter((check) => check.level === "warning").length;
  const passed = checks.filter((check) => check.level === "passed").length;

  return {
    article_id: articleId,
    checks,
    summary: {
      errors,
      warnings,
      passed,
      can_publish: errors === 0,
    },
  };
}

export function publishMockArticle(articleId: number) {
  const { articles } = getMockStore();
  const check = runMockSeoCheck(articleId);
  if (!check) {
    return null;
  }

  const index = findArticleIndex(articleId);
  if (index === -1) {
    return null;
  }

  if (!check.summary.can_publish) {
    return {
      article: cloneArticle(articles[index]),
      seo_check: check,
      published: false,
    };
  }

  const now = new Date().toISOString();
  articles[index] = {
    ...articles[index],
    status: "published",
    published_at: now,
    updated_at: now,
  };

  return {
    article: cloneArticle(articles[index]),
    seo_check: check,
    published: true,
  };
}

export function getMockArticleAnalytics(articleId: number) {
  return structuredClone(MOCK_ARTICLE_ANALYTICS[articleId] ?? null);
}

export function getMockSeoSummary() {
  return buildSeoSummary();
}

export function buildAnalyticsMetrics(summary: SeoSummaryRecord): AnalyticsMetric[] {
  return [
    {
      label: "总展示",
      value: summary.totals.total_impressions,
      trend: 8.4,
    },
    {
      label: "总点击",
      value: summary.totals.total_clicks,
      trend: 6.1,
    },
    {
      label: "总浏览量",
      value: summary.totals.total_pageviews,
      trend: 9.7,
    },
    {
      label: "AI 采纳率",
      value: Math.round(summary.totals.average_ai_acceptance_rate * 100),
      unit: "%",
      trend: 4.2,
    },
  ];
}
