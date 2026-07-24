import { cache } from "react";

const isServer = typeof window === "undefined";
const isDevelopment = process.env.NODE_ENV !== "production";
const publicSiteBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3003");
const publicApiBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_DJANGO_PUBLIC_BASE_URL || "http://127.0.0.1:8001");
const serverBaseUrl = normalizeBaseUrl(process.env.DJANGO_INTERNAL_BASE_URL || publicApiBaseUrl);
const publicApiUrl = new URL(`${publicApiBaseUrl}/`);

export class PublicApiRequestError extends Error {
  status: number;

  constructor(status: number) {
    super(`请求失败: ${status}`);
    this.name = "PublicApiRequestError";
    this.status = status;
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function buildAbsoluteSiteUrl(path: string): string {
  return new URL(path, `${publicSiteBaseUrl}/`).toString();
}

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

function firstContentImageUrl(html: string): string {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match?.[1]) return "";
  try {
    return new URL(match[1], publicApiBaseUrl).toString();
  } catch {
    return "";
  }
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
}

export interface SiteSeoContext {
  siteName: string;
  baseUrl: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string[];
}

export interface PublicSiteSettings {
  siteTitle: string;
  seoDescription: string;
  thirdPartyScripts: {
    head: string;
    bodyEnd: string;
  };
  homepageFeaturedArticles: PublicArticle[];
  homepageSolutionArticles: PublicArticle[];
  homepageCaseLogoWallImageUrl: string;
}

function buildDefaultArticleCanonicalUrl(slug: string): string {
  return new URL(`/articles/${slug}`, publicSiteBaseUrl).toString();
}

function resolveArticleCanonicalUrl(article: ArticleApiItem): string {
  const seo = article.seo || {};
  const explicitCanonical = seo.canonical_url?.trim();
  if (explicitCanonical) {
    return explicitCanonical;
  }
  return buildDefaultArticleCanonicalUrl(article.slug);
}

export function mapArticleToPublicArticle(article: ArticleApiItem): PublicArticle {
  const textContent = stripHtml(article.content_html);
  const excerpt = article.summary || textContent.slice(0, 140) || '该文章暂未提供摘要。';
  const seo = article.seo || {};
  const seoPayload = article.seo_payload || {};
  const canonicalUrl = resolveArticleCanonicalUrl(article);
  const shareImageUrl = seo.og_image_url
    ? new URL(seo.og_image_url, publicApiBaseUrl).toString()
    : firstContentImageUrl(article.content_html);
  return {
    id: String(article.article_id),
    articleId: article.article_id,
    slug: article.slug,
    title: article.title,
    excerpt,
    category: article.category?.name || '未分类',
    categorySlug: article.category?.slug || "",
    date: formatDate(article.published_at),
    author: '云璨技术团队',
    readTime: estimateReadTime(textContent || excerpt),
    tags: article.tags.map((tag) => tag.name),
    contentHtml: article.content_html,
    contentText: textContent || excerpt,
    seo: {
      metaTitle: seo.meta_title || article.title,
      metaDescription: seo.meta_description || excerpt,
      canonicalUrl,
      robots: seo.robots || "index,follow",
      ogTitle: seo.og_title || seo.meta_title || article.title,
      ogDescription: seo.og_description || seo.meta_description || excerpt,
      ogImageUrl: shareImageUrl,
    },
    seoPayload: {
      canonicalUrlResolved: canonicalUrl,
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
  const headers: HeadersInit = {
    Accept: 'application/json',
  };
  if (isServer && serverBaseUrl !== publicApiBaseUrl) {
    // 内部 HTTP 请求仍按公网 HTTPS 请求交给 Django 处理，避免 SSL 重定向。
    headers["X-Forwarded-Host"] = publicApiUrl.host;
    headers["X-Forwarded-Proto"] = publicApiUrl.protocol.replace(":", "");
  }
  const response = await fetch(target, {
    headers,
    redirect: 'manual',
    // 公开内容短时缓存，文章保存或发布后由 Django 主动失效该标签。
    next: {
      revalidate: 300,
      tags: ["public-api"],
    },
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
    throw new PublicApiRequestError(response.status);
  }
  return response.json() as Promise<T>;
}

function logPublicApiError(scope: string, error: unknown) {
  if (isDevelopment && isNetworkFetchError(error)) {
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[public-web] ${scope} 公开接口请求失败：${message}`);
}

function isNetworkFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes("fetch failed") || message.includes("econnrefused") || message.includes("connect");
}

export function getSiteSeoContext(): SiteSeoContext {
  return {
    siteName: "云璨信息",
    baseUrl: publicSiteBaseUrl,
    defaultTitle: "云璨信息 - 上海云服务商 | 公有云·私有化部署·AI应用解决方案",
    defaultDescription: "云璨信息是上海专业云服务商，为金融、政务、制造业企业提供公有云资源、私有化部署、企业邮件及AI应用的一站式解决方案。依托真实行业落地案例，从选型、开发到交付全程支持。阿里云授权合作伙伴，欢迎咨询方案报价。",
    defaultKeywords: [
      "阿里云代理商",
      "私有化部署",
      "企业AI解决方案",
      "公有云解决方案",
      "邮件系统",
      "邮件归档",
      "邮件安全网关",
      "MailStore",
      "MDaemon",
      "SecurityGateway",
      "上海云服务",
      "企业数字化",
    ],
  };
}

export const getPublicSiteSettings = cache(async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const payload = await requestJson<{
      site_title?: string;
      seo_description?: string;
      third_party_scripts?: {
        head?: string;
        body_end?: string;
      };
      homepage_featured_articles?: ArticleApiItem[];
      homepage_solution_articles?: ArticleApiItem[];
      homepage_case_logo_wall_image_url?: string | null;
    }>("/api/public/site-settings/");

    return {
      siteTitle: payload.site_title || "企业内容管理系统",
      seoDescription: payload.seo_description || "",
      thirdPartyScripts: {
        head: payload.third_party_scripts?.head || "",
        bodyEnd: payload.third_party_scripts?.body_end || "",
      },
      homepageFeaturedArticles: (payload.homepage_featured_articles || [])
        .filter((item): item is ArticleApiItem => Boolean(item))
        .map(mapArticleToPublicArticle),
      homepageSolutionArticles: (payload.homepage_solution_articles || [])
        .filter((item): item is ArticleApiItem => Boolean(item))
        .map(mapArticleToPublicArticle),
      homepageCaseLogoWallImageUrl: payload.homepage_case_logo_wall_image_url
        ? new URL(payload.homepage_case_logo_wall_image_url, publicApiBaseUrl).toString()
        : "",
    };
  } catch (error) {
    logPublicApiError("公开站点设置", error);
    return {
      siteTitle: "企业内容管理系统",
      seoDescription: "",
      thirdPartyScripts: {
        head: "",
        bodyEnd: "",
      },
      homepageFeaturedArticles: [],
      homepageSolutionArticles: [],
      homepageCaseLogoWallImageUrl: "",
    };
  }
});

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
        item: buildAbsoluteSiteUrl(targetSection.route),
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
    payload = await requestJson<ArticleApiItem[]>('/api/public/articles/?summary=1');
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
      description: "聚焦企业上云全流程服务，涵盖咨询规划、迁移实施、运维保障与持续优化，帮助业务稳定、安全、高效运行。",
      route: "/services",
      breadcrumbsLabel: "上云服务",
    },
    solutions: {
      key: "solutions",
      slug: "solutions",
      title: "解决方案",
      description: "面向不同行业与业务场景，提供可落地的架构设计、系统集成与数字化建设方案，兼顾实用性与扩展性。",
      route: "/solutions",
      breadcrumbsLabel: "解决方案中心",
    },
    products: {
      key: "products",
      slug: "products",
      title: "产品中心",
      description: "集中展示云璨提供的产品与平台能力，覆盖部署、管理、协同与智能化应用等多个方向。",
      route: "/products",
      breadcrumbsLabel: "产品中心",
    },
    cases: {
      key: "cases",
      slug: "cases",
      title: "客户案例",
      description: "汇总真实项目落地案例，展示我们在方案设计、实施交付与长期运维中的实践经验与成果。",
      route: "/cases",
      breadcrumbsLabel: "客户案例",
    },
  };

  return sectionConfigs[section];
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

export function filterArticlesBySection(articles: PublicArticle[], section: PublicArticleSectionKey): PublicArticle[] {
  const config = getPublicArticleSectionConfig(section);
  const sectionSlug = normalizeValue(config.slug);

  return articles.filter((article) => {
    return normalizeValue(article.categorySlug || "") === sectionSlug;
  });
}

export function resolveArticleSection(article: PublicArticle): PublicArticleSectionConfig {
  const validSectionKeys: PublicArticleSectionKey[] = ["services", "solutions", "products", "cases"];
  const normalizedCategorySlug = normalizeValue(article.categorySlug || "");
  const matchedSection = validSectionKeys.find((sectionKey) => {
    return normalizeValue(getPublicArticleSectionConfig(sectionKey).slug) === normalizedCategorySlug;
  });

  return getPublicArticleSectionConfig(matchedSection || "solutions");
}

export const fetchArticleDetailBySlug = cache(async function fetchArticleDetailBySlug(slug: string): Promise<PublicArticle | null> {
  try {
    const payload = await requestJson<ArticleApiItem>(`/api/public/articles/${slug}/`);
    return mapArticleToPublicArticle(payload);
  } catch (error) {
    if (error instanceof PublicApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
});
