const isServer = typeof window === "undefined";
const publicSiteBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3003";
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_DJANGO_PUBLIC_BASE_URL || "http://127.0.0.1:8001";
const serverBaseUrl = configuredApiBaseUrl;

export interface ArticleApiCategory {
  category_id: number;
  name: string;
  slug: string;
}

export interface ArticleApiTag {
  tag_id: number;
  name: string;
  slug: string;
}

export interface ArticleApiItem {
  article_id: number;
  schema_version: string;
  title: string;
  summary: string;
  slug: string;
  status: string;
  category: ArticleApiCategory | null;
  tags: ArticleApiTag[];
  content_json: Record<string, unknown>;
  content_html: string;
  content_hash: string;
  published_at: string | null;
  updated_at: string;
  seo?: {
    meta_title?: string;
    meta_description?: string;
    canonical_url?: string;
    robots?: string;
    og_title?: string;
    og_description?: string;
    og_image_url?: string;
  };
  seo_payload?: {
    canonical_url_resolved?: string;
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
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(value: string | null): string {
  if (!value) {
    return '未发布';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

function estimateReadTime(source: string): string {
  const text = source.trim();
  if (!text) {
    return '1 min';
  }
  const count = Math.max(1, Math.ceil(text.length / 220));
  return `${count} min`;
}

export interface PublicArticle {
  id: string;
  articleId: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categorySlug: string;
  date: string;
  author: string;
  readTime: string;
  tags: string[];
  contentHtml: string;
  contentText: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    robots: string;
    ogTitle: string;
    ogDescription: string;
    ogImageUrl: string;
  };
  seoPayload: {
    canonicalUrlResolved: string;
    faqItems: Array<{
      question: string;
      answer: string;
      sortOrder: number;
    }>;
    jsonLd: {
      breadcrumb?: Record<string, unknown>;
      faq?: Record<string, unknown> | null;
    };
  };
}

export type PublicArticleSectionKey = "services" | "solutions" | "products" | "cases";

export interface PublicArticleSectionConfig {
  key: PublicArticleSectionKey;
  slug: string;
  title: string;
  description: string;
  route: string;
  breadcrumbsLabel: string;
  categorySlugs: string[];
  tagSlugs: string[];
  keywords: string[];
}

export interface SiteSeoContext {
  siteName: string;
  baseUrl: string;
  defaultTitle: string;
  defaultDescription: string;
}

export function mapArticleToPublicArticle(article: ArticleApiItem): PublicArticle {
  const textContent = stripHtml(article.content_html);
  const excerpt = article.summary || textContent.slice(0, 140) || '该文章暂未提供摘要。';
  const seo = article.seo || {};
  const seoPayload = article.seo_payload || {};
  const articlePath = `/articles/${article.slug}`;
  return {
    id: String(article.article_id),
    articleId: article.article_id,
    slug: article.slug,
    title: article.title,
    excerpt,
    category: article.category?.name || '未分类',
    categorySlug: article.category?.slug || "",
    date: formatDate(article.published_at),
    author: 'CMS 发布系统',
    readTime: estimateReadTime(textContent || excerpt),
    tags: article.tags.map((tag) => tag.name),
    contentHtml: article.content_html,
    contentText: textContent || excerpt,
    seo: {
      metaTitle: seo.meta_title || article.title,
      metaDescription: seo.meta_description || excerpt,
      canonicalUrl:
        seoPayload.canonical_url_resolved ||
        seo.canonical_url ||
        new URL(articlePath, publicSiteBaseUrl).toString(),
      robots: seo.robots || "index,follow",
      ogTitle: seo.og_title || seo.meta_title || article.title,
      ogDescription: seo.og_description || seo.meta_description || excerpt,
      ogImageUrl: seo.og_image_url ? new URL(seo.og_image_url, serverBaseUrl).toString() : "",
    },
    seoPayload: {
      canonicalUrlResolved:
        seoPayload.canonical_url_resolved ||
        seo.canonical_url ||
        new URL(articlePath, publicSiteBaseUrl).toString(),
      faqItems: (seoPayload.faq_items || []).map((item) => ({
        question: item.question,
        answer: item.answer,
        sortOrder: item.sort_order,
      })),
      jsonLd: {
        breadcrumb: seoPayload.json_ld?.breadcrumb,
        faq: seoPayload.json_ld?.faq ?? null,
      },
    },
  };
}

async function requestJson<T>(path: string): Promise<T> {
  const target = isServer ? new URL(path, serverBaseUrl).toString() : path;
  const response = await fetch(target, {
    headers: {
      Accept: 'application/json'
    },
    redirect: 'manual',
    cache: 'no-store',
  });
  if (response.status === 301) {
    const location = response.headers.get('Location');
    if (location) {
      const nextPath = isServer
        ? new URL(location, serverBaseUrl).pathname
        : location;
      return requestJson<T>(nextPath);
    }
  }
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function logPublicApiError(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[public-web] ${scope} 公开接口请求失败：${message}`);
}

export function getSiteSeoContext(): SiteSeoContext {
  return {
    siteName: "云璨科技",
    baseUrl: publicSiteBaseUrl,
    defaultTitle: "云璨科技 | 企业云服务与架构运维",
    defaultDescription: "云璨科技提供企业上云咨询、自动化运维、混合云治理与真实架构解决方案。",
  };
}

export function buildOrganizationJsonLd() {
  const site = getSiteSeoContext();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.siteName,
    url: site.baseUrl,
  };
}

export function buildWebsiteJsonLd() {
  const site = getSiteSeoContext();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.siteName,
    url: site.baseUrl,
  };
}

export function buildArticleJsonLd(article: PublicArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.seo.metaTitle || article.title,
    description: article.seo.metaDescription || article.excerpt,
    datePublished: article.date,
    dateModified: article.date,
    author: {
      "@type": "Organization",
      name: article.author,
    },
    mainEntityOfPage: article.seo.canonicalUrl,
  };
}

export function buildBreadcrumbJsonLd(article: PublicArticle, section?: PublicArticleSectionConfig) {
  if (article.seoPayload.jsonLd.breadcrumb) {
    return article.seoPayload.jsonLd.breadcrumb;
  }
  const site = getSiteSeoContext();
  const targetSection = section ?? getPublicArticleSectionConfig("solutions");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "首页",
        item: site.baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: targetSection.breadcrumbsLabel,
        item: new URL(targetSection.route, site.baseUrl).toString(),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: article.seo.canonicalUrl,
      },
    ],
  };
}

export function buildFaqJsonLd(article: PublicArticle) {
  if (article.seoPayload.jsonLd.faq) {
    return article.seoPayload.jsonLd.faq;
  }
  if (!article.seoPayload.faqItems.length) {
    return null;
  }
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": article.seoPayload.faqItems.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };
}

export async function fetchPublishedArticles(): Promise<PublicArticle[]> {
  let payload: ArticleApiItem[];
  try {
    payload = await requestJson<ArticleApiItem[]>('/api/public/articles/');
  } catch (error) {
    logPublicApiError("文章列表", error);
    return [];
  }
  return payload
    .sort((left, right) => {
      const leftTime = left.published_at ? new Date(left.published_at).getTime() : 0;
      const rightTime = right.published_at ? new Date(right.published_at).getTime() : 0;
      return rightTime - leftTime;
  })
  .map(mapArticleToPublicArticle);
}

export function getPublicArticleSectionConfig(section: PublicArticleSectionKey): PublicArticleSectionConfig {
  const sectionConfigs: Record<PublicArticleSectionKey, PublicArticleSectionConfig> = {
    services: {
      key: "services",
      slug: "services",
      title: "上云服务",
      description: "查看云璨公开发布的上云咨询、迁移托管与运维服务文章。",
      route: "/services",
      breadcrumbsLabel: "上云服务",
      categorySlugs: ["services", "cloud-services", "service", "上云服务"],
      tagSlugs: ["services", "cloud-services", "service", "上云服务"],
      keywords: ["上云服务", "迁移", "运维", "托管", "咨询"],
    },
    solutions: {
      key: "solutions",
      slug: "solutions",
      title: "解决方案",
      description: "查看云璨公开发布的解决方案、架构实践与行业案例。",
      route: "/solutions",
      breadcrumbsLabel: "解决方案中心",
      categorySlugs: ["solutions", "solution", "架构方案", "解决方案"],
      tagSlugs: ["solutions", "solution", "架构方案", "解决方案"],
      keywords: ["解决方案", "架构", "案例", "实践", "方案"],
    },
    products: {
      key: "products",
      slug: "products",
      title: "产品中心",
      description: "查看云璨公开发布的产品中心、工具与平台能力文章。",
      route: "/products",
      breadcrumbsLabel: "产品中心",
      categorySlugs: ["products", "product", "product-center", "产品中心"],
      tagSlugs: ["products", "product", "product-center", "产品中心"],
      keywords: ["产品中心", "工具", "平台", "系统", "能力"],
    },
    cases: {
      key: "cases",
      slug: "cases",
      title: "客户案例",
      description: "查看云璨公开发布的客户案例与落地实践文章。",
      route: "/cases",
      breadcrumbsLabel: "客户案例",
      categorySlugs: ["cases", "case", "customer-case", "客户案例"],
      tagSlugs: ["cases", "case", "customer-case", "客户案例"],
      keywords: ["客户案例", "案例", "落地", "实践", "复盘"],
    },
  };

  return sectionConfigs[section];
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function isMatchedByKeywords(article: PublicArticle, keywords: string[]): boolean {
  if (!keywords.length) {
    return false;
  }
  const haystack = [
    article.title,
    article.excerpt,
    article.category,
    article.contentText,
    ...article.tags,
  ]
    .join(" ")
    .toLowerCase();
  return keywords.some((keyword) => haystack.includes(normalizeValue(keyword)));
}

export function filterArticlesBySection(articles: PublicArticle[], section: PublicArticleSectionKey): PublicArticle[] {
  const config = getPublicArticleSectionConfig(section);
  const categorySlugs = config.categorySlugs.map(normalizeValue);
  const tagSlugs = config.tagSlugs.map(normalizeValue);

  return articles.filter((article) => {
    const articleCategorySlug = normalizeValue(article.categorySlug || "");
    const articleCategory = normalizeValue(article.category || "");
    const articleTags = article.tags.map(normalizeValue);
    const matchesCategory = categorySlugs.length
      ? categorySlugs.includes(articleCategorySlug) || categorySlugs.includes(articleCategory)
      : true;
    const matchesTag = tagSlugs.length
      ? articleTags.some((tag) => tagSlugs.includes(tag))
      : false;
    return matchesCategory || matchesTag || isMatchedByKeywords(article, config.keywords);
  });
}

export async function fetchArticleDetailBySlug(slug: string): Promise<PublicArticle> {
  const payload = await requestJson<ArticleApiItem>(`/api/public/articles/${slug}/`);
  return mapArticleToPublicArticle(payload);
}
