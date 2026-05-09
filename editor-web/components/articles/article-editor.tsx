"use client";

import { useEffect, useState, useTransition } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import {
  acceptSuggestion,
  publishArticle,
  rejectSuggestion,
  runSeoCheck,
  triggerAiReview,
  updateArticleDraft,
} from "../../lib/api-client";
import {
  buildDraftStorageKey,
  type ArticleRecord,
  type ArticleStatus,
  type SeoCheckRecord,
  type TiptapSuggestionRecord,
} from "../../lib/mock-api";
import {
  BlockIdExtension,
  extractPlainText,
  normalizeTiptapDocument,
  type TiptapDocument,
} from "../../lib/tiptap-document";

type ArticleEditorProps = {
  article: ArticleRecord;
};

type DraftState = Pick<ArticleRecord, "title" | "summary" | "slug" | "status"> & {
  content_json: TiptapDocument;
};

function createDraft(article: ArticleRecord): DraftState {
  return {
    title: article.title,
    summary: article.summary,
    slug: article.slug,
    status: article.status,
    content_json: normalizeTiptapDocument(article.content_json),
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
  const [currentArticle, setCurrentArticle] = useState<ArticleRecord>(article);
  const [suggestions, setSuggestions] = useState<TiptapSuggestionRecord[]>([]);
  const [seoCheck, setSeoCheck] = useState<SeoCheckRecord | null>(null);
  const [reviewMessage, setReviewMessage] = useState("尚未触发 AI 审核。");
  const [publishMessage, setPublishMessage] = useState("尚未执行发布检查。");
  const storageKey = buildDraftStorageKey(article.article_id);
  const editor = useEditor({
    extensions: [StarterKit, BlockIdExtension],
    content: draft.content_json,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });

  const contentText = extractPlainText(draft.content_json);

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
      setDraft({
        ...parsedDraft,
        content_json: normalizeTiptapDocument(parsedDraft.content_json),
      });
      setSaveMessage("已恢复本地草稿。");
    } catch {
      setSaveMessage("检测到本地草稿，但恢复失败，已回退到 Mock 基础数据。");
    }
  }, [storageKey]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.commands.setContent(draft.content_json, {
      emitUpdate: false,
    });
  }, [draft.content_json, editor]);

  function updateField<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const nextContentJson = normalizeTiptapDocument(editor?.getJSON() ?? draft.content_json);
        const payload = {
          ...article,
          ...draft,
          content_json: nextContentJson,
          content_html: editor?.getHTML() ?? article.content_html,
        };

        const result = await updateArticleDraft(article.article_id, payload);
        const nextDraft = createDraft(result);
        const storage = getBrowserStorage();
        if (storage) {
          storage.setItem(storageKey, JSON.stringify(nextDraft));
        }
        setCurrentArticle(result);
        setDraft(nextDraft);
        setSaveMessage(`保存成功，Mock API 返回时间：${new Date(result.updated_at).toLocaleString("zh-CN")}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setSaveMessage(`保存失败：${message}`);
      }
    });
  }

  function syncArticle(result: ArticleRecord) {
    const nextDraft = createDraft(result);
    setCurrentArticle(result);
    setDraft(nextDraft);
    const storage = getBrowserStorage();
    if (storage) {
      storage.setItem(storageKey, JSON.stringify(nextDraft));
    }
  }

  function handleTriggerAiReview() {
    startTransition(async () => {
      try {
        const response = await triggerAiReview(article.article_id);
        setSuggestions(response.suggestions);
        setReviewMessage(`已生成 ${response.suggestions.length} 条 AI 建议。`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setReviewMessage(`AI 审核失败：${message}`);
      }
    });
  }

  function handleAcceptSuggestion(suggestion: TiptapSuggestionRecord, edited: boolean) {
    startTransition(async () => {
      try {
        const nextContentJson = normalizeTiptapDocument(editor?.getJSON() ?? draft.content_json);
        const response = await acceptSuggestion(suggestion.suggestion_id, {
          content_hash: currentArticle.content_hash ?? "",
          ...(edited
            ? {
                content_json: nextContentJson,
                content_html: editor?.getHTML() ?? currentArticle.content_html,
              }
            : {}),
        });
        syncArticle(response.article);
        setSuggestions((current) =>
          current.map((item) => (item.suggestion_id === suggestion.suggestion_id ? response.suggestion : item))
        );
        setReviewMessage(edited ? "已按编辑后正文接受建议。" : "已应用 AI Patch。");
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setReviewMessage(`接受建议失败：${message}`);
      }
    });
  }

  function handleRejectSuggestion(suggestion: TiptapSuggestionRecord) {
    startTransition(async () => {
      try {
        const response = await rejectSuggestion(suggestion.suggestion_id);
        setSuggestions((current) =>
          current.map((item) => (item.suggestion_id === suggestion.suggestion_id ? response.suggestion : item))
        );
        setReviewMessage("已拒绝该建议。");
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setReviewMessage(`拒绝建议失败：${message}`);
      }
    });
  }

  function handleSeoCheck() {
    startTransition(async () => {
      try {
        const result = await runSeoCheck(article.article_id);
        setSeoCheck(result);
        setPublishMessage(
          result.summary.can_publish
            ? `检查通过：${result.summary.passed} 项通过，${result.summary.warnings} 项警告。`
            : `检查未通过：${result.summary.errors} 项错误，${result.summary.warnings} 项警告。`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setPublishMessage(`SEO 检查失败：${message}`);
      }
    });
  }

  function handlePublish() {
    startTransition(async () => {
      try {
        const response = await publishArticle(article.article_id);
        syncArticle(response.article);
        setSeoCheck(response.seo_check);
        setPublishMessage("文章已发布。");
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setPublishMessage(`发布失败：${message}`);
      }
    });
  }

  return (
    <div className="editor-grid">
      <section className="panel editor-panel">
        <div className="editor-toolbar">
          <div>
            <h2>TipTap 基础编辑器</h2>
            <p>当前保存会同步写入 `content_json`、`blockId` 和 `content_html`，为 A09 Diff 提供稳定正文结构。</p>
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
            正文内容
          </label>
          <div className="tiptap-shell">
            <div className="tiptap-toolbar" role="toolbar" aria-label="编辑器工具栏">
              <button
                className="toolbar-chip"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                type="button"
              >
                加粗
              </button>
              <button
                className="toolbar-chip"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                type="button"
              >
                斜体
              </button>
              <button
                className="toolbar-chip"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                type="button"
              >
                H2
              </button>
              <button
                className="toolbar-chip"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                type="button"
              >
                无序列表
              </button>
              <button
                className="toolbar-chip"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                type="button"
              >
                有序列表
              </button>
            </div>
            <EditorContent editor={editor} id="content" />
          </div>
          <small>正文结构会在保存时规范化为 TipTap v1 文档，并为段落/标题/列表自动补齐 `blockId`。</small>
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
            <dt>TipTap Blocks</dt>
            <dd>{draft.content_json.content.length}</dd>
          </div>
          <div>
            <dt>正文字符数</dt>
            <dd>{contentText.length}</dd>
          </div>
          <div>
            <dt>Content Hash</dt>
            <dd>{currentArticle.content_hash ?? "待生成"}</dd>
          </div>
          <div>
            <dt>初始更新时间</dt>
            <dd>{new Date(currentArticle.updated_at).toLocaleString("zh-CN")}</dd>
          </div>
        </dl>
        <div>
          <h3>A09 AI Diff</h3>
          <div className="cta-row">
            <button className="cta" onClick={handleTriggerAiReview} type="button">
              {isPending ? "处理中..." : "触发 AI 审核"}
            </button>
          </div>
          <p>{reviewMessage}</p>
          <div className="helper-list">
            {suggestions.length === 0 ? (
              <span>暂无建议。</span>
            ) : (
              suggestions.map((suggestion) => (
                <article className="article-card" key={suggestion.suggestion_id}>
                  <div className="article-card-head">
                    <span className="status-pill">{suggestion.status}</span>
                    <span className="caption">{suggestion.severity}</span>
                  </div>
                  <strong>{suggestion.title}</strong>
                  <p>{suggestion.reason}</p>
                  {suggestion.patches.map((patch) => (
                    <div key={patch.patch_id}>
                      <small>
                        {patch.operation} / {patch.target_block_id}
                      </small>
                      <p>旧文本：{patch.old_text ?? "-"}</p>
                      <p>新文本：{patch.new_text ?? "-"}</p>
                    </div>
                  ))}
                  <div className="cta-row">
                    <button
                      className="cta primary"
                      onClick={() => handleAcceptSuggestion(suggestion, false)}
                      type="button"
                      disabled={suggestion.status !== "pending"}
                    >
                      接受 Patch
                    </button>
                    <button
                      className="cta"
                      onClick={() => handleAcceptSuggestion(suggestion, true)}
                      type="button"
                      disabled={suggestion.status !== "pending"}
                    >
                      编辑后接受
                    </button>
                    <button
                      className="cta"
                      onClick={() => handleRejectSuggestion(suggestion)}
                      type="button"
                      disabled={suggestion.status !== "pending"}
                    >
                      拒绝
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
        <div>
          <h3>A10 发布闭环</h3>
          <div className="cta-row">
            <button className="cta" onClick={handleSeoCheck} type="button">
              发布前检查
            </button>
            <button
              className="cta primary"
              onClick={handlePublish}
              type="button"
              disabled={seoCheck !== null && !seoCheck.summary.can_publish}
            >
              发布文章
            </button>
          </div>
          <p>{publishMessage}</p>
          {seoCheck ? (
            <div className="helper-list">
              {seoCheck.checks.map((check) => (
                <span key={check.code}>
                  [{check.level}] {check.message}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <h3>A08 已完成内容</h3>
          <ul className="helper-list">
            <li>保存时同步产出 `content_json` 与 `content_html`</li>
            <li>顶层正文块自动补齐 `blockId`</li>
            <li>刷新后可从本地草稿恢复 TipTap 文档状态</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
