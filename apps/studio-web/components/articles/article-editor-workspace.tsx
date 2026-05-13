"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  fetchCategorySuggestions,
  fetchMediaLibraryImages,
  fetchTagSuggestions,
  publishArticle,
  type MediaLibraryImageRecord,
  updateArticleDraft,
} from "../../lib/api-client";
import {
  fetchAiReviewRunSuggestions,
  fetchArticleAiReviewRuns,
  generateDescription,
  generateSlug,
  generateTags,
  generateTitle,
  type AiReviewSuggestionRecord,
  type AiPatchRecord,
} from "../../lib/ai-review";
import { studioProxyPath } from "../../lib/routes";
import {
  type ArticleRecord,
  type ArticleStatus,
} from "../../lib/mock-api";
import type { DjangoArticleCategoryOption, DjangoArticleTag } from "../../lib/articles";
import { TipTapEditor } from "./tiptap-editor";
import { BLOCK_ID_PATTERN, type EditorPatch, type TipTapDocument } from "@cms/editor-protocol";

type ArticleEditorWorkspaceProps = {
  article: ArticleRecord;
  embedded?: boolean;
  showPublishAction?: boolean;
  onSaveDraft?: (payload: Partial<ArticleRecord>) => Promise<ArticleRecord>;
  onPublish?: (payload: Partial<ArticleRecord>) => Promise<ArticleRecord>;
};

type DraftState = {
  title: string;
  metaDescription: string;
  slug: string;
  category: DjangoArticleCategoryOption | null;
  tags: DjangoArticleTag[];
  content_json: TipTapDocument;
  status: ArticleStatus;
  seoMetaTitle: string;
  seoMetaKeywords: string;
  canonicalUrl: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: MediaLibraryImageRecord | null;
  faqItems: Array<{
    question: string;
    answer: string;
    sort_order: number;
  }>;
};

type ReviewState = {
  status: "idle" | "loading" | "loaded" | "error";
  message: string;
  runId: string;
  suggestions: AiReviewSuggestionRecord[];
};

type GenerationTarget = "title" | "slug" | "description" | "tags";

function normalizeTagName(value: string) {
  return value.trim().replaceAll(/\s+/g, " ");
}

function normalizeCategoryName(value: string) {
  return value.trim().replaceAll(/\s+/g, " ");
}

function dedupeTags(tags: DjangoArticleTag[]) {
  const seen = new Set<string>();
  const normalized: DjangoArticleTag[] = [];
  for (const tag of tags) {
    const key = normalizeTagName(tag.name).toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(tag);
  }
  return normalized;
}

function createInlineTag(name: string): DjangoArticleTag {
  const normalized = normalizeTagName(name);
  return {
    tag_id: 0,
    name: normalized,
    slug: normalized.toLowerCase(),
  };
}

function stripHtml(value: string) {
  return value.replaceAll(/<[^>]+>/g, "").trim();
}

function formatStudioDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function createDraft(article: ArticleRecord): DraftState {
  return {
    title: article.title,
    metaDescription: article.summary,
    slug: article.slug,
    category: article.category,
    tags: dedupeTags(article.tags ?? []),
    content_json: createFallbackDocument(article),
    status: article.status,
    seoMetaTitle: article.seo?.meta_title ?? "",
    seoMetaKeywords: article.seo?.meta_keywords ?? "",
    canonicalUrl: article.seo?.canonical_url ?? "",
    robots: article.seo?.robots ?? "index,follow",
    ogTitle: article.seo?.og_title ?? "",
    ogDescription: article.seo?.og_description ?? "",
    ogImage: article.seo?.og_image
      ? {
          image_id: article.seo.og_image.image_id,
          title: article.seo.og_image.title,
          alt_text: article.seo.og_image.alt_text,
          file_url: article.seo.og_image.file_url,
          uploaded_at: "",
        }
      : null,
    faqItems:
      article.faq_items?.map((item, index) => ({
        question: item.question ?? "",
        answer: item.answer ?? "",
        sort_order: item.sort_order ?? index + 1,
      })) ?? [],
  };
}

function getReviewSummaryLabel(count: number) {
  return count > 0 ? `${count} 条真实建议` : "暂无真实建议";
}

function createFallbackDocument(article: ArticleRecord) {
  if (Array.isArray(article.content_json?.content) && article.content_json.content.length > 0) {
    return article.content_json as unknown as TipTapDocument;
  }

  const fallbackDocument: TipTapDocument = {
    type: "doc" as const,
    content: [
      {
        type: "paragraph" as const,
        attrs: {
          blockId: `blk_${article.article_id}_1`,
        },
        content: [
          {
            type: "text" as const,
            text: stripHtml(article.content_html),
          },
        ],
      },
    ],
  };

  return fallbackDocument;
}

function normalizeBlockIds(document: TipTapDocument) {
  const safeDocument: TipTapDocument = {
    type: document?.type ?? "doc",
    content: Array.isArray(document?.content) ? document.content : [],
  };
  let blockIndex = 1;

  return {
    ...safeDocument,
    content: (safeDocument.content ?? []).map((node) => {
      if (!node || typeof node !== "object") {
        return node;
      }

      const currentAttrs = (node as { attrs?: { blockId?: string } }).attrs ?? {};
      const existingBlockId = currentAttrs.blockId;
      if (existingBlockId && BLOCK_ID_PATTERN.test(existingBlockId)) {
        return node;
      }

      const nextBlockId = `blk_${blockIndex}`;
      blockIndex += 1;
      return {
        ...node,
        attrs: {
          ...currentAttrs,
          blockId: nextBlockId,
        },
      };
    }),
  } as TipTapDocument;
}

function collectOutlineItems(document: TipTapDocument) {
  return (document.content ?? [])
    .map((node, index) => {
      const typedNode = node as {
        type?: string;
        attrs?: { level?: number; blockId?: string };
        content?: Array<{ text?: string }>;
      };
      if (typedNode.type !== "heading") {
        return null;
      }

      const text = (typedNode.content ?? [])
        .map((child) => child.text ?? "")
        .join("")
        .trim();

      return {
        id: typedNode.attrs?.blockId ?? `heading-${index + 1}`,
        level: typedNode.attrs?.level ?? 2,
        text: text || `未命名标题 ${index + 1}`,
      };
    })
    .filter((item): item is { id: string; level: number; text: string } => Boolean(item));
}

function documentToHtml(document: TipTapDocument) {
  type SerializableNode = {
    type?: string;
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
    content?: SerializableNode[];
  };

  function normalizeImageDimension(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.round(value);
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = Number.parseFloat(trimmed.replace(/px$/i, ""));
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.round(parsed);
      }
    }
    return null;
  }

  function buildImageAttributeString(attrs?: Record<string, unknown>) {
    const width = normalizeImageDimension(attrs?.width);
    const height = normalizeImageDimension(attrs?.height);
    const htmlAttributes = [];

    if (width !== null) {
      htmlAttributes.push(`width="${width}"`);
    }
    if (height !== null) {
      htmlAttributes.push(`height="${height}"`);
    }
    if (width !== null || height !== null) {
      const styleTokens = [];
      if (width !== null) {
        styleTokens.push(`width:${width}px`);
      }
      if (height !== null) {
        styleTokens.push(`height:${height}px`);
      }
      htmlAttributes.push(`style="${styleTokens.join(";")};max-width:100%;"`);
    }

    return htmlAttributes.length > 0 ? ` ${htmlAttributes.join(" ")}` : "";
  }

  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderNode(node: SerializableNode): string {
    if (!node?.type) {
      return "";
    }

    if (node.type === "text") {
      let text = escapeHtml(node.text ?? "");
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") {
          text = `<strong>${text}</strong>`;
          continue;
        }
        if (mark.type === "italic") {
          text = `<em>${text}</em>`;
          continue;
        }
        if (mark.type === "underline") {
          text = `<u>${text}</u>`;
          continue;
        }
        if (mark.type === "strike") {
          text = `<s>${text}</s>`;
          continue;
        }
        if (mark.type === "highlight") {
          text = `<mark>${text}</mark>`;
          continue;
        }
        if (mark.type === "code") {
          text = `<code>${text}</code>`;
          continue;
        }
        if (mark.type === "link") {
          const href = typeof mark.attrs?.href === "string" ? escapeHtml(mark.attrs.href) : "#";
          text = `<a href="${href}" target="_blank" rel="noreferrer">${text}</a>`;
        }
      }
      return text;
    }

    const children = (node.content ?? []).map((child) => renderNode(child)).join("");
    if (node.type === "paragraph") {
      return `<p>${children}</p>`;
    }
    if (node.type === "heading") {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 2;
      return `<h${level}>${children}</h${level}>`;
    }
    if (node.type === "bulletList") {
      const items = (node.content ?? [])
        .map((item) => `<li>${(item.content ?? []).map((child) => renderNode(child)).join("")}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
    if (node.type === "orderedList") {
      const items = (node.content ?? [])
        .map((item) => `<li>${(item.content ?? []).map((child) => renderNode(child)).join("")}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    }
    if (node.type === "blockquote") {
      return `<blockquote>${children}</blockquote>`;
    }
    if (node.type === "codeBlock") {
      return `<pre><code>${children}</code></pre>`;
    }
    if (node.type === "horizontalRule") {
      return "<hr />";
    }
    if (node.type === "image") {
      const src = typeof node.attrs?.src === "string" ? escapeHtml(node.attrs.src) : "";
      const alt = typeof node.attrs?.alt === "string" ? escapeHtml(node.attrs.alt) : "";
      const dimensionAttributes = buildImageAttributeString(node.attrs);
      return src ? `<figure><img src="${src}" alt="${alt}"${dimensionAttributes} /></figure>` : "";
    }

    return children;
  }

  return document.content.map((node) => renderNode(node as SerializableNode)).join("");
}

function toEditorPatch(patch: AiPatchRecord): EditorPatch | null {
  if (patch.patch_schema_version !== "v1") {
    return null;
  }

  return {
    patch_id: patch.patch_id,
    patch_schema_version: patch.patch_schema_version,
    operation: patch.operation,
    target_block_id: patch.target_block_id,
    old_text: patch.old_text ?? null,
    new_text: patch.new_text ?? null,
    new_block: patch.new_block as EditorPatch["new_block"],
    position: patch.position ?? null,
    content_hash: patch.content_hash,
    reason: patch.reason ?? null,
  };
}

export function ArticleEditorWorkspace({
  article,
  embedded = false,
  showPublishAction = false,
  onSaveDraft,
  onPublish,
}: ArticleEditorWorkspaceProps) {
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<"save" | "publish" | null>(null);
  const [activeGenerationTarget, setActiveGenerationTarget] = useState<GenerationTarget | null>(null);
  const [htmlMode, setHtmlMode] = useState(false);
  const [articleSnapshot, setArticleSnapshot] = useState(article);
  const [draft, setDraft] = useState<DraftState>(() => createDraft(article));
  const [categoryInput, setCategoryInput] = useState(article.category?.name ?? "");
  const [categorySuggestions, setCategorySuggestions] = useState<DjangoArticleCategoryOption[]>([]);
  const [categorySuggestionOpen, setCategorySuggestionOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<DjangoArticleTag[]>([]);
  const [tagSuggestionOpen, setTagSuggestionOpen] = useState(false);
  const [showOgImagePicker, setShowOgImagePicker] = useState(false);
  const [ogImageLibrary, setOgImageLibrary] = useState<MediaLibraryImageRecord[]>([]);
  const [ogImageLibraryStatus, setOgImageLibraryStatus] = useState("");
  const [navigationRequest, setNavigationRequest] = useState<{ blockId: string; nonce: number } | null>(null);
  const [activeOutlineBlockId, setActiveOutlineBlockId] = useState<string | null>(null);
  const editorDocumentGetterRef = useRef<null | (() => TipTapDocument)>(null);
  const editorDocumentRef = useRef<TipTapDocument | null>(createDraft(article).content_json);
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const categoryInputRef = useRef<HTMLInputElement | null>(null);
  const [saveMessage, setSaveMessage] = useState("当前内容尚未提交到 Django。");
  const [saveTime, setSaveTime] = useState(article.updated_at);
  const [reviewState, setReviewState] = useState<ReviewState>({
    status: "idle",
    message: "尚未触发 AI 审核。",
    runId: "",
    suggestions: [],
  });
  const hasPersistedArticle = article.article_id > 0;
  const wordCount = JSON.stringify(draft.content_json).length;
  const readTime = Math.max(1, Math.round(wordCount / 350));
  const reviewSummary = getReviewSummaryLabel(reviewState.suggestions.length);
  const hasDraftChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(createDraft(articleSnapshot)),
    [articleSnapshot, draft],
  );
  const normalizedContentDocument = useMemo(() => normalizeBlockIds(draft.content_json), [draft.content_json]);
  const outlineItems = useMemo(() => collectOutlineItems(normalizedContentDocument), [normalizedContentDocument]);

  useEffect(() => {
    if (outlineItems.length === 0) {
      setActiveOutlineBlockId(null);
      return;
    }

    setActiveOutlineBlockId((currentValue) => {
      if (currentValue && outlineItems.some((item) => item.id === currentValue)) {
        return currentValue;
      }
      return outlineItems[0]?.id ?? null;
    });
  }, [outlineItems]);

  useEffect(() => {
    setArticleSnapshot(article);
  }, [article]);

  useEffect(() => {
    setDraft(createDraft(articleSnapshot));
    setCategoryInput(articleSnapshot.category?.name ?? "");
    setCategorySuggestions([]);
    setCategorySuggestionOpen(false);
    setTagInput("");
    setTagSuggestionOpen(false);
    setSaveTime(articleSnapshot.updated_at);
    setSaveMessage("已加载 Django 最新文章内容。");
  }, [articleSnapshot]);

  useEffect(() => {
    if (!showOgImagePicker) {
      return;
    }

    let cancelled = false;
    setOgImageLibraryStatus("正在加载媒体库...");
    void fetchMediaLibraryImages()
      .then((images) => {
        if (cancelled) {
          return;
        }
        setOgImageLibrary(images);
        setOgImageLibraryStatus(images.length > 0 ? "" : "媒体库暂无图片。");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "未知错误";
        setOgImageLibraryStatus(`媒体库加载失败：${message}`);
      });

    return () => {
      cancelled = true;
    };
  }, [hasPersistedArticle, showOgImagePicker]);

  useEffect(() => {
    if (!hasPersistedArticle) {
      setReviewState({
        status: "idle",
        message: "文章创建后才可触发 AI 审核。",
        runId: "",
        suggestions: [],
      });
      return;
    }

    let cancelled = false;
    void fetchCategorySuggestions(normalizeCategoryName(categoryInput))
      .then((items) => {
        if (cancelled) {
          return;
        }
        const currentId = draft.category?.category_id;
        const currentName = normalizeCategoryName(draft.category?.name ?? "").toLowerCase();
        setCategorySuggestions(
          items.filter((item) => {
            if (currentId && item.category_id === currentId) {
              return false;
            }
            return normalizeCategoryName(item.name).toLowerCase() !== currentName;
          }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setCategorySuggestions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [categoryInput, draft.category]);

  useEffect(() => {
    let cancelled = false;
    void fetchTagSuggestions(normalizeTagName(tagInput))
      .then((items) => {
        if (cancelled) {
          return;
        }
        const selectedKeys = new Set(draft.tags.map((tag) => normalizeTagName(tag.name).toLowerCase()));
        setTagSuggestions(items.filter((tag) => !selectedKeys.has(normalizeTagName(tag.name).toLowerCase())));
      })
      .catch(() => {
        if (!cancelled) {
          setTagSuggestions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [draft.tags, tagInput]);

  useEffect(() => {
    if (!embedded || typeof window === "undefined") {
      return;
    }

    const postHeight = () => {
      window.parent.postMessage(
        {
          type: "next-editor-resize",
          height: document.documentElement.scrollHeight,
        },
        "*",
      );
    };

    postHeight();
    const timeout = window.setTimeout(postHeight, 120);
    window.addEventListener("resize", postHeight);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", postHeight);
    };
  }, [draft, embedded]);

  useEffect(() => {
    let cancelled = false;

    async function loadLatestReview(pollAttempt = 0) {
      try {
        const runs = await fetchArticleAiReviewRuns(article.article_id);
        const latestRun = runs[0];
        if (!latestRun) {
          if (!cancelled) {
            setReviewState({
              status: "idle",
              message: "尚未触发 AI 审核。",
              runId: "",
              suggestions: [],
            });
          }
          return;
        }

        if ((latestRun.status === "pending" || latestRun.status === "running") && pollAttempt < 10) {
          if (!cancelled) {
            setReviewState({
              status: "loading",
              message: `AI 审核任务已创建，正在等待 worker 消费...（${latestRun.status}）`,
              runId: latestRun.run_id,
              suggestions: [],
            });
            window.setTimeout(() => {
              void loadLatestReview(pollAttempt + 1);
            }, 1500);
          }
          return;
        }

        const suggestions = await fetchAiReviewRunSuggestions(latestRun.run_id).catch(() => []);
        if (!cancelled) {
          setReviewState({
            status: "loaded",
            message: "已加载最近一次真实 AI 审核结果。",
            runId: latestRun.run_id,
            suggestions,
          });
        }
      } catch {
        if (!cancelled) {
          setReviewState((current) =>
            current.status === "loaded"
              ? current
              : {
                  status: "error",
                  message: "读取历史 AI 审核结果失败。",
                  runId: "",
                  suggestions: [],
                },
          );
        }
      }
    }

    void loadLatestReview();

    return () => {
      cancelled = true;
    };
  }, [article.article_id, hasPersistedArticle]);

  function updateField<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    if (key === "content_json") {
      editorDocumentRef.current = value as TipTapDocument;
    }
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setSaveMessage("检测到未保存修改，请提交到 Django。");
  }

  function updateTags(nextTags: DjangoArticleTag[]) {
    updateField("tags", dedupeTags(nextTags));
  }

  function selectCategory(category: DjangoArticleCategoryOption | null, fallbackName = "") {
    updateField("category", category);
    setCategoryInput(category?.name ?? normalizeCategoryName(fallbackName));
    setCategorySuggestionOpen(false);
  }

  function clearCategory() {
    selectCategory(null, "");
  }

  function commitCategoryInput() {
    const normalized = normalizeCategoryName(categoryInput);
    if (!normalized) {
      clearCategory();
      return;
    }
    const existingCategory = categorySuggestions.find(
      (item) => normalizeCategoryName(item.name).toLowerCase() === normalized.toLowerCase(),
    );
    if (existingCategory) {
      selectCategory(existingCategory);
      return;
    }
    selectCategory(null, normalized);
  }

  function addTagByName(rawName: string) {
    const normalized = normalizeTagName(rawName);
    if (!normalized) {
      return;
    }
    const existingTag = tagSuggestions.find(
      (item) => normalizeTagName(item.name).toLowerCase() === normalized.toLowerCase(),
    );
    updateTags([...draft.tags, existingTag ?? createInlineTag(normalized)]);
    setTagInput("");
    setTagSuggestionOpen(false);
  }

  function removeTag(name: string) {
    const normalized = normalizeTagName(name).toLowerCase();
    updateTags(draft.tags.filter((tag) => normalizeTagName(tag.name).toLowerCase() !== normalized));
  }

  function addFaqItem() {
    updateField("faqItems", [
      ...draft.faqItems,
      {
        question: "",
        answer: "",
        sort_order: draft.faqItems.length + 1,
      },
    ]);
  }

  function updateFaqItem(index: number, key: "question" | "answer", value: string) {
    updateField(
      "faqItems",
      draft.faqItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  }

  function removeFaqItem(index: number) {
    updateField(
      "faqItems",
      draft.faqItems
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({
          ...item,
          sort_order: itemIndex + 1,
        })),
    );
  }

  function selectOgImage(image: MediaLibraryImageRecord) {
    updateField("ogImage", image);
    setShowOgImagePicker(false);
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTagByName(tagInput);
      return;
    }
    if (event.key === "Backspace" && !tagInput && draft.tags.length > 0) {
      event.preventDefault();
      removeTag(draft.tags[draft.tags.length - 1].name);
    }
  }

  function handleCategoryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitCategoryInput();
      return;
    }
    if (event.key === "Backspace" && !categoryInput && draft.category) {
      event.preventDefault();
      clearCategory();
    }
  }

  function buildPersistPayload(status: ArticleStatus) {
    const latestDocument =
      editorDocumentGetterRef.current?.() ??
      editorDocumentRef.current ??
      draft.content_json;

    return {
      ...article,
      title: draft.title,
      summary: draft.metaDescription,
      meta_description: draft.metaDescription,
      slug: draft.slug,
      status,
      category_id: draft.category?.category_id ?? null,
      category_name: draft.category?.name ?? normalizeCategoryName(categoryInput),
      tag_names: draft.tags.map((tag) => tag.name),
      content_json: latestDocument,
      content_html: documentToHtml(latestDocument),
      meta_title: draft.seoMetaTitle,
      meta_keywords: draft.seoMetaKeywords,
      canonical_url: draft.canonicalUrl,
      robots: draft.robots,
      og_title: draft.ogTitle,
      og_description: draft.ogDescription,
      og_image_id: draft.ogImage?.image_id ?? null,
      faq_items: draft.faqItems
        .map((item, index) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
          sort_order: index + 1,
        }))
        .filter((item) => item.question || item.answer),
    } as Partial<ArticleRecord>;
  }

  function applyPersistedResult(result: ArticleRecord, successMessage: string) {
    setArticleSnapshot(result);
    setDraft((currentDraft) => ({
      ...currentDraft,
      title: result.title,
      metaDescription: result.summary,
      slug: result.slug,
      status: result.status,
      category: result.category,
      tags: dedupeTags(result.tags ?? []),
      content_json:
        Array.isArray(result.content_json?.content) && result.content_json.content.length > 0
          ? (result.content_json as TipTapDocument)
          : currentDraft.content_json,
      seoMetaTitle: result.seo?.meta_title ?? "",
      seoMetaKeywords: result.seo?.meta_keywords ?? "",
      canonicalUrl: result.seo?.canonical_url ?? "",
      robots: result.seo?.robots ?? "index,follow",
      ogTitle: result.seo?.og_title ?? "",
      ogDescription: result.seo?.og_description ?? "",
      ogImage: result.seo?.og_image
        ? {
            image_id: result.seo.og_image.image_id,
            title: result.seo.og_image.title,
            alt_text: result.seo.og_image.alt_text,
            file_url: result.seo.og_image.file_url,
            uploaded_at: "",
          }
        : null,
      faqItems:
        result.faq_items?.map((item, index) => ({
          question: item.question,
          answer: item.answer,
          sort_order: item.sort_order ?? index + 1,
        })) ?? [],
    }));
    setCategoryInput(result.category?.name ?? "");
    setSaveTime(result.updated_at);
    setSaveMessage(successMessage);
  }

  function handleSave() {
    startTransition(async () => {
      setActiveAction("save");
      try {
        const payload = buildPersistPayload("draft");
        const result = onSaveDraft
          ? await onSaveDraft(payload)
          : await updateArticleDraft(article.article_id, payload);
        applyPersistedResult(result, "草稿已保存到 Django。");
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setSaveMessage(`保存失败：${message}`);
      } finally {
        setActiveAction(null);
      }
    });
  }

  function handlePublish() {
    startTransition(async () => {
      setActiveAction("publish");
      try {
        const payload = buildPersistPayload("draft");
        let result: ArticleRecord;
        if (onPublish) {
          result = await onPublish(payload);
        } else {
          const savedDraft = await updateArticleDraft(article.article_id, payload);
          const published = await publishArticle(savedDraft.article_id);
          result = published.article;
        }
        applyPersistedResult(result, "文章已发布到 Django。");
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        setSaveMessage(`发布失败：${message}`);
      } finally {
        setActiveAction(null);
      }
    });
  }

  function buildGenerationPayload() {
    return {
      title: draft.title,
      summary: draft.metaDescription,
      meta_description: draft.metaDescription,
      slug: draft.slug,
      status: draft.status,
      category_id: draft.category?.category_id ?? null,
      category_name: draft.category?.name ?? normalizeCategoryName(categoryInput),
      tag_names: draft.tags.map((tag) => tag.name),
      content_json: draft.content_json,
      content_html: documentToHtml(draft.content_json),
    };
  }

  async function handleGenerateField(target: GenerationTarget) {
    if (!hasPersistedArticle) {
      setSaveMessage("请先保存草稿，再使用 AI 生成功能。");
      return;
    }

    const actionLabelMap: Record<GenerationTarget, string> = {
      title: "标题",
      slug: "Slug",
      description: "描述",
      tags: "标签",
    };
    const actionLabel = actionLabelMap[target];

    if (activeGenerationTarget) {
      return;
    }

    setActiveGenerationTarget(target);

    try {
      if (target === "title") {
        const result = await generateTitle(article.article_id, buildGenerationPayload());
        const nextTitle = result.titles[0]?.text?.trim();
        if (nextTitle) {
          setDraft((current) => ({ ...current, title: nextTitle }));
          setSaveMessage("AI 已生成新的标题，请确认后保存到 Django。");
        }
        return;
      }

      if (target === "slug") {
        const result = await generateSlug(article.article_id, buildGenerationPayload());
        const nextSlug = result.slugs[0]?.text?.trim();
        if (nextSlug) {
          setDraft((current) => ({ ...current, slug: nextSlug }));
          setSaveMessage("AI 已生成新的 Slug，请确认后保存到 Django。");
        }
        return;
      }

      if (target === "description") {
        const result = await generateDescription(article.article_id, buildGenerationPayload());
        const nextDescription = result.descriptions[0]?.text?.trim();
        if (nextDescription) {
          setDraft((current) => ({ ...current, metaDescription: nextDescription }));
          setSaveMessage("AI 已生成新的描述，请确认后保存到 Django。");
        }
        return;
      }

      const result = await generateTags(article.article_id, buildGenerationPayload());
      const nextTags = result.tags
        .map((item) => normalizeTagName(item.name ?? ""))
        .filter((item): item is string => Boolean(item))
        .map((item) => createInlineTag(item));
      if (nextTags.length > 0) {
        setDraft((current) => ({ ...current, tags: dedupeTags(nextTags) }));
        setSaveMessage("AI 已生成新的标签，请确认后保存到 Django。");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setSaveMessage(`AI ${actionLabel} 生成失败：${message}`);
    } finally {
      setActiveGenerationTarget(null);
    }
  }

  const activePatch = reviewState.suggestions[0]?.patches?.[0]
    ? toEditorPatch(reviewState.suggestions[0].patches[0] as AiPatchRecord)
    : null;

  return (
    <div className={`editor-workspace${embedded ? " embedded" : ""}`}>
      <header className="word-titlebar">
        <div className="word-titlebar-left">
          <div className="word-app-mark">W</div>
          <div className="word-titlebar-copy">
            <strong>{draft.title || "未命名文档"}</strong>
            <span>cms-editor-web</span>
          </div>
        </div>
        <div className="word-titlebar-right">
          <button className="word-window-button" type="button">
            返回列表
          </button>
          <button className="word-window-button" type="button">
            JSON
          </button>
          <Link className="word-window-button" href="/studio/articles">
            列表
          </Link>
          <a
            className="word-window-button"
            href={studioProxyPath(`/api/articles/${article.article_id}`)}
            target="_blank"
            rel="noreferrer"
          >
            Django
          </a>
        </div>
      </header>

      <div className="word-workspace">
        <aside className="word-sidebar">
          <div className="word-sidebar-section">
            <div className="word-sidebar-title">文档导航</div>
            <div className="word-outline-list">
              {outlineItems.length > 0 ? (
                outlineItems.map((item) => (
                  <button
                    key={item.id}
                    className={`word-outline-item level-${item.level}${activeOutlineBlockId === item.id ? " is-active" : ""}`}
                    onClick={() =>
                      {
                        setActiveOutlineBlockId(item.id);
                        setNavigationRequest({
                          blockId: item.id,
                          nonce: Date.now(),
                        });
                      }
                    }
                    type="button"
                  >
                    {item.text}
                  </button>
                ))
              ) : (
                <div className="word-outline-empty">暂无标题，插入 H1/H2/H3 后显示目录。</div>
              )}
            </div>
          </div>
          <div className="word-sidebar-section">
            <div className="word-sidebar-title">文档信息</div>
            <div className="word-info-grid">
              <span>文章 ID</span>
              <strong>{article.article_id}</strong>
              <span>状态</span>
              <strong>{draft.status}</strong>
              <span>同步</span>
              <strong>{hasDraftChanges ? "未保存" : "已同步"}</strong>
              <span>更新</span>
              <strong>{formatStudioDateTime(saveTime)}</strong>
            </div>
          </div>
          <div className="word-sidebar-section">
            <div className="word-sidebar-title">SEO 与 FAQ</div>
            <div className="word-sidebar-form">
              <label className="word-sidebar-field">
                <span>Meta Title</span>
                <input
                  onChange={(event) => updateField("seoMetaTitle", event.target.value)}
                  value={draft.seoMetaTitle}
                />
              </label>
              <label className="word-sidebar-field">
                <span>Canonical</span>
                <input
                  onChange={(event) => updateField("canonicalUrl", event.target.value)}
                  placeholder="留空则自动回退公开 URL"
                  value={draft.canonicalUrl}
                />
              </label>
              <label className="word-sidebar-field">
                <span>Robots</span>
                <input
                  onChange={(event) => updateField("robots", event.target.value)}
                  value={draft.robots}
                />
              </label>
              <label className="word-sidebar-field">
                <span>Meta Keywords</span>
                <textarea
                  onChange={(event) => updateField("seoMetaKeywords", event.target.value)}
                  rows={2}
                  value={draft.seoMetaKeywords}
                />
              </label>
              <label className="word-sidebar-field">
                <span>OG Title</span>
                <input
                  onChange={(event) => updateField("ogTitle", event.target.value)}
                  value={draft.ogTitle}
                />
              </label>
              <label className="word-sidebar-field">
                <span>OG Description</span>
                <textarea
                  onChange={(event) => updateField("ogDescription", event.target.value)}
                  rows={3}
                  value={draft.ogDescription}
                />
              </label>
              <div className="word-sidebar-field">
                <span>OG Image</span>
                <div className="word-sidebar-media-picker">
                  {draft.ogImage ? (
                    <div className="word-sidebar-media-card">
                      <img alt={draft.ogImage.alt_text || draft.ogImage.title} src={draft.ogImage.file_url} />
                      <div>
                        <strong>{draft.ogImage.title || `图片 ${draft.ogImage.image_id}`}</strong>
                        <small>{draft.ogImage.alt_text || "未填写 alt"}</small>
                      </div>
                    </div>
                  ) : (
                    <div className="word-sidebar-media-empty">未选择 OG 图片</div>
                  )}
                  <div className="word-sidebar-inline-actions">
                    <button className="word-sidebar-mini-button" onClick={() => setShowOgImagePicker(true)} type="button">
                      从媒体库选择
                    </button>
                    {draft.ogImage ? (
                      <button
                        className="word-sidebar-mini-button is-muted"
                        onClick={() => updateField("ogImage", null)}
                        type="button"
                      >
                        清除
                      </button>
                    ) : null}
                  </div>
                  {showOgImagePicker ? (
                    <div className="word-sidebar-media-modal">
                      <div className="word-sidebar-media-modal-head">
                        <strong>选择 OG 图片</strong>
                        <button className="word-sidebar-mini-button is-muted" onClick={() => setShowOgImagePicker(false)} type="button">
                          关闭
                        </button>
                      </div>
                      {ogImageLibraryStatus ? <div className="word-sidebar-media-status">{ogImageLibraryStatus}</div> : null}
                      <div className="word-sidebar-media-grid">
                        {ogImageLibrary.map((image) => (
                          <button
                            className="word-sidebar-media-option"
                            key={image.image_id}
                            onClick={() => selectOgImage(image)}
                            type="button"
                          >
                            <img alt={image.alt_text || image.title} src={image.file_url} />
                            <strong>{image.title || `图片 ${image.image_id}`}</strong>
                            <small>{image.alt_text || "未填写 alt"}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="word-sidebar-field">
                <div className="word-sidebar-field-row">
                  <span>FAQ</span>
                  <button className="word-sidebar-mini-button" onClick={addFaqItem} type="button">
                    新增
                  </button>
                </div>
                <div className="word-sidebar-faq-list">
                  {draft.faqItems.length === 0 ? <div className="word-sidebar-faq-empty">暂无 FAQ</div> : null}
                  {draft.faqItems.map((item, index) => (
                    <div className="word-sidebar-faq-card" key={`faq-${index + 1}`}>
                      <div className="word-sidebar-field-row">
                        <strong>FAQ {index + 1}</strong>
                        <button
                          className="word-sidebar-mini-button is-muted"
                          onClick={() => removeFaqItem(index)}
                          type="button"
                        >
                          删除
                        </button>
                      </div>
                      <input
                        onChange={(event) => updateFaqItem(index, "question", event.target.value)}
                        placeholder="问题"
                        value={item.question}
                      />
                      <textarea
                        onChange={(event) => updateFaqItem(index, "answer", event.target.value)}
                        placeholder="答案"
                        rows={3}
                        value={item.answer}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="word-main">
          <div className="word-ribbon-host">
            <div className="word-fields-grid">
              <label className="word-meta-field word-meta-field-wide">
                <span>标题</span>
                {activeGenerationTarget === "title" ? (
                  <div className="field-thinking-indicator" aria-live="polite" role="status">
                    <span className="field-thinking-label">thinking</span>
                    <span className="field-thinking-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                ) : null}
                <div className="editor-input-wrap">
                  <input
                    onChange={(event) => updateField("title", event.target.value)}
                    value={draft.title}
                  />
                  <button
                    className="field-ai-chip"
                    disabled={activeGenerationTarget === "title"}
                    onClick={() => handleGenerateField("title")}
                    type="button"
                  >
                    AI
                  </button>
                </div>
              </label>

              <label className="word-meta-field">
                <span>Slug</span>
                {activeGenerationTarget === "slug" ? (
                  <div className="field-thinking-indicator" aria-live="polite" role="status">
                    <span className="field-thinking-label">thinking</span>
                    <span className="field-thinking-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                ) : null}
                <div className="editor-input-wrap">
                  <input
                    onChange={(event) => updateField("slug", event.target.value)}
                    value={draft.slug}
                  />
                  <button
                    className="field-ai-chip"
                    disabled={activeGenerationTarget === "slug"}
                    onClick={() => handleGenerateField("slug")}
                    type="button"
                  >
                    AI
                  </button>
                </div>
              </label>

              <label className="word-meta-field word-meta-field-wide">
                <span>描述</span>
                {activeGenerationTarget === "description" ? (
                  <div className="field-thinking-indicator" aria-live="polite" role="status">
                    <span className="field-thinking-label">thinking</span>
                    <span className="field-thinking-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                ) : null}
                <div className="editor-input-wrap">
                  <textarea
                    onChange={(event) => updateField("metaDescription", event.target.value)}
                    rows={2}
                    value={draft.metaDescription}
                  />
                  <button
                    className="field-ai-chip"
                    disabled={activeGenerationTarget === "description"}
                    onClick={() => handleGenerateField("description")}
                    type="button"
                  >
                    AI
                  </button>
                </div>
              </label>

              <label className="word-meta-field">
                <span>分类</span>
                <div className="editor-input-wrap editor-tag-input-wrap">
                  <div className="editor-tag-chip-list">
                    {draft.category ? (
                      <button
                        className="editor-tag-chip"
                        onClick={() => clearCategory()}
                        type="button"
                      >
                        <span>{draft.category.name}</span>
                        <span aria-hidden="true">×</span>
                      </button>
                    ) : null}
                    <input
                      ref={categoryInputRef}
                      className="editor-tag-input"
                      onBlur={() => {
                        window.setTimeout(() => {
                          setCategorySuggestionOpen(false);
                        }, 120);
                      }}
                      onChange={(event) => {
                        setCategoryInput(event.target.value);
                        setCategorySuggestionOpen(true);
                        if (draft.category && normalizeCategoryName(event.target.value) !== draft.category.name) {
                          updateField("category", null);
                        }
                      }}
                      onFocus={() => setCategorySuggestionOpen(true)}
                      onKeyDown={handleCategoryKeyDown}
                      placeholder={draft.category ? "回车可改为其他分类" : "输入分类后回车"}
                      value={categoryInput}
                    />
                  </div>
                  {categorySuggestionOpen && categorySuggestions.length > 0 ? (
                    <div className="editor-tag-suggestion-list">
                      {categorySuggestions.map((category) => (
                        <button
                          className="editor-tag-suggestion-item"
                          key={category.category_id}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectCategory(category);
                          }}
                          type="button"
                        >
                          <span>{category.name}</span>
                          <small>{category.slug}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="word-meta-field">
                <span>标签</span>
                {activeGenerationTarget === "tags" ? (
                  <div className="field-thinking-indicator" aria-live="polite" role="status">
                    <span className="field-thinking-label">thinking</span>
                    <span className="field-thinking-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                ) : null}
                <div className="editor-input-wrap editor-tag-input-wrap">
                  <div className="editor-tag-chip-list">
                    {draft.tags.map((tag) => (
                      <button
                        className="editor-tag-chip"
                        key={`${tag.slug}-${tag.name}`}
                        onClick={() => removeTag(tag.name)}
                        type="button"
                      >
                        <span>{tag.name}</span>
                        <span aria-hidden="true">×</span>
                      </button>
                    ))}
                    <input
                      ref={tagInputRef}
                      className="editor-tag-input"
                      onBlur={() => {
                        window.setTimeout(() => {
                          setTagSuggestionOpen(false);
                        }, 120);
                      }}
                      onChange={(event) => {
                        setTagInput(event.target.value);
                        setTagSuggestionOpen(true);
                      }}
                      onFocus={() => setTagSuggestionOpen(true)}
                      onKeyDown={handleTagKeyDown}
                      placeholder={draft.tags.length > 0 ? "回车继续添加标签" : "输入标签后回车"}
                      value={tagInput}
                    />
                  </div>
                  <button
                    className="field-ai-chip"
                    disabled={activeGenerationTarget === "tags"}
                    onClick={() => handleGenerateField("tags")}
                    type="button"
                  >
                    AI
                  </button>
                  {tagSuggestionOpen && tagSuggestions.length > 0 ? (
                    <div className="editor-tag-suggestion-list">
                      {tagSuggestions.map((tag) => (
                        <button
                          className="editor-tag-suggestion-item"
                          key={tag.tag_id}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            addTagByName(tag.name);
                          }}
                          type="button"
                        >
                          <span>{tag.name}</span>
                          <small>{tag.slug}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </label>
            </div>
          </div>

          <div className="word-canvas-shell">
            <div className="editor-content-shell">
              <div className="editor-body-panel">
                <div className="editor-article-preview word-document-panel">
                  <TipTapEditor
                    activePatch={activePatch}
                    articleId={article.article_id}
                    headerAddon={
                      <div className="word-horizontal-ruler">
                        {Array.from({ length: 18 }).map((_, index) => (
                          <span className="word-ruler-mark" key={`ruler-${index}`}>
                            {index + 1}
                          </span>
                        ))}
                      </div>
                    }
                    htmlMode={htmlMode}
                    onActiveHeadingChange={setActiveOutlineBlockId}
                    navigationRequest={navigationRequest}
                    htmlPreviewDocument={{
                      title: draft.title,
                      metaTitle: draft.seoMetaTitle || draft.title,
                      metaDescription: draft.metaDescription,
                      metaKeywords: draft.seoMetaKeywords,
                      canonicalUrl: draft.canonicalUrl,
                      robots: draft.robots,
                      ogTitle: draft.ogTitle || draft.seoMetaTitle || draft.title,
                      ogDescription: draft.ogDescription || draft.metaDescription,
                      ogImageUrl: draft.ogImage?.file_url || "",
                      faqItems: draft.faqItems.map((item) => ({
                        question: item.question,
                        answer: item.answer,
                      })),
                    }}
                    onChange={(document) => updateField("content_json", document)}
                    onEditorReady={(getDocument) => {
                      editorDocumentGetterRef.current = getDocument;
                    }}
                    onToggleHtmlMode={() => setHtmlMode((currentValue) => !currentValue)}
                    value={draft.content_json ?? createFallbackDocument(article)}
                  />
                </div>
              </div>
            </div>
          </div>

          <footer className="word-statusbar">
            <div className="word-statusbar-left">
              <span>{hasDraftChanges ? "存在未保存修改" : "已同步到 Django"}</span>
              <span>建议 {reviewSummary}</span>
              <span>{saveMessage}</span>
            </div>
            <div className="word-statusbar-right">
              <span>{htmlMode ? "HTML 源码视图" : "富文本视图"}</span>
              <span>{wordCount} 字</span>
              <span>预计 {readTime} 分钟</span>
              <span>{formatStudioDateTime(saveTime)}</span>
              <button className="word-save-button" onClick={handleSave} type="button">
                {isPending && activeAction === "save" ? "保存中..." : "保存"}
              </button>
              {showPublishAction ? (
                <button className="word-save-button word-publish-button" onClick={handlePublish} type="button">
                  {isPending && activeAction === "publish" ? "发布中..." : "发布"}
                </button>
              ) : null}
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
