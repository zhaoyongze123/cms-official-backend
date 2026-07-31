import sharp from "sharp";

import { fetchArticleDetailBySlug } from "../../../../src/lib/articles-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchArticleImage(imageUrl: string) {
  if (!imageUrl) {
    return null;
  }

  const response = await fetch(imageUrl, { next: { revalidate: 300, tags: ["public-api"] } });
  if (!response.ok) {
    return null;
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const article = await fetchArticleDetailBySlug(slug);
  if (!article) {
    return new Response("Not found", { status: 404 });
  }

  const articleImage = await fetchArticleImage(article.seo.ogImageUrl);
  if (!articleImage) {
    return new Response("OG image not found", { status: 404 });
  }

  const image = sharp(articleImage).rotate();
  const metadata = await image.metadata();
  const body = await image.toBuffer();
  const contentType =
    metadata.format === "png"
      ? "image/png"
      : metadata.format === "webp"
        ? "image/webp"
        : metadata.format === "avif"
          ? "image/avif"
          : "image/jpeg";

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Length": String(body.byteLength),
      "Content-Type": contentType,
    },
  });
}
