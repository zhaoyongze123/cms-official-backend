import { describe, expect, it } from "vitest";

import { toStudioArticleRecord, type DjangoArticleRecord } from "./articles";

describe("toStudioArticleRecord", () => {
  it("normalizes relative og image urls to django public base url", () => {
    const article = {
      article_id: 17,
      schema_version: "v1",
      title: "邮件归档解决方案",
      summary: "",
      slug: "mail-archive",
      status: "draft",
      category: null,
      tags: [],
      content_json: { type: "doc", content: [] },
      content_html: "",
      content_hash: "sha256:test",
      published_at: null,
      updated_at: "2026-06-03T02:00:00Z",
      faq_items: [],
      seo: {
        meta_title: "邮件归档解决方案",
        meta_description: "",
        meta_keywords: "",
        canonical_url: "",
        robots: "index,follow",
        og_title: "",
        og_description: "",
        og_image: {
          image_id: 31,
          title: "图片 31",
          alt_text: "",
          file_url: "/media/library/images/2026/06/IMG_1855.jpg",
        },
        og_image_url: "/media/library/images/2026/06/IMG_1855.jpg",
      },
      seo_payload: {},
    } satisfies DjangoArticleRecord;

    const result = toStudioArticleRecord(article);

    expect(result.seo?.og_image?.file_url).toBe("http://127.0.0.1:8001/media/library/images/2026/06/IMG_1855.jpg");
    expect(result.seo?.og_image_url).toBe("http://127.0.0.1:8001/media/library/images/2026/06/IMG_1855.jpg");
  });

  it("strips admin path segments from django public base url before normalizing og image urls", () => {
    process.env.NEXT_PUBLIC_DJANGO_BASE_URL = "https://www.yuncan.com/django/django-admin";
    process.env.NEXT_PUBLIC_DJANGO_MEDIA_URL = "/django/media/";

    const article = {
      article_id: 20,
      schema_version: "v1",
      title: "云璨CMS建站解决方案",
      summary: "",
      slug: "cms-solution",
      status: "published",
      category: null,
      tags: [],
      content_json: { type: "doc", content: [] },
      content_html: "",
      content_hash: "sha256:test",
      published_at: null,
      updated_at: "2026-06-03T02:00:00Z",
      faq_items: [],
      seo: {
        meta_title: "云璨CMS建站解决方案",
        meta_description: "",
        meta_keywords: "",
        canonical_url: "",
        robots: "index,follow",
        og_title: "",
        og_description: "",
        og_image: {
          image_id: 119,
          title: "image-4-1024x871.png",
          alt_text: "",
          file_url: "/django/media/library/images/2023/05/image-4-1024x871.png",
        },
        og_image_url: "/django/media/library/images/2023/05/image-4-1024x871.png",
      },
      seo_payload: {},
    } satisfies DjangoArticleRecord;

    const result = toStudioArticleRecord(article);

    expect(result.seo?.og_image?.file_url).toBe("https://www.yuncan.com/django/media/library/images/2023/05/image-4-1024x871.png");
    expect(result.seo?.og_image_url).toBe("https://www.yuncan.com/django/media/library/images/2023/05/image-4-1024x871.png");
  });

  it("rewrites legacy prod image paths to dev media prefix when running locally", () => {
    process.env.NEXT_PUBLIC_DJANGO_BASE_URL = "http://127.0.0.1:8001";
    process.env.NEXT_PUBLIC_DJANGO_MEDIA_URL = "/media/";

    const article = {
      article_id: 21,
      schema_version: "v1",
      title: "开发环境图片回落",
      summary: "",
      slug: "dev-media-fallback",
      status: "draft",
      category: null,
      tags: [],
      content_json: { type: "doc", content: [] },
      content_html: "",
      content_hash: "sha256:test",
      published_at: null,
      updated_at: "2026-06-05T07:00:00Z",
      faq_items: [],
      seo: {
        meta_title: "",
        meta_description: "",
        meta_keywords: "",
        canonical_url: "",
        robots: "index,follow",
        og_title: "",
        og_description: "",
        og_image: {
          image_id: 32,
          title: "legacy prod image",
          alt_text: "",
          file_url: "/django/media/library/images/2026/06/IMG_1855.jpg",
        },
        og_image_url: "/django/media/library/images/2026/06/IMG_1855.jpg",
      },
      seo_payload: {},
    } satisfies DjangoArticleRecord;

    const result = toStudioArticleRecord(article);

    expect(result.seo?.og_image?.file_url).toBe("http://127.0.0.1:8001/media/library/images/2026/06/IMG_1855.jpg");
    expect(result.seo?.og_image_url).toBe("http://127.0.0.1:8001/media/library/images/2026/06/IMG_1855.jpg");
  });
});
