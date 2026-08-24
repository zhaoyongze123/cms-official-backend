import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicLayout from "../../src/features/public-site/public-layout";
import { fetchManagedPageByPath } from "../../src/lib/articles-api";

export const dynamic = "force-dynamic";

function ManagedPageRenderer({ templateKey, contentHtml }: { templateKey: string; contentHtml: string }) {
  const className = templateKey === "rich-text"
    ? "mx-auto max-w-4xl px-6 pb-24 pt-36 prose prose-slate prose-lg"
    : "mx-auto min-h-[60vh] max-w-7xl px-6 pb-24 pt-36";
  return <main className={className} dangerouslySetInnerHTML={{ __html: contentHtml }} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>;
}): Promise<Metadata> {
  const { path } = await params;
  const page = await fetchManagedPageByPath(path.join("/"));
  if (!page) {
    return { title: "页面不存在 | 云璨科技", robots: { index: false, follow: false } };
  }
  return {
    title: `${page.title} | 云璨科技`,
    description: page.metaDescription || undefined,
    alternates: { canonical: page.canonicalUrl },
    robots: page.robots,
  };
}

export default async function ManagedPageRoute({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const page = await fetchManagedPageByPath(path.join("/"));
  if (!page) {
    notFound();
  }
  return (
    <PublicLayout active="landing">
      <ManagedPageRenderer contentHtml={page.contentHtml} templateKey={page.templateKey} />
    </PublicLayout>
  );
}
