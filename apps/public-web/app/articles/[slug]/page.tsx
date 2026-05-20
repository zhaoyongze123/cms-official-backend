import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicArticlePage from "../../../src/features/public-site/public-article-page";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  fetchArticleDetailBySlug,
  getPublicArticleSectionConfig,
  type PublicArticleSectionKey,
} from "../../../src/lib/articles-api";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ from?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticleDetailBySlug(slug);

  if (!article) {
    return {
      title: "文章不存在 | 云璨科技"
    };
  }

  return {
    title: `${article.seo.metaTitle} | 云璨科技`,
    description: article.seo.metaDescription,
    alternates: {
      canonical: article.seo.canonicalUrl,
    },
    robots: article.seo.robots,
    openGraph: {
      title: article.seo.ogTitle,
      description: article.seo.ogDescription,
      type: "article",
      url: article.seo.canonicalUrl,
      images: article.seo.ogImageUrl ? [{ url: article.seo.ogImageUrl }] : undefined,
    },
    twitter: {
      card: article.seo.ogImageUrl ? "summary_large_image" : "summary",
      title: article.seo.ogTitle,
      description: article.seo.ogDescription,
      images: article.seo.ogImageUrl ? [article.seo.ogImageUrl] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const article = await fetchArticleDetailBySlug(slug);

  if (!article) {
    notFound();
  }

  const fromSection = ((resolvedSearchParams.from || "solutions").trim() || "solutions") as PublicArticleSectionKey;
  const validSectionKeys: PublicArticleSectionKey[] = ["services", "solutions", "products", "cases"];
  const section = getPublicArticleSectionConfig(validSectionKeys.includes(fromSection) ? fromSection : "solutions");
  const jsonLd = [buildArticleJsonLd(article), buildBreadcrumbJsonLd(article, section), buildFaqJsonLd(article)].filter(Boolean);

  return (
    <>
      {jsonLd.map((item, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
      <PublicArticlePage article={article} section={section} />
    </>
  );
}
