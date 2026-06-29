"use client";

import { ArticleEditorWorkspace } from "./article-editor-workspace";
import { createArticle, publishArticle } from "../../lib/api-client";
import type { ArticleRecord } from "../../lib/mock-api";
import { studioBrowserPath } from "../../lib/routes";

type NewArticleWorkspaceProps = {
  embedded?: boolean;
};

const EMPTY_NEW_ARTICLE: ArticleRecord = {
  article_id: 0,
  schema_version: "v1",
  title: "",
  summary: "",
  slug: "",
  status: "draft",
  category: null,
  cover_image: null,
  tags: [],
  content_json: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "",
          },
        ],
      },
    ],
  },
  content_html: "",
  meta_description: "",
  content_hash: "",
  published_at: null,
  updated_at: new Date().toISOString(),
  faq_items: [],
  seo: {
    meta_title: "",
    meta_description: "",
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

export function NewArticleWorkspace({ embedded = false }: NewArticleWorkspaceProps) {
  function buildPostCreatePath(articleId: number) {
    return embedded
      ? studioBrowserPath(`/django-admin/articles/${articleId}/`)
      : `/studio/articles/${articleId}`;
  }

  async function handleSaveDraft(payload: Partial<ArticleRecord>) {
    const created = await createArticle({
      ...payload,
      status: "draft",
    });
    const nextPath = buildPostCreatePath(created.article_id);
    window.location.assign(nextPath);
    return created;
  }

  async function handlePublish(payload: Partial<ArticleRecord>) {
    const created = await createArticle({
      ...payload,
      status: "draft",
    });
    const published = await publishArticle(created.article_id);
    const nextPath = buildPostCreatePath(published.article.article_id);
    window.location.assign(nextPath);
    return published.article;
  }

  return (
    <ArticleEditorWorkspace
      article={EMPTY_NEW_ARTICLE}
      embedded={embedded}
      onPublish={handlePublish}
      onSaveDraft={handleSaveDraft}
      showPublishAction
    />
  );
}
