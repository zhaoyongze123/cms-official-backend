import { describe, expect, it } from "vitest";

import {
  buildDraftStorageKey,
  buildAnalyticsMetrics,
  createMockArticle,
  getMockArticleAnalytics,
  getMockArticleById,
  getMockSeoSummary,
  listMockArticles,
  updateMockArticlePayload
} from "./mock-api";

describe("mock api helpers", () => {
  it("filters articles by status and query", () => {
    const draftArticles = listMockArticles({ status: "draft" });
    const queryArticles = listMockArticles({ query: "contract" });

    expect(draftArticles.every((article) => article.status === "draft")).toBe(true);
    expect(queryArticles.some((article) => article.slug === "django-next-contract-checklist")).toBe(true);
  });

  it("reads and updates a single article", () => {
    const article = getMockArticleById(101);

    expect(article).not.toBeNull();

    const updated = updateMockArticlePayload(article!, {
      title: "新的标题"
    });

    expect(updated.title).toBe("新的标题");
    expect(updated.updated_at).not.toBe(article!.updated_at);
  });

  it("normalizes content_json blockId during update", () => {
    const article = getMockArticleById(101);

    const updated = updateMockArticlePayload(article!, {
      content_json: {
        tiptap_schema_version: "v1",
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "新的正文" }],
          },
        ],
      },
    });

    expect(updated.content_json.content[0].attrs?.blockId).toMatch(/^blk_/);
  });

  it("creates draft helpers for new article flow", () => {
    const created = createMockArticle("A07 Mock Article");
    const storageKey = buildDraftStorageKey(created.article_id);

    expect(created.status).toBe("draft");
    expect(created.slug).toBe("a07-mock-article");
    expect(storageKey).toContain(String(created.article_id));
  });

  it("returns analytics fixtures for article and summary views", () => {
    const articleAnalytics = getMockArticleAnalytics(102);
    const summary = getMockSeoSummary();

    expect(articleAnalytics).not.toBeNull();
    expect(articleAnalytics?.sources.gsc.impressions).toBeGreaterThan(0);
    expect(summary.totals.total_pageviews).toBeGreaterThan(0);
    expect(summary.source_health).toHaveLength(3);
  });

  it("builds dashboard metric cards from summary payload", () => {
    const metrics = buildAnalyticsMetrics(getMockSeoSummary());

    expect(metrics).toHaveLength(4);
    expect(metrics[0].label).toBe("总展示");
    expect(metrics[3].unit).toBe("%");
  });
});
