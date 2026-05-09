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
  type TiptapPatchRecord,
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

  return window.localStorage ?? null;
}

function getPatchLabel(patch: TiptapPatchRecord) {
  const labels: Record<TiptapPatchRecord["operation"], string> = {
    insert_after: "新增",
    delete: "删除",
    replace_text: "替换",
    alt_text: "图片 Alt",
  };

  return labels[patch.operation];
}

function getCheckLabel(level: SeoCheckRecord["checks"][number]["level"]) {
  const labels = {
    error: "Error",
    warning: "Warning",
    passed: "Passed",
  };

  return labels[level];
}

function renderPatchPreview(patch: TiptapPatchRecord) {
  if (patch.operation === "replace_text") {
    return (
      <div className="diff-preview">
        <p className="diff-line diff-remove">
          <span>-</span>
          {patch.old_text ?? "待替换文本"}
        </p>
        <p className="diff-line diff-add">
          <span>+</span>
          {patch.new_text ?? "替换后文本"}
        </p>
      </div>
    );
  }

  if (patch.operation === "insert_after") {
    return (
      <div className="diff-preview">
        <p className="diff-line diff-add">
          <span>+</span>
          {patch.new_text ?? "新增段落"}
        </p>
      </div>
    );
  }

  if (patch.operation === "delete") {
    return (
      <div className="diff-preview">
        <p className="diff-line diff-remove">
          <span>-</span>
          {patch.old_text ?? "待删除文本"}
        </p>
      </div>
    );
  }

  return (
    <div className="diff-preview">
      <p className="diff-line diff-add">
        <span>ALT</span>
        {patch.new_text ?? "图片 Alt 建议"}
      </p>
    </div>
  );
}

export function ArticleEditor({ article }: ArticleEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<DraftState>(() => createDraft(article));
  const [currentArticle, setCurrentArticle] = useState<ArticleRecord>(article);
  const [saveMessage, setSaveMessage] = useState("尚未保存。当前仅写入 Next.js Mock API 和本地草稿。");
  const [suggestions, setSuggestions] = useState<TiptapSuggestionRecord[]>([]);
  const [seoCheck, setSeoCheck] = useState<SeoCheckRecord | null>(null);
  const [reviewMessage, setReviewMessage] = useState("尚未触发 AI 审核。");
  const [publishMessage, setPublishMessage] = useState("尚未执行发布前检查。");
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
  const pendingSuggestions = suggestions.filter((suggestion) => suggestion.status === "pending").length;

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
      setSaveMessage("已恢复浏览器本地草稿。");
    } catch {
      setSaveMessage("检测到本地草稿但恢复失败，已使用 Mock 基础数据。");
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
      [key]: value,
    }));
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

  function readEditorDraft() {
    return normalizeTiptapDocument(editor?.getJSON() ?? draft.content_json);
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const nextContentJson = readEditorDraft();
        const result = await updateArticleDraft(article.article_id, {
          ...draft,
          content_json: nextContentJson,
          content_html: editor?.getHTML() ?? currentArticle.content_html,
        });
        syncArticle(result);
        setSaveMessage(`保存成功：Mock API 返回更新时间 ${new Date(result.updated_at).toLocaleString("zh-CN")}。`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setSaveMessage(`保存失败：${message}`);
      }
    });
  }

  function handleTriggerAiReview() {
    startTransition(async () => {
      try {
        const response = await triggerAiReview(article.article_id);
        setSuggestions(response.suggestions);
        setSeoCheck(null);
        setReviewMessage(`已生成 ${response.suggestions.length} 条 Mock AI 建议，Run ID：${response.run.run_id}。`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setReviewMessage(`AI 审核失败：${message}`);
      }
    });
  }

  function handleAcceptSuggestion(suggestion: TiptapSuggestionRecord, edited: boolean) {
    startTransition(async () => {
      try {
        const nextContentJson = readEditorDraft();
        const response = await acceptSuggestion(suggestion.suggestion_id, {
          content_hash: currentArticle.content_hash ?? "",
          edited,
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
        setReviewMessage(edited ? "已按编辑器当前正文标记为编辑后接受。" : "已接受建议并应用 Mock Patch。");
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
        setReviewMessage("已拒绝该建议，正文保持不变。");
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
            ? `检查可发布：${result.summary.passed} 项通过，${result.summary.warnings} 项警告。`
            : `检查阻断发布：${result.summary.errors} 项 Error，${result.summary.warnings} 项 Warning。`
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
        setPublishMessage(
          response.seo_check.summary.can_publish
            ? "Mock 发布完成。真实发布仍需 Django API 和 SEO 渲染闭环落地。"
            : "存在 Error，Mock 发布被阻断。"
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setPublishMessage(`发布失败：${message}`);
      }
    });
  }

  return (
    <div className="editor-workspace">
      <section className="panel editor-panel">
        <div className="editor-toolbar">
          <div>
            <span className="section-kicker">内容编辑</span>
            <h2>结构化文章草稿</h2>
            <p>保存时规范化为 TipTap v1 文档，并为可 Patch 的块保留 `blockId`。</p>
          </div>
          <button className="cta primary" onClick={handleSave} type="button">
            {isPending ? "处理中..." : "保存草稿"}
          </button>
        </div>

        <div className="form-grid two">
          <div className="field">
            <label className="field-label" htmlFor="title">
              标题
            </label>
            <input id="title" onChange={(event) => updateField("title", event.target.value)} value={draft.title} />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="slug">
              Slug
            </label>
            <input id="slug" onChange={(event) => updateField("slug", event.target.value)} value={draft.slug} />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="summary">
            摘要
          </label>
          <textarea id="summary" onChange={(event) => updateField("summary", event.target.value)} value={draft.summary} />
        </div>

        <div className="form-grid two">
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
            <label className="field-label">分类与标签</label>
            <div className="readonly-field">
              {currentArticle.category?.name ?? "未设置分类"} / {currentArticle.tags.map((tag) => tag.name).join("、") || "无标签"}
            </div>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="content">
            正文内容
          </label>
          <div className="tiptap-shell">
            <div className="tiptap-toolbar" role="toolbar" aria-label="编辑器工具栏">
              <button className="toolbar-chip" onClick={() => editor?.chain().focus().toggleBold().run()} type="button">
                加粗
              </button>
              <button className="toolbar-chip" onClick={() => editor?.chain().focus().toggleItalic().run()} type="button">
                斜体
              </button>
              <button className="toolbar-chip" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} type="button">
                H2
              </button>
              <button className="toolbar-chip" onClick={() => editor?.chain().focus().toggleBulletList().run()} type="button">
                无序列表
              </button>
              <button className="toolbar-chip" onClick={() => editor?.chain().focus().toggleOrderedList().run()} type="button">
                有序列表
              </button>
            </div>
            <EditorContent editor={editor} id="content" />
          </div>
          <small>当前没有接媒体库、FAQ 独立接口、分类标签管理 API；相关 UI 只保留入口说明。</small>
        </div>

        <div className="editor-status">{saveMessage}</div>
      </section>

      <aside className="side-stack">
        <section className="panel compact-panel">
          <span className={`status-pill status-${currentArticle.status}`}>{currentArticle.status}</span>
          <h2>文章状态</h2>
          <dl className="meta-grid">
            <div>
              <dt>Article ID</dt>
              <dd>{currentArticle.article_id}</dd>
            </div>
            <div>
              <dt>正文块</dt>
              <dd>{draft.content_json.content.length}</dd>
            </div>
            <div>
              <dt>正文字符</dt>
              <dd>{contentText.length}</dd>
            </div>
            <div>
              <dt>待处理建议</dt>
              <dd>{pendingSuggestions}</dd>
            </div>
          </dl>
          <p className="caption">Content Hash：{currentArticle.content_hash ?? "待生成"}</p>
        </section>

        <section className="panel compact-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">AI 审核</span>
              <h2>建议与 Diff</h2>
            </div>
            <button className="cta" onClick={handleTriggerAiReview} type="button">
              {isPending ? "处理中..." : "触发 Mock 审核"}
            </button>
          </div>
          <p>{reviewMessage}</p>
          <div className="suggestion-list">
            {suggestions.length === 0 ? (
              <div className="empty-state">
                <strong>暂无 AI 建议</strong>
                <p>点击触发 Mock 审核后，会展示正文替换、新增和 Metadata 建议。</p>
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <article className="suggestion-card" key={suggestion.suggestion_id}>
                  <div className="article-card-head">
                    <span className={`status-pill status-${suggestion.status}`}>{suggestion.status}</span>
                    <span className={`severity severity-${suggestion.severity}`}>{suggestion.severity}</span>
                  </div>
                  <h3>{suggestion.title}</h3>
                  <p>{suggestion.reason}</p>
                  {suggestion.patches.length > 0 ? (
                    suggestion.patches.map((patch) => (
                      <div className="patch-block" key={patch.patch_id}>
                        <div className="patch-meta">
                          <span>{getPatchLabel(patch)}</span>
                          <code>{patch.target_block_id}</code>
                        </div>
                        {renderPatchPreview(patch)}
                        <p className="caption">{patch.reason}</p>
                      </div>
                    ))
                  ) : (
                    <div className="payload-box">
                      <strong>Metadata Payload</strong>
                      <pre>{JSON.stringify(suggestion.payload ?? {}, null, 2)}</pre>
                    </div>
                  )}
                  {suggestion.source_chunks.length > 0 ? (
                    <div className="source-list">
                      {suggestion.source_chunks.map((chunk) => (
                        <span key={chunk.chunk_id}>
                          来源：{chunk.title} / score {chunk.score}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="cta-row">
                    <button
                      className="cta primary"
                      disabled={suggestion.status !== "pending"}
                      onClick={() => handleAcceptSuggestion(suggestion, false)}
                      type="button"
                    >
                      接受
                    </button>
                    <button
                      className="cta"
                      disabled={suggestion.status !== "pending"}
                      onClick={() => handleAcceptSuggestion(suggestion, true)}
                      type="button"
                    >
                      编辑后接受
                    </button>
                    <button
                      className="cta"
                      disabled={suggestion.status !== "pending"}
                      onClick={() => handleRejectSuggestion(suggestion)}
                      type="button"
                    >
                      拒绝
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel compact-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">发布前检查</span>
              <h2>Error 阻断，Warning 提醒</h2>
            </div>
          </div>
          <div className="cta-row">
            <button className="cta" onClick={handleSeoCheck} type="button">
              执行检查
            </button>
            <button className="cta primary" disabled={seoCheck !== null && !seoCheck.summary.can_publish} onClick={handlePublish} type="button">
              Mock 发布
            </button>
          </div>
          <p>{publishMessage}</p>
          {seoCheck ? (
            <div className="check-list">
              {seoCheck.checks.map((check) => (
                <div className={`check-row check-${check.level}`} key={check.code}>
                  <strong>{getCheckLabel(check.level)}</strong>
                  <span>{check.message}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
