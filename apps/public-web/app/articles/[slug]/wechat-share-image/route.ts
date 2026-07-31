import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { fetchArticleDetailBySlug } from "../../../../src/lib/articles-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

function buildBrandPanel() {
  return Buffer.from(`
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#f7f8fa"/>
      <rect x="0" y="0" width="16" height="${CARD_HEIGHT}" fill="#d96a12"/>
      <rect x="62" y="190" width="1076" height="378" rx="20" fill="#ffffff" stroke="#e6e9ee" stroke-width="2"/>
      <circle cx="1090" cy="86" r="132" fill="#fff0e3"/>
      <circle cx="1090" cy="86" r="94" fill="#f8d5b3"/>
    </svg>
  `);
}

async function readPublicAsset(filename: string) {
  return readFile(path.join(process.cwd(), "public", filename));
}

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

  const [logo, articleImage] = await Promise.all([
    readPublicAsset("yuncan-logo.png"),
    fetchArticleImage(article.seo.ogImageUrl),
  ]);

  const composites: sharp.OverlayOptions[] = [
    { input: buildBrandPanel(), top: 0, left: 0 },
    { input: await sharp(logo).resize({ width: 390 }).png().toBuffer(), top: 50, left: 64 },
  ];

  if (articleImage) {
    composites.push({
      input: await sharp(articleImage)
        .resize({ width: 1000, height: 330, fit: "contain", background: "#ffffff" })
        .png()
        .toBuffer(),
      top: 214,
      left: 100,
    });
  }

  const body = await sharp({
    create: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      channels: 3,
      background: "#f7f8fa",
    },
  })
    .composite(composites)
    .jpeg({ quality: 90, progressive: true })
    .toBuffer();

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Type": "image/jpeg",
    },
  });
}
