"use client";

import { useEffect, useState, useTransition } from "react";

import { updateArticleDraft } from "../../lib/api-client";
import {
  buildDraftStorageKey,
  type ArticleRecord,
  type ArticleStatus
} from "../../lib/mock-api";

type ArticleEditorProps = {
  article: ArticleRecord;
};

type DraftState = Pick<ArticleRecord, "title" | "summary" | "slug" | "status" | "content_html">;

function createDraft(article: ArticleRecord): DraftState {
  return {
    title: article.title,
    summary: article.summary,
    slug: article.slug,
    status: article.status,
    content_html: article.content_html.replaceAll(/<[^>]+>/g, "")
  };
}

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  const storage = window.localStorage;
  if (
    !storage ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function"
  ) {
    return null;
  }

  return storage;
}

export function ArticleEditor({ article }: ArticleEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<DraftState>(() => createDraft(article));
  const [saveMessage, setSaveMessage] = useState("尚未保存本地草稿。");
  const storageKey = buildDraftStorageKey(article.article_id);

  useEffect(() => {
    const storage = getBrowserStorage();
    if (!storage) {
      return;
    }

    const storedDraft = storage.getItem(storageKey);
    if (!storedDraft) {
      return;
    }

    try {
      const parsedDraft = JSON.parse(storedDraft) as DraftState;
      setDraft(parsedDraft);
      setSaveMessage("已恢复本地草稿。");
    } catch {
      setSaveMessage("检测到本地草稿，但恢复失败，已回退到 Mock 基础数据。");
    }
  }, [storageKey]);

  function updateField<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const payload = {
          ...article,
          ...draft,
          content_html: `<p>${draft.content_html}</p>`
        };

        const result = await updateArticleDraft(article.article_id, payload);
        const nextDraft = createDraft(result);
        const storage = getBrowserStorage();
        if (storage) {
          storage.setItem(storageKey, JSON.stringify(nextDraft));
        }
        setDraft(nextDraft);
        setSaveMessage(`保存成功，Mock API 返回时间：${new Date(result.updated_at).toLocaleString("zh-CN")}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setSaveMessage(`保存失败：${message}`);
      }
    });
  }

  return (
    <div className="editor-grid">
      <section className="panel editor-panel">
        <div className="editor-toolbar">
          <div>
            <h2>文章编辑基础页</h2>
            <p>当前使用 textarea 代替 TipTap，后续 A08 会在此处接入 `content_json` 真正编辑器。</p>
          </div>
          <button className="cta primary" onClick={handleSave} type="button">
            {isPending ? "保存中..." : "保存草稿"}
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="title">
            标题
          </label>
          <input
            id="title"
            onChange={(event) => updateField("title", event.target.value)}
            value={draft.title}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="summary">
            摘要
          </label>
          <textarea
            id="summary"
            onChange={(event) => updateField("summary", event.target.value)}
            value={draft.summary}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="slug">
            Slug
          </label>
          <input
            id="slug"
            onChange={(event) => updateField("slug", event.target.value)}
            value={draft.slug}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="status">
            状态
          </label>
          <select
            id="status"
            onChange={(event) => updateField("status", event.target.value as ArticleStatus)}
            value={draft.status}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="content">
            正文占位
          </label>
          <textarea
            id="content"
            onChange={(event) => updateField("content_html", event.target.value)}
            value={draft.content_html}
          />
        </div>

        <div className="editor-status">{saveMessage}</div>
      </section>

      <aside className="panel editor-panel">
        <div>
          <h2>页面元信息</h2>
          <p>当前面板用于承接后续 SEO Metadata、AI Review Run 和发布前检查结果。</p>
        </div>
        <dl className="meta-grid">
          <div>
            <dt>Article ID</dt>
            <dd>{article.article_id}</dd>
          </div>
          <div>
            <dt>Schema</dt>
            <dd>{article.schema_version}</dd>
          </div>
          <div>
            <dt>Content Hash</dt>
            <dd>{article.content_hash ?? "待生成"}</dd>
          </div>
          <div>
            <dt>初始更新时间</dt>
            <dd>{new Date(article.updated_at).toLocaleString("zh-CN")}</dd>
          </div>
        </dl>
        <div>
          <h3>后续接入位置</h3>
          <ul className="helper-list">
            <li>A08：TipTap `content_json` 与 `blockId` 保存链路</li>
            <li>A09：AI Diff Decoration、Accept / Reject</li>
            <li>A10：发布前 SEO 检查与发布按钮</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
