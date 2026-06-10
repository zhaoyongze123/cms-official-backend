"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { Editor as TiptapRuntimeEditor, Extension, mergeAttributes, ResizableNodeView } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import BaseImage from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import CharacterCount from "@tiptap/extension-character-count";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import {
  fetchMediaLibraryFiles,
  fetchMediaLibraryImages,
  uploadEditorFile,
  updateMediaLibraryImage,
  uploadEditorImage,
  type MediaLibraryFileRecord,
  type MediaLibraryImageRecord,
} from "../../lib/api-client";
import { generateAlt } from "../../lib/ai-review";
import {
  applyEditorPatch,
  type EditorPatch,
  type TipTapDocument,
  validatePatch,
  validateTipTapDocument,
  BLOCK_ID_PATTERN,
} from "@cms/editor-protocol";
import { AttachmentToolbar } from "./attachment-toolbar";
import { ImageToolbar } from "./image-toolbar";
import { TableToolbar } from "./table-toolbar";
import { TableBubbleMenu } from "./table-bubble-menu";

type TipTapEditorProps = {
  articleId?: number;
  value: TipTapDocument;
  onChange: (document: TipTapDocument) => void;
  activePatch?: EditorPatch | null;
  readOnly?: boolean;
  htmlMode?: boolean;
  onToggleHtmlMode?: () => void;
  onEditorReady?: (getDocument: () => TipTapDocument) => void;
  onActiveHeadingChange?: (blockId: string | null) => void;
  headerAddon?: ReactNode;
  navigationRequest?: {
    blockId: string;
    nonce: number;
  } | null;
  htmlPreviewDocument?: {
    title?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    canonicalUrl?: string;
    robots?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    faqItems?: Array<{
      question: string;
      answer: string;
    }>;
  };
};

type SeoMetrics = {
  characters: number;
  headings: number;
  paragraphs: number;
  images: number;
  links: number;
  listBlocks: number;
};

type HtmlPreviewLine = {
  lineNumber: number;
  indentLevel: number;
  pairKey: string | null;
  tagName: string | null;
  role: "opening" | "closing" | "text" | "comment";
  collapsible: boolean;
  html: string;
};

type TextLeaf = {
  type?: string;
  text?: string;
};

type GenericNode = {
  type?: string;
  attrs?: {
    blockId?: string;
    imageId?: number;
    level?: number;
    src?: string;
    alt?: string;
    title?: string;
    href?: string;
    align?: string;
    width?: number | string;
    height?: number | string;
    [key: string]: unknown;
  };
  marks?: Array<{
    type?: string;
    attrs?: Record<string, unknown>;
  }>;
  content?: GenericNode[];
  text?: string;
};

const EMPTY_DOCUMENT: TipTapDocument = {
  type: "doc",
  content: [],
};

const lowlight = createLowlight(common);

const BlockIdExtension = Extension.create({
  name: "blockId",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "bulletList", "orderedList", "image", "table"],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) =>
              typeof attributes.blockId === "string" && attributes.blockId.length > 0
                ? { "data-block-id": attributes.blockId }
                : {},
          },
        },
      },
    ];
  },
});

const RichImage = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes) =>
          typeof attributes.align === "string" && attributes.align
            ? { "data-align": attributes.align }
            : {},
      },
      imageId: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("data-image-id");
          if (!value) {
            return null;
          }
          const parsed = Number.parseInt(value, 10);
          return Number.isFinite(parsed) ? parsed : null;
        },
        renderHTML: (attributes) =>
          attributes.imageId !== null && attributes.imageId !== undefined
            ? { "data-image-id": String(attributes.imageId) }
            : {},
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled || typeof document === "undefined") {
      return null;
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = this.options.resize;

    return ({ node, getPos, HTMLAttributes }) => {
      const imageElement = document.createElement("img");
      let containerElement: HTMLElement | null = null;

      const syncContainerAlign = (align: string) => {
        if (!containerElement) {
          return;
        }
        containerElement.setAttribute("data-align", align);
        containerElement.style.marginTop = "18px";
        containerElement.style.marginBottom = "18px";
        if (align === "center") {
          containerElement.style.marginLeft = "auto";
          containerElement.style.marginRight = "auto";
          return;
        }
        if (align === "right") {
          containerElement.style.marginLeft = "auto";
          containerElement.style.marginRight = "0";
          return;
        }
        containerElement.style.marginLeft = "0";
        containerElement.style.marginRight = "auto";
      };

      const syncImageAttributes = (attributes: Record<string, unknown>) => {
        Object.entries(this.options.HTMLAttributes ?? {}).forEach(([key, value]) => {
          if (value != null) {
            imageElement.setAttribute(key, String(value));
          }
        });

        imageElement.src = typeof attributes.src === "string" ? attributes.src : "";
        imageElement.alt = typeof attributes.alt === "string" ? attributes.alt : "";
        imageElement.title = typeof attributes.title === "string" ? attributes.title : "";
        const safeAlign = typeof attributes.align === "string" ? attributes.align : "center";
        imageElement.setAttribute("data-align", safeAlign);
        imageElement.dataset.align = safeAlign;
        syncContainerAlign(safeAlign);

        Object.entries(attributes).forEach(([key, value]) => {
          if (value === null || value === undefined) {
            if (key === "width") {
              imageElement.style.width = "";
            }
            if (key === "height") {
              imageElement.style.height = "";
            }
            if (key === "imageId") {
              imageElement.removeAttribute("data-image-id");
              return;
            }
            if (key === "align") {
              imageElement.removeAttribute("data-align");
              delete imageElement.dataset.align;
              return;
            }
            imageElement.removeAttribute(key);
            return;
          }

          switch (key) {
            case "src":
            case "alt":
            case "title":
              imageElement.setAttribute(key, String(value));
              break;
            case "width":
              imageElement.style.width = `${value}px`;
              imageElement.setAttribute("width", String(value));
              break;
            case "height":
              imageElement.style.height = "auto";
              imageElement.removeAttribute("height");
              break;
            case "align":
              imageElement.setAttribute("data-align", String(value));
              imageElement.dataset.align = String(value);
              syncContainerAlign(String(value));
              break;
            case "imageId":
              imageElement.setAttribute("data-image-id", String(value));
              break;
            default:
              imageElement.setAttribute(key, String(value));
              break;
          }
        });
      };

      syncImageAttributes(HTMLAttributes);
      const resizableNodeView = new ResizableNodeView({
        element: imageElement,
        editor: this.editor,
        node,
        getPos,
        onResize: (width) => {
          imageElement.style.width = `${width}px`;
          imageElement.style.height = "auto";
        },
        onCommit: (width) => {
          const pos = getPos();
          if (pos === undefined) {
            return;
          }
          this.editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, {
              width,
              height: null,
            })
            .run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) {
            return false;
          }
          syncImageAttributes((updatedNode.attrs ?? {}) as Record<string, unknown>);
          return true;
        },
        options: {
          directions,
          min: {
            width: minWidth,
            height: minHeight,
          },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      });

      const dom = resizableNodeView.dom;
      containerElement = dom;
      syncContainerAlign(typeof HTMLAttributes.align === "string" ? HTMLAttributes.align : "center");
      dom.style.visibility = "hidden";
      dom.style.pointerEvents = "none";
      imageElement.onload = () => {
        dom.style.visibility = "";
        dom.style.pointerEvents = "";
      };

      return resizableNodeView;
    };
  },
});

function normalizeDocumentShape(document: TipTapDocument): TipTapDocument {
  return {
    type: document?.type ?? "doc",
    content: Array.isArray(document?.content) ? document.content : [],
  } as TipTapDocument;
}

type NormalizableDocumentNode = {
  attrs?: Record<string, unknown>;
  content?: NormalizableDocumentNode[];
  marks?: Array<Record<string, unknown>>;
  text?: string;
  type?: string;
};

function sanitizeDocumentNode(node: NormalizableDocumentNode | null | undefined): NormalizableDocumentNode | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (node.type === "text") {
    if (typeof node.text !== "string" || node.text.length === 0) {
      return null;
    }

    return {
      ...node,
      text: node.text,
    };
  }

  const nextNode: NormalizableDocumentNode = {
    ...node,
  };

  if (Array.isArray(node.content)) {
    const nextContent = node.content
      .map((childNode) => sanitizeDocumentNode(childNode))
      .filter((childNode): childNode is NormalizableDocumentNode => Boolean(childNode));

    if (nextContent.length > 0) {
      nextNode.content = nextContent;
    } else {
      delete nextNode.content;
    }
  }

  return nextNode;
}

function getCurrentHeadingBlockId(editor: TiptapRuntimeEditor) {
  const selectionFrom = editor.state.selection.from;
  let currentHeadingBlockId: string | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (pos > selectionFrom) {
      return false;
    }

    if (node.type.name === "heading") {
      const blockId = typeof node.attrs?.blockId === "string" ? node.attrs.blockId : null;
      if (blockId) {
        currentHeadingBlockId = blockId;
      }
    }

    return true;
  });

  return currentHeadingBlockId;
}

function getVisibleHeadingBlockId(
  editor: TiptapRuntimeEditor,
  container: HTMLDivElement,
) {
  const containerRect = container.getBoundingClientRect();
  const headingTopThreshold = containerRect.top + 72;
  const headingBottomThreshold = containerRect.bottom - 24;
  let lastHeadingAboveTop: string | null = null;
  let firstHeadingInView: string | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") {
      return true;
    }

    const blockId = typeof node.attrs?.blockId === "string" ? node.attrs.blockId : null;
    if (!blockId) {
      return true;
    }

    const nodeElement = editor.view.nodeDOM(pos);
    if (!(nodeElement instanceof HTMLElement)) {
      return true;
    }

    const nodeRect = nodeElement.getBoundingClientRect();
    if (nodeRect.top <= headingTopThreshold) {
      lastHeadingAboveTop = blockId;
    }

    if (!firstHeadingInView && nodeRect.top >= headingTopThreshold && nodeRect.top <= headingBottomThreshold) {
      firstHeadingInView = blockId;
      return false;
    }

    return true;
  });

  return firstHeadingInView ?? lastHeadingAboveTop;
}

function scrollClosestScrollableAncestorIntoView(targetElement: HTMLElement, fallbackContainer: HTMLDivElement) {
  const scrollParents: HTMLElement[] = [];
  let currentParent = targetElement.parentElement;
  const topGap = 16;
  const visualAnchorOffset = topGap;

  while (currentParent) {
    const computedStyle = window.getComputedStyle(currentParent);
    const overflowY = computedStyle.overflowY;
    const isScrollable = /(auto|scroll|overlay)/.test(overflowY) && currentParent.scrollHeight > currentParent.clientHeight;
    if (isScrollable) {
      scrollParents.push(currentParent);
    }
    currentParent = currentParent.parentElement;
  }

  const containers = scrollParents.length > 0 ? scrollParents : [fallbackContainer];
  for (const container of containers) {
    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const anchorLine = containerRect.top + visualAnchorOffset;
    const delta = targetRect.top - anchorLine;
    const nextScrollTop = Math.max(container.scrollTop + delta, 0);
    container.scrollTo({
      top: nextScrollTop,
      behavior: "smooth",
    });
  }
}

function normalizeBlockIds(document: TipTapDocument): TipTapDocument {
  const safeDocument = normalizeDocumentShape({
    ...normalizeDocumentShape(document),
    content: normalizeDocumentShape(document).content
      .map((node) => sanitizeDocumentNode(node as NormalizableDocumentNode))
      .filter((node): node is NormalizableDocumentNode => Boolean(node)) as TipTapDocument["content"],
  });
  let blockIndex = 1;

  if (safeDocument.content.length === 0) {
    safeDocument.content = [
      {
        type: "paragraph" as const,
      },
    ];
  }

  return {
    ...safeDocument,
    content: safeDocument.content.map((node) => {
      if (!node || typeof node !== "object") {
        return node as never;
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
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTextWithMarks(node: GenericNode | TextLeaf) {
  if (node.type !== "text" || typeof node.text !== "string") {
    return "";
  }

  let text = escapeHtml(node.text);
  const marks = Array.isArray((node as GenericNode).marks) ? (node as GenericNode).marks ?? [] : [];

  for (const mark of marks) {
    if (!mark?.type) {
      continue;
    }

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
    if (mark.type === "code") {
      text = `<code>${text}</code>`;
      continue;
    }
    if (mark.type === "highlight") {
      text = `<mark>${text}</mark>`;
      continue;
    }
    if (mark.type === "link") {
      const href = typeof mark.attrs?.href === "string" ? escapeHtml(mark.attrs.href) : "#";
      text = `<a href="${href}" target="_blank" rel="noreferrer">${text}</a>`;
    }
  }

  return text;
}

function renderInlineContent(content?: GenericNode[]) {
  if (!Array.isArray(content)) {
    return "";
  }
  return content.map((node) => renderNode(node)).join("");
}

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

function buildImageAttributeString(attrs: GenericNode["attrs"]) {
  const width = normalizeImageDimension(attrs?.width);
  const align = typeof attrs?.align === "string" && attrs.align ? attrs.align : "center";
  const htmlAttributes = [];

  if (width !== null) {
    htmlAttributes.push(`width="${width}"`);
  }
  htmlAttributes.push(`data-align="${escapeHtml(align)}"`);
  if (width !== null) {
    const styleTokens = [];
    styleTokens.push(`width:${width}px`);
    styleTokens.push("height:auto");
    htmlAttributes.push(`style="${styleTokens.join(";")};max-width:100%;"`);
  }

  return htmlAttributes.length > 0 ? ` ${htmlAttributes.join(" ")}` : "";
}

function renderNode(node: GenericNode | undefined): string {
  if (!node?.type) {
    return "";
  }

  if (node.type === "text") {
    return renderTextWithMarks(node);
  }

  if (node.type === "paragraph") {
    return `<p>${renderInlineContent(node.content)}</p>`;
  }

  if (node.type === "heading") {
    const level = typeof node.attrs?.level === "number" ? node.attrs.level : 2;
    return `<h${level}>${renderInlineContent(node.content)}</h${level}>`;
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
    return `<blockquote>${(node.content ?? []).map((child) => renderNode(child)).join("")}</blockquote>`;
  }

  if (node.type === "codeBlock") {
    return `<pre><code>${escapeHtml((node.content ?? []).map((child) => child.text ?? "").join(""))}</code></pre>`;
  }

  if (node.type === "table") {
    const rows = (node.content ?? []).map((row) => renderNode(row)).join("");
    return `<table><tbody>${rows}</tbody></table>`;
  }

  if (node.type === "tableRow") {
    const cells = (node.content ?? []).map((cell) => renderNode(cell)).join("");
    return `<tr>${cells}</tr>`;
  }

  if (node.type === "tableCell") {
    return `<td>${(node.content ?? []).map((child) => renderNode(child)).join("")}</td>`;
  }

  if (node.type === "tableHeader") {
    return `<th>${(node.content ?? []).map((child) => renderNode(child)).join("")}</th>`;
  }

  if (node.type === "horizontalRule") {
    return "<hr />";
  }

  if (node.type === "image") {
    const src = typeof node.attrs?.src === "string" ? escapeHtml(node.attrs.src) : "";
    const alt = typeof node.attrs?.alt === "string" ? escapeHtml(node.attrs.alt) : "";
    const dimensionAttributes = buildImageAttributeString(node.attrs);
    const align = typeof node.attrs?.align === "string" ? escapeHtml(node.attrs.align) : "center";
    return src ? `<figure data-align="${align}"><img src="${src}" alt="${alt}"${dimensionAttributes} /></figure>` : "";
  }

  return (node.content ?? []).map((child) => renderNode(child)).join("");
}

function renderHtml(document: TipTapDocument) {
  return normalizeDocumentShape(document).content
    .map((node) => renderNode(node as GenericNode))
    .join("");
}

const HTML_VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function highlightHtmlTag(token: string) {
  const match = token.match(/^<(\/?)([A-Za-z0-9:-]+)([\s\S]*?)(\/?)>$/);
  if (!match) {
    return `<span class="html-token html-punctuation">${escapeHtml(token)}</span>`;
  }

  const [, closingSlash, tagName, rawAttributes, selfClosingSlash] = match;
  const attributeSource = rawAttributes ?? "";
  const attributePattern = /([^\s=\/>]+)(?:\s*=\s*(".*?"|'.*?'|[^\s"'=<>`]+))?/g;

  let cursor = 0;
  let attributesHtml = "";

  for (const attributeMatch of attributeSource.matchAll(attributePattern)) {
    const [fullMatch, attributeName, attributeValue] = attributeMatch;
    const start = attributeMatch.index ?? 0;
    if (start > cursor) {
      attributesHtml += escapeHtml(attributeSource.slice(cursor, start));
    }

    attributesHtml += `<span class="html-token html-attr-name">${escapeHtml(attributeName)}</span>`;
    if (attributeValue) {
      const equalsSegment = fullMatch.slice(attributeName.length, fullMatch.indexOf(attributeValue));
      attributesHtml += escapeHtml(equalsSegment);
      attributesHtml += `<span class="html-token html-attr-value">${escapeHtml(attributeValue)}</span>`;
    }

    cursor = start + fullMatch.length;
  }

  if (cursor < attributeSource.length) {
    attributesHtml += escapeHtml(attributeSource.slice(cursor));
  }

  return [
    `<span class="html-token html-punctuation">&lt;</span>`,
    closingSlash ? `<span class="html-token html-punctuation">/</span>` : "",
    `<span class="html-token html-tag-name">${escapeHtml(tagName)}</span>`,
    attributesHtml,
    selfClosingSlash ? `<span class="html-token html-punctuation">/</span>` : "",
    `<span class="html-token html-punctuation">&gt;</span>`,
  ].join("");
}

function formatHtmlPreview(source: string) {
  const tokens = source.match(/<!--[\s\S]*?-->|<\/?[^>]+>|[^<]+/g) ?? [];
  const lines: HtmlPreviewLine[] = [];
  let indentLevel = 0;
  let lineNumber = 1;
  let pairCounter = 1;
  const stack: Array<{ pairKey: string; tagName: string }> = [];

  for (const token of tokens) {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      continue;
    }

    if (trimmedToken.startsWith("<!--")) {
      lines.push({
        lineNumber,
        indentLevel,
        pairKey: null,
        tagName: null,
        role: "comment",
        collapsible: false,
        html: `${"  ".repeat(indentLevel)}<span class="html-token html-comment">${escapeHtml(trimmedToken)}</span>`,
      });
      lineNumber += 1;
      continue;
    }

    if (trimmedToken.startsWith("</")) {
      const closingTagMatch = trimmedToken.match(/^<\/([A-Za-z0-9:-]+)/);
      const tagName = closingTagMatch?.[1]?.toLowerCase() ?? null;
      const pair = stack.pop() ?? null;
      indentLevel = Math.max(0, indentLevel - 1);
      lines.push({
        lineNumber,
        indentLevel,
        pairKey: pair?.pairKey ?? null,
        tagName: tagName ?? pair?.tagName ?? null,
        role: "closing",
        collapsible: false,
        html: `${"  ".repeat(indentLevel)}${highlightHtmlTag(trimmedToken)}`,
      });
      lineNumber += 1;
      continue;
    }

    if (trimmedToken.startsWith("<")) {
      const openingTagMatch = trimmedToken.match(/^<([A-Za-z0-9:-]+)/);
      const tagName = openingTagMatch?.[1]?.toLowerCase() ?? "";
      const isSelfClosing = trimmedToken.endsWith("/>") || HTML_VOID_TAGS.has(tagName);
      const pairKey = !isSelfClosing ? `pair-${pairCounter++}` : null;
      lines.push({
        lineNumber,
        indentLevel,
        pairKey,
        tagName: tagName || null,
        role: "opening",
        collapsible: !isSelfClosing,
        html: `${"  ".repeat(indentLevel)}${highlightHtmlTag(trimmedToken)}`,
      });
      lineNumber += 1;
      if (!isSelfClosing) {
        stack.push({ pairKey: pairKey ?? "", tagName });
        indentLevel += 1;
      }
      continue;
    }

    const normalizedText = trimmedToken.replace(/\s+/g, " ");
    lines.push({
      lineNumber,
      indentLevel,
      pairKey: stack[stack.length - 1]?.pairKey ?? null,
      tagName: null,
      role: "text",
      collapsible: false,
      html: `${"  ".repeat(indentLevel)}<span class="html-token html-text">${escapeHtml(normalizedText)}</span>`,
    });
    lineNumber += 1;
  }

  return lines.length > 0
    ? lines
    : [
        {
          lineNumber: 1,
          indentLevel: 0,
          pairKey: null,
          tagName: null,
          role: "comment" as const,
          collapsible: false,
          html: `<span class="html-token html-comment">${escapeHtml("<!-- 暂无 HTML 预览 -->")}</span>`,
        },
      ];
}

function buildPageHtmlPreview(
  bodyHtml: string,
  htmlPreviewDocument?: TipTapEditorProps["htmlPreviewDocument"],
) {
  const title = (htmlPreviewDocument?.metaTitle || htmlPreviewDocument?.title || "未命名文档").trim();
  const description = (htmlPreviewDocument?.metaDescription || "").trim();
  const keywords = (htmlPreviewDocument?.metaKeywords || "").trim();
  const canonicalUrl = (htmlPreviewDocument?.canonicalUrl || "").trim();
  const robots = (htmlPreviewDocument?.robots || "index,follow").trim();
  const ogTitle = (htmlPreviewDocument?.ogTitle || title).trim();
  const ogDescription = (htmlPreviewDocument?.ogDescription || description).trim();
  const ogImageUrl = (htmlPreviewDocument?.ogImageUrl || "").trim();
  const faqItems = (htmlPreviewDocument?.faqItems ?? []).filter((item) => item.question.trim() && item.answer.trim());

  const faqJsonLd =
    faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question.trim(),
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer.trim(),
            },
          })),
        }
      : null;

  return [
    "<!DOCTYPE html>",
    '<html lang="zh-CN">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(title)}</title>`,
    description ? `  <meta name="description" content="${escapeHtml(description)}" />` : "",
    keywords ? `  <meta name="keywords" content="${escapeHtml(keywords)}" />` : "",
    robots ? `  <meta name="robots" content="${escapeHtml(robots)}" />` : "",
    canonicalUrl ? `  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />` : "",
    '  <meta property="og:type" content="article" />',
    ogTitle ? `  <meta property="og:title" content="${escapeHtml(ogTitle)}" />` : "",
    ogDescription ? `  <meta property="og:description" content="${escapeHtml(ogDescription)}" />` : "",
    canonicalUrl ? `  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />` : "",
    ogImageUrl ? `  <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />` : "",
    ogTitle ? `  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />` : "",
    ogDescription ? `  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />` : "",
    ogImageUrl ? `  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />` : "",
    `  <meta name="twitter:card" content="${ogImageUrl ? "summary_large_image" : "summary"}" />`,
    faqJsonLd
      ? `  <script type="application/ld+json">${escapeHtml(JSON.stringify(faqJsonLd, null, 2))}</script>`
      : "",
    "</head>",
    "<body>",
    bodyHtml,
    "</body>",
    "</html>",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderPlainText(node: GenericNode | undefined): string {
  if (!node?.type) {
    return "";
  }

  if (node.type === "text") {
    return node.text ?? "";
  }

  return (node.content ?? []).map((child) => renderPlainText(child)).join(" ");
}

function renderPreviewLines(document: TipTapDocument) {
  return normalizeDocumentShape(document).content
    .map((node) => renderPlainText(node as GenericNode).trim())
    .filter((line) => line.length > 0);
}

function getComparableImagePath(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function collectSeoMetrics(document: TipTapDocument): SeoMetrics {
  const safeDocument = normalizeDocumentShape(document);

  return safeDocument.content.reduce<SeoMetrics>(
    (metrics, node) => {
      const typedNode = node as GenericNode;
      const textContent = renderPlainText(typedNode).trim();
      const textLength = textContent.length;
      const html = renderNode(typedNode);

      return {
        characters: metrics.characters + textLength,
        headings: metrics.headings + (typedNode.type === "heading" ? 1 : 0),
        paragraphs: metrics.paragraphs + (typedNode.type === "paragraph" ? 1 : 0),
        images: metrics.images + (typedNode.type === "image" ? 1 : 0),
        links: metrics.links + (html.includes("<a ") ? 1 : 0),
        listBlocks:
          metrics.listBlocks +
          (typedNode.type === "bulletList" || typedNode.type === "orderedList" ? 1 : 0),
      };
    },
    {
      characters: 0,
      headings: 0,
      paragraphs: 0,
      images: 0,
      links: 0,
      listBlocks: 0,
    },
  );
}

function ToolbarButton({
  active = false,
  disabled = false,
  icon,
  label,
  onClick,
  onMouseDown,
  triggerOnMouseDown = false,
}: {
  active?: boolean;
  disabled?: boolean;
  icon?: string;
  label: string;
  onClick: () => void;
  onMouseDown?: () => void;
  triggerOnMouseDown?: boolean;
}) {
  return (
    <button
      className={`tiptap-toolbar-button${active ? " is-active" : ""}`}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown?.();
        if (triggerOnMouseDown) {
          onClick();
        }
      }}
      onClick={(event) => {
        if (triggerOnMouseDown && event.detail !== 0) {
          return;
        }
        onClick();
      }}
      title={label}
      type="button"
    >
      {icon ? <span aria-hidden="true" className="tiptap-toolbar-icon" dangerouslySetInnerHTML={{ __html: icon }} /> : label}
    </button>
  );
}

function ToolbarSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="tiptap-toolbar-select">
      <span className="sr-only">{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function keepCaretInsideCodeBlock(editor: TiptapRuntimeEditor | null | undefined) {
  if (!editor) {
    return;
  }

  const { $from } = editor.state.selection;
  if ($from.parent.type.name === "codeBlock" || $from.depth < 1) {
    return;
  }

  const containerDepth = $from.depth - 1;
  const containerNode = $from.node(containerDepth);
  const currentIndex = $from.index(containerDepth);
  if (currentIndex < 1) {
    return;
  }

  const previousNode = containerNode.child(currentIndex - 1);
  if (previousNode.type.name !== "codeBlock") {
    return;
  }

  editor.commands.focus($from.before() - 1);
}

export function TipTapEditor({
  articleId,
  value,
  onChange,
  activePatch,
  readOnly = false,
  htmlMode = false,
  onToggleHtmlMode,
  onEditorReady,
  onActiveHeadingChange,
  headerAddon,
  navigationRequest,
  htmlPreviewDocument,
}: TipTapEditorProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentUploadInputRef = useRef<HTMLInputElement | null>(null);
  const imageInsertButtonRef = useRef<HTMLButtonElement | null>(null);
  const attachmentInsertButtonRef = useRef<HTMLButtonElement | null>(null);
  const editorContentRef = useRef<HTMLDivElement | null>(null);
  const activeHeadingRef = useRef<string | null>(null);
  const pendingCodeBlockSelectionRef = useRef<number | null>(null);
  const lastSyncedDocumentRef = useRef<string>(JSON.stringify(normalizeBlockIds(value)));
  const [uploadMessage, setUploadMessage] = useState("可直接粘贴图片、拖拽图片，或从媒体库选择 / 本地上传后插入正文。");
  const [showImageSourceMenu, setShowImageSourceMenu] = useState(false);
  const [showMediaLibraryPicker, setShowMediaLibraryPicker] = useState(false);
  const [mediaLibraryImages, setMediaLibraryImages] = useState<MediaLibraryImageRecord[]>([]);
  const [mediaLibraryStatus, setMediaLibraryStatus] = useState("正在加载媒体库...");
  const [showAttachmentSourceMenu, setShowAttachmentSourceMenu] = useState(false);
  const [showAttachmentLibraryPicker, setShowAttachmentLibraryPicker] = useState(false);
  const [mediaLibraryFiles, setMediaLibraryFiles] = useState<MediaLibraryFileRecord[]>([]);
  const [attachmentLibraryStatus, setAttachmentLibraryStatus] = useState("正在加载附件库...");
  const [pendingImageTarget, setPendingImageTarget] = useState<{
    mode: "insert" | "replace";
    pos: number | null;
  }>({
    mode: "insert",
    pos: null,
  });
  const [imageContextState, setImageContextState] = useState<{
    open: boolean;
    x: number;
    y: number;
    pos: number | null;
    imageId: number | null;
    title: string;
    alt: string;
    replaceSourceOpen: boolean;
    saving: boolean;
    generatingAlt: boolean;
  }>({
    open: false,
    x: 0,
    y: 0,
    pos: null,
    imageId: null,
    title: "",
    alt: "",
    replaceSourceOpen: false,
    saving: false,
    generatingAlt: false,
  });
  const [collapsedHtmlBlocks, setCollapsedHtmlBlocks] = useState<Set<string>>(() => new Set());
  const [hoveredHtmlPairKey, setHoveredHtmlPairKey] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "done" | "error">("idle");
  const normalizedValue = useMemo(() => normalizeBlockIds(value), [value]);
  const previewDocument = useMemo(() => {
    if (!activePatch || !validatePatch(activePatch) || !validateTipTapDocument(normalizedValue)) {
      return normalizedValue;
    }

    try {
      return applyEditorPatch(normalizedValue, activePatch);
    } catch {
      return normalizedValue;
    }
  }, [activePatch, normalizedValue]);
  const previewHtmlLength = useMemo(() => renderHtml(previewDocument).length, [previewDocument]);
  const seoMetrics = useMemo(() => collectSeoMetrics(previewDocument), [previewDocument]);
  const previewHtml = useMemo(() => renderHtml(previewDocument), [previewDocument]);
  const pageHtmlPreview = useMemo(
    () => buildPageHtmlPreview(previewHtml, htmlPreviewDocument),
    [htmlPreviewDocument, previewHtml],
  );
  const formattedHtmlPreview = useMemo(() => formatHtmlPreview(pageHtmlPreview), [pageHtmlPreview]);
  const visibleHtmlPreview = useMemo(() => {
    const hiddenPairs = new Set<string>();
    return formattedHtmlPreview.filter((line) => {
      if (line.pairKey && hiddenPairs.has(line.pairKey) && line.role !== "closing") {
        return false;
      }

      if (line.role === "opening" && line.pairKey && collapsedHtmlBlocks.has(line.pairKey)) {
        hiddenPairs.add(line.pairKey);
        return true;
      }

      if (line.role === "closing" && line.pairKey && hiddenPairs.has(line.pairKey)) {
        hiddenPairs.delete(line.pairKey);
        return true;
      }

      return true;
    });
  }, [collapsedHtmlBlocks, formattedHtmlPreview]);

  const editorExtensions = useMemo(
    () => [
      BlockIdExtension,
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: "从标题、小标题、要点列表开始组织正文，内容保存以 content_json 为真相源。",
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noreferrer",
          target: "_blank",
        },
      }),
      RichImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "editor-inline-image",
          draggable: "true",
        },
        resize: {
          enabled: true,
          directions: [
            "top",
            "right",
            "bottom",
            "left",
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
          ],
          minWidth: 160,
          minHeight: 120,
          alwaysPreserveAspectRatio: true,
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight,
      CharacterCount,
    ],
    [],
  );

  const editor = useEditor({
    extensions: editorExtensions,
    content: normalizedValue,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      handlePaste(view, event) {
        if (readOnly) {
          return false;
        }

        const clipboardItems = Array.from(event.clipboardData?.items ?? []);
        const imageItem = clipboardItems.find((item) => item.type.startsWith("image/"));
        const imageFile = imageItem?.getAsFile();
        if (!imageFile) {
          return false;
        }

        event.preventDefault();
        void handleUploadImage(imageFile, "已从剪贴板接收图片，正在上传到 Django 媒体库...");
        return true;
      },
      handleDrop(view, event) {
        if (readOnly) {
          return false;
        }

        const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
        const imageFile = droppedFiles.find((file) => file.type.startsWith("image/"));
        if (!imageFile) {
          return false;
        }

        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        if (coordinates) {
          editor?.chain().focus().setTextSelection({ from: coordinates.pos, to: coordinates.pos }).run();
        }
        event.preventDefault();
        void handleUploadImage(imageFile, "已接收拖拽图片，正在上传到 Django 媒体库...");
        return true;
      },
      handleKeyDown(view, event) {
        const { state } = view;
        const selection = state.selection;
        const parentNode = selection.$from.parent;
        if (parentNode.type.name !== "codeBlock") {
          return false;
        }
        if (event.key === "ArrowUp" && selection.$from.parentOffset === 0) {
          event.preventDefault();
          editor?.commands.focus(selection.from);
          return true;
        }
        if (event.key === "ArrowDown" && selection.$from.parentOffset === parentNode.nodeSize - 2) {
          event.preventDefault();
          editor?.commands.focus(selection.to);
          return true;
        }
        if (event.key === "Tab") {
          event.preventDefault();
          const indentText = event.shiftKey ? "" : "  ";
          if (event.shiftKey && selection.empty) {
            const beforeText = parentNode.textContent.slice(0, selection.$from.parentOffset);
            if (beforeText.endsWith("  ")) {
              view.dispatch(state.tr.delete(selection.from - 2, selection.from));
              return true;
            }
            return false;
          }
          view.dispatch(state.tr.insertText(indentText, selection.from, selection.to));
          return true;
        }
        if (event.key === "Enter") {
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            editor?.chain().focus().exitCode().run();
            return true;
          }
          return false;
        }
        return false;
      },
      handleDOMEvents: {
        contextmenu(view, event) {
          if (readOnly) {
            return false;
          }

          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return false;
          }

          const imageElement = target.closest("img");
          if (!(imageElement instanceof HTMLImageElement)) {
            return false;
          }

          const imagePosition = view.posAtDOM(imageElement, 0);
          const node = view.state.doc.nodeAt(imagePosition);
          if (node?.type.name !== "image") {
            return false;
          }

          event.preventDefault();
          editor?.chain().focus().setNodeSelection(imagePosition).run();
          setImageContextState({
            open: true,
            x: event.clientX,
            y: event.clientY,
            pos: imagePosition,
            imageId: typeof node.attrs.imageId === "number" ? node.attrs.imageId : null,
            title: typeof node.attrs.title === "string" ? node.attrs.title : "",
            alt: typeof node.attrs.alt === "string" ? node.attrs.alt : "",
            replaceSourceOpen: false,
            saving: false,
            generatingAlt: false,
          });
          if (typeof node.attrs.imageId !== "number" && typeof node.attrs.src === "string" && node.attrs.src) {
            void hydrateImageContextMetadata(node.attrs.src, imagePosition);
          }
          return true;
        },
      },
    },
    onUpdate({ editor: currentEditor }) {
      const normalizedDocument = normalizeBlockIds(currentEditor.getJSON() as TipTapDocument);
      lastSyncedDocumentRef.current = JSON.stringify(normalizedDocument);
      onChange(normalizedDocument);
    },
  });

  const blockTypeValue = editor?.isActive("heading", { level: 1 })
    ? "h1"
    : editor?.isActive("heading", { level: 2 })
      ? "h2"
      : editor?.isActive("heading", { level: 3 })
        ? "h3"
        : "paragraph";
  const lineLayoutValue = editor?.isActive("orderedList")
    ? "ordered"
    : editor?.isActive("bulletList")
      ? "bullet"
      : "paragraph";

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    const nextValue = normalizeBlockIds(value);
    const serializedNextValue = JSON.stringify(nextValue);
    if (lastSyncedDocumentRef.current === serializedNextValue) {
      return;
    }
    if (JSON.stringify(editor.getJSON()) !== serializedNextValue) {
      editor.commands.setContent(nextValue);
    }
    lastSyncedDocumentRef.current = serializedNextValue;
  }, [editor, value]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !onEditorReady) {
      return;
    }

    onEditorReady(() => normalizeBlockIds(editor.getJSON() as TipTapDocument));
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !onActiveHeadingChange) {
      return;
    }

    const emitHeadingChange = (nextBlockId: string | null) => {
      if (activeHeadingRef.current === nextBlockId) {
        return;
      }
      activeHeadingRef.current = nextBlockId;
      onActiveHeadingChange(nextBlockId);
    };

    const handleSelectionBasedUpdate = () => {
      emitHeadingChange(getCurrentHeadingBlockId(editor));
    };

    handleSelectionBasedUpdate();
    editor.on("selectionUpdate", handleSelectionBasedUpdate);
    editor.on("update", handleSelectionBasedUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionBasedUpdate);
      editor.off("update", handleSelectionBasedUpdate);
    };
  }, [editor, onActiveHeadingChange]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !onActiveHeadingChange || htmlMode) {
      return;
    }

    const container = editorContentRef.current;
    if (!container) {
      return;
    }

    let frameId = 0;
    const handleScroll = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(() => {
        const visibleHeadingBlockId = getVisibleHeadingBlockId(editor, container);
        if (visibleHeadingBlockId !== null) {
          if (activeHeadingRef.current === visibleHeadingBlockId) {
            return;
          }
          activeHeadingRef.current = visibleHeadingBlockId;
          onActiveHeadingChange(visibleHeadingBlockId);
        }
      });
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      container.removeEventListener("scroll", handleScroll);
    };
  }, [editor, htmlMode, onActiveHeadingChange]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !navigationRequest?.blockId) {
      return;
    }

    const container = editorContentRef.current;
    const domTarget = container?.querySelector<HTMLElement>(`[data-block-id="${navigationRequest.blockId}"]`) ?? null;
    if (container instanceof HTMLDivElement && domTarget instanceof HTMLElement) {
      domTarget.focus({ preventScroll: true });
      scrollClosestScrollableAncestorIntoView(domTarget, container);
    }

    let targetPosition: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      const nodeBlockId = typeof node.attrs?.blockId === "string" ? node.attrs.blockId : null;
      if (nodeBlockId === navigationRequest.blockId) {
        targetPosition = pos;
        return false;
      }
      return true;
    });

    if (targetPosition === null) {
      return;
    }

    const selectionPosition = Math.min(targetPosition + 1, editor.state.doc.content.size);
    editor.chain().focus().setTextSelection(selectionPosition).scrollIntoView().run();

    const targetElement = editor.view.nodeDOM(targetPosition);
    if (container instanceof HTMLDivElement && targetElement instanceof HTMLElement) {
      scrollClosestScrollableAncestorIntoView(targetElement, container);
    }
  }, [editor, navigationRequest]);

  useEffect(() => {
    setCollapsedHtmlBlocks(new Set());
    setHoveredHtmlPairKey(null);
    setCopyStatus("idle");
  }, [previewHtml]);

  useEffect(() => {
    if (!imageContextState.open) {
      return;
    }

    function closeImageAltMenu() {
      setImageContextState((currentState) => ({ ...currentState, open: false }));
    }

    window.addEventListener("click", closeImageAltMenu);
    window.addEventListener("resize", closeImageAltMenu);
    return () => {
      window.removeEventListener("click", closeImageAltMenu);
      window.removeEventListener("resize", closeImageAltMenu);
    };
  }, [imageContextState.open]);

  function toggleHtmlFold(pairKey: string) {
    setCollapsedHtmlBlocks((currentState) => {
      const nextState = new Set(currentState);
      if (nextState.has(pairKey)) {
        nextState.delete(pairKey);
      } else {
        nextState.add(pairKey);
      }
      return nextState;
    });
  }

  async function handleCopyHtmlPreview() {
    try {
      await navigator.clipboard.writeText(previewHtml);
      setCopyStatus("done");
      window.setTimeout(() => {
        setCopyStatus("idle");
      }, 1600);
    } catch {
      setCopyStatus("error");
      window.setTimeout(() => {
        setCopyStatus("idle");
      }, 1800);
    }
  }

  useEffect(() => {
    if (!showImageSourceMenu) {
      return;
    }

    function closeImageSourceMenu(event: MouseEvent) {
      const menuTarget = event.target;
      if (menuTarget instanceof Node && imageInsertButtonRef.current?.contains(menuTarget)) {
        return;
      }
      setShowImageSourceMenu(false);
    }

    window.addEventListener("click", closeImageSourceMenu);
    return () => {
      window.removeEventListener("click", closeImageSourceMenu);
    };
  }, [showImageSourceMenu]);

  useEffect(() => {
    if (!showAttachmentSourceMenu) {
      return;
    }

    function closeAttachmentSourceMenu(event: MouseEvent) {
      const menuTarget = event.target;
      if (menuTarget instanceof Node && attachmentInsertButtonRef.current?.contains(menuTarget)) {
        return;
      }
      setShowAttachmentSourceMenu(false);
    }

    window.addEventListener("click", closeAttachmentSourceMenu);
    return () => {
      window.removeEventListener("click", closeAttachmentSourceMenu);
    };
  }, [showAttachmentSourceMenu]);

  useEffect(() => {
    if (!showMediaLibraryPicker) {
      return;
    }

    let cancelled = false;
    setMediaLibraryStatus("正在加载媒体库...");
    void fetchMediaLibraryImages()
      .then((images) => {
        if (cancelled) {
          return;
        }
        setMediaLibraryImages(images);
        setMediaLibraryStatus(images.length > 0 ? "" : "媒体库暂无图片。");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "未知错误";
        setMediaLibraryStatus(`媒体库加载失败：${message}`);
      });

    return () => {
      cancelled = true;
    };
  }, [showMediaLibraryPicker]);

  useEffect(() => {
    if (!showAttachmentLibraryPicker) {
      return;
    }

    let cancelled = false;
    setAttachmentLibraryStatus("正在加载附件库...");
    void fetchMediaLibraryFiles()
      .then((files) => {
        if (cancelled) {
          return;
        }
        setMediaLibraryFiles(files);
        setAttachmentLibraryStatus(files.length > 0 ? "" : "附件库暂无文件。");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "未知错误";
        setAttachmentLibraryStatus(`附件库加载失败：${message}`);
      });

    return () => {
      cancelled = true;
    };
  }, [showAttachmentLibraryPicker]);

  async function hydrateImageContextMetadata(imageSrc: string, imagePos: number) {
    try {
      const images = mediaLibraryImages.length > 0 ? mediaLibraryImages : await fetchMediaLibraryImages();
      const targetPath = getComparableImagePath(imageSrc);
      const matchedImage = images.find((image) => getComparableImagePath(image.file_url) === targetPath);
      if (!matchedImage) {
        return;
      }

      setImageContextState((currentState) => {
        if (!currentState.open || currentState.pos !== imagePos) {
          return currentState;
        }
        return {
          ...currentState,
          imageId: matchedImage.image_id,
          title: currentState.title || matchedImage.title,
          alt: currentState.alt || matchedImage.alt_text || matchedImage.title,
        };
      });
    } catch {
      // 允许仅编辑节点内现有数据，不因为媒体库匹配失败中断右键菜单
    }
  }

  function applyLink() {
    if (!editor) {
      return;
    }

    const existingHref = editor.getAttributes("link").href ?? "";
    const href = window.prompt("输入链接地址", existingHref)?.trim();
    if (href === undefined) {
      return;
    }
    if (!href) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  function insertAttachmentLink(file: MediaLibraryFileRecord) {
    if (!editor) {
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: file.title || file.file_name,
            marks: [
              {
                type: "link",
                attrs: {
                  href: file.file_url,
                },
              },
            ],
          },
        ],
      })
      .run();

    setShowAttachmentLibraryPicker(false);
    setShowAttachmentSourceMenu(false);
    setUploadMessage(`已插入附件链接，file_id=${file.file_id}。`);
  }

  function openUploadPicker(mode: "insert" | "replace" = "insert", pos: number | null = null) {
    setPendingImageTarget({ mode, pos });
    setShowImageSourceMenu(false);
    setImageContextState((currentState) => ({
      ...currentState,
      open: mode === "replace" ? false : currentState.open,
      replaceSourceOpen: false,
    }));
    uploadInputRef.current?.click();
  }

  function openLibraryUploadPicker(mode: "insert" | "replace" = "insert", pos: number | null = null) {
    setPendingImageTarget({ mode, pos });
    setShowMediaLibraryPicker(true);
    setShowImageSourceMenu(false);
    setImageContextState((currentState) => ({
      ...currentState,
      open: mode === "replace" ? false : currentState.open,
      replaceSourceOpen: false,
    }));
  }

  function openAttachmentUploadPicker() {
    setShowAttachmentSourceMenu(false);
    attachmentUploadInputRef.current?.click();
  }

  function openAttachmentLibraryPicker() {
    setShowAttachmentSourceMenu(false);
    setShowAttachmentLibraryPicker(true);
  }

  function insertMediaLibraryImage(image: MediaLibraryImageRecord) {
    if (!editor) {
      return;
    }

    const imageAttrs = {
      imageId: image.image_id,
      src: image.file_url,
      title: image.title,
      alt: image.alt_text || image.title,
    };
    if (pendingImageTarget.mode === "replace" && pendingImageTarget.pos !== null) {
      editor.chain().focus().setNodeSelection(pendingImageTarget.pos).updateAttributes("image", imageAttrs).run();
    } else {
      editor.chain().focus().setImage(imageAttrs).run();
    }
    setPendingImageTarget({ mode: "insert", pos: null });
    setShowMediaLibraryPicker(false);
    setShowImageSourceMenu(false);
    setImageContextState((currentState) => ({
      ...currentState,
      open: false,
      replaceSourceOpen: false,
      saving: false,
    }));
    setUploadMessage(`已从媒体库插入图片，image_id=${image.image_id}。`);
  }

  async function handleUploadImage(file: File | null, pendingMessage?: string) {
    if (!file || !editor) {
      return;
    }

    setUploadMessage(pendingMessage ?? "正在上传图片到 Django 媒体库...");
    try {
      let imageRecord;
      if (pendingImageTarget.mode === "replace" && imageContextState.imageId !== null) {
        imageRecord = await updateMediaLibraryImage(imageContextState.imageId, {
          title: imageContextState.title.trim() || file.name.replace(/\.[^.]+$/, ""),
          alt_text: imageContextState.alt.trim(),
          file,
        });
      } else {
        imageRecord = await uploadEditorImage(
          file,
          imageContextState.alt.trim(),
          imageContextState.title.trim() || file.name.replace(/\.[^.]+$/, ""),
        );
      }
      const imageAttrs = {
        imageId: imageRecord.image_id,
        src: imageRecord.file_url,
        title: imageRecord.title,
        alt: imageRecord.alt_text || imageRecord.title,
      };
      if (pendingImageTarget.mode === "replace" && pendingImageTarget.pos !== null) {
        editor.chain().focus().setNodeSelection(pendingImageTarget.pos).updateAttributes("image", imageAttrs).run();
      } else {
        editor.chain().focus().setImage(imageAttrs).run();
      }
      setPendingImageTarget({ mode: "insert", pos: null });
      setShowImageSourceMenu(false);
      setImageContextState((currentState) => ({
        ...currentState,
        open: false,
        imageId: imageRecord.image_id,
        title: imageRecord.title,
        alt: imageRecord.alt_text || imageRecord.title,
        replaceSourceOpen: false,
        saving: false,
      }));
      setUploadMessage(
        pendingImageTarget.mode === "replace"
          ? `图片已完成替换，image_id=${imageRecord.image_id}。`
          : `图片已上传到媒体库，image_id=${imageRecord.image_id}。`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setUploadMessage(`图片上传失败：${message}`);
    }
  }

  async function handleUploadAttachment(file: File | null) {
    if (!file || !editor) {
      return;
    }

    setUploadMessage("正在上传附件到 Django 附件库...");
    try {
      const uploadedFile = await uploadEditorFile(file, file.name);
      insertAttachmentLink(uploadedFile);
      setUploadMessage(`附件已上传到附件库，file_id=${uploadedFile.file_id}。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setUploadMessage(`附件上传失败：${message}`);
    }
  }

  async function saveImageMetadata() {
    if (!editor || imageContextState.pos === null) {
      return;
    }

    const nextTitle = imageContextState.title.trim();
    const nextAlt = imageContextState.alt.trim();

    setImageContextState((currentState) => ({ ...currentState, saving: true }));

    try {
      if (imageContextState.imageId !== null) {
        const image = await updateMediaLibraryImage(imageContextState.imageId, {
          title: nextTitle,
          alt_text: nextAlt,
        });

        editor
          .chain()
          .focus()
          .setNodeSelection(imageContextState.pos)
          .updateAttributes("image", {
            imageId: image.image_id,
            src: image.file_url,
            title: image.title,
            alt: image.alt_text || image.title,
          })
          .run();

        setImageContextState((currentState) => ({
          ...currentState,
          open: false,
          title: image.title,
          alt: image.alt_text || image.title,
          replaceSourceOpen: false,
          saving: false,
        }));
        setUploadMessage(`图片信息已保存，image_id=${image.image_id}。`);
        return;
      }

      editor
        .chain()
        .focus()
        .setNodeSelection(imageContextState.pos)
        .updateAttributes("image", {
          title: nextTitle,
          alt: nextAlt,
        })
        .run();
      setImageContextState((currentState) => ({
        ...currentState,
        open: false,
        replaceSourceOpen: false,
        saving: false,
      }));
      setUploadMessage("图片信息已更新。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setImageContextState((currentState) => ({ ...currentState, saving: false }));
      setUploadMessage(`图片信息保存失败：${message}`);
    }
  }

  async function generateImageAltWithAi() {
    if (!editor || imageContextState.pos === null || !articleId) {
      return;
    }

    const imageNode = editor.state.doc.nodeAt(imageContextState.pos);
    if (!imageNode || imageNode.type.name !== "image") {
      return;
    }

    setImageContextState((currentState) => ({
      ...currentState,
      generatingAlt: true,
    }));

    try {
      const response = await generateAlt(articleId, {
        title: imageContextState.title.trim(),
        alt_text: imageContextState.alt.trim(),
        image_title: imageContextState.title.trim(),
        image_url: typeof imageNode.attrs.src === "string" ? imageNode.attrs.src : "",
        target_block_id: typeof imageNode.attrs.blockId === "string" ? imageNode.attrs.blockId : "",
        content_json: normalizeBlockIds(editor.getJSON() as TipTapDocument),
        content_html: renderHtml(normalizeBlockIds(editor.getJSON() as TipTapDocument)),
      });
      const nextAlt = response.suggestion?.patches?.[0]?.new_text?.trim();
      if (!nextAlt) {
        throw new Error("AI 未返回可用的图片 alt 文本。");
      }
      setImageContextState((currentState) => ({
        ...currentState,
        alt: nextAlt,
        generatingAlt: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setUploadMessage(`AI 生成图片 alt 失败：${message}`);
      setImageContextState((currentState) => ({
        ...currentState,
        generatingAlt: false,
      }));
    }
  }

  function removeCurrentImage() {
    if (!editor || imageContextState.pos === null) {
      return;
    }

    editor.chain().focus().setNodeSelection(imageContextState.pos).deleteSelection().run();
    setImageContextState((currentState) => ({ ...currentState, open: false }));
    setUploadMessage("图片已从正文中移除。");
  }

  function applyBlockType(value: string) {
    if (!editor) {
      return;
    }

    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
      return;
    }

    const level = Number(value.replace("h", ""));
    if ([1, 2, 3].includes(level)) {
      editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
    }
  }

  function applyLineLayout(value: string) {
    if (!editor) {
      return;
    }

    if (value === "bullet") {
      editor.chain().focus().toggleBulletList().run();
      return;
    }
    if (value === "ordered") {
      editor.chain().focus().toggleOrderedList().run();
      return;
    }
    editor.chain().focus().liftListItem("listItem").setParagraph().run();
  }

  function applyImageAlign(align: "left" | "center" | "right") {
    if (!editor) {
      return;
    }

    if (imageContextState.pos !== null) {
      editor.chain().focus().setNodeSelection(imageContextState.pos).updateAttributes("image", { align }).run();
      return;
    }

    if (!editor.isActive("image")) {
      return;
    }

    editor.chain().focus().updateAttributes("image", { align }).run();
  }

  function insertTable() {
    if (!editor) {
      return;
    }
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  function addTableRowBefore() {
    editor?.chain().focus().addRowBefore().run();
  }

  function addTableRowAfter() {
    editor?.chain().focus().addRowAfter().run();
  }

  function addTableColumnBefore() {
    editor?.chain().focus().addColumnBefore().run();
  }

  function addTableColumnAfter() {
    editor?.chain().focus().addColumnAfter().run();
  }

  function removeTableRow() {
    editor?.chain().focus().deleteRow().run();
  }

  function removeTableColumn() {
    editor?.chain().focus().deleteColumn().run();
  }

  function removeCurrentTable() {
    editor?.chain().focus().deleteTable().run();
  }

  const currentCharacters = editor?.storage.characterCount.characters() ?? seoMetrics.characters;

  return (
    <div className="tiptap-editor-shell">
      <div className="tiptap-sticky-header">
        {headerAddon ? <div className="tiptap-header-addon">{headerAddon}</div> : null}
        <div className="tiptap-editor-topbar">
          <div className="tiptap-toolbar-ribbon">
            <div className="tiptap-toolbar-group tiptap-toolbar-group-selectors">
              <ToolbarSelect
                label="段落样式"
                onChange={applyBlockType}
                options={[
                  { label: "正文", value: "paragraph" },
                  { label: "标题 1", value: "h1" },
                  { label: "标题 2", value: "h2" },
                  { label: "标题 3", value: "h3" },
                ]}
                value={blockTypeValue}
              />
              <ToolbarSelect
                label="段落布局"
                onChange={applyLineLayout}
                options={[
                  { label: "普通段落", value: "paragraph" },
                  { label: "项目符号", value: "bullet" },
                  { label: "编号列表", value: "ordered" },
                ]}
                value={lineLayoutValue}
              />
            </div>

            <ToolbarButton
              active={editor?.isActive("heading", { level: 1 })}
              disabled={!editor?.can().chain().focus().toggleHeading({ level: 1 }).run()}
              icon="<span class='toolbar-heading'>H1</span>"
              label="标题 1"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolbarButton
              active={editor?.isActive("heading", { level: 2 })}
              disabled={!editor?.can().chain().focus().toggleHeading({ level: 2 }).run()}
              icon="<span class='toolbar-heading'>H2</span>"
              label="标题 2"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarButton
              active={editor?.isActive("heading", { level: 3 })}
              disabled={!editor?.can().chain().focus().toggleHeading({ level: 3 }).run()}
              icon="<span class='toolbar-heading'>H3</span>"
              label="标题 3"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            />
            <ToolbarButton
              active={editor?.isActive("paragraph")}
              icon="<span class='toolbar-heading toolbar-heading-body'>¶</span>"
              label="正文"
              onClick={() => editor?.chain().focus().setParagraph().run()}
            />
          </div>

          <div className="tiptap-toolbar-group tiptap-toolbar-group-divider">
            <ToolbarButton
              active={editor?.isActive("bold")}
              disabled={!editor?.can().chain().focus().toggleBold().run()}
              icon="<strong>B</strong>"
              label="B"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              active={editor?.isActive("italic")}
              disabled={!editor?.can().chain().focus().toggleItalic().run()}
              icon="<em>I</em>"
              label="I"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              active={editor?.isActive("underline")}
              disabled={!editor?.can().chain().focus().toggleUnderline().run()}
              icon="<span style='text-decoration:underline'>U</span>"
              label="U"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            />
            <ToolbarButton
              active={editor?.isActive("highlight")}
              icon="<span class='toolbar-swatch toolbar-swatch-highlight'></span>"
              label="高亮"
              onClick={() => editor?.chain().focus().toggleHighlight().run()}
            />
            <ToolbarButton
              active={editor?.isActive("blockquote")}
              icon="<span class='toolbar-quote'>❝</span>"
              label="引用"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />
            <ToolbarButton
              active={editor?.isActive("codeBlock")}
              icon="<span class='toolbar-code toolbar-html-mark'>CODE</span>"
              label="代码块"
              onMouseDown={() => {
                pendingCodeBlockSelectionRef.current = editor?.state.selection.from ?? null;
              }}
              onClick={() => {
                const wasCodeBlockActive = editor?.isActive("codeBlock") ?? false;
                const codeCaretPosition = pendingCodeBlockSelectionRef.current ?? editor?.state.selection.from ?? null;
                pendingCodeBlockSelectionRef.current = null;
                editor?.chain().focus().toggleCodeBlock().run();
                if (!wasCodeBlockActive && codeCaretPosition !== null) {
                  [0, 60, 180].forEach((delay) => {
                    window.setTimeout(() => {
                      editor?.commands.focus(codeCaretPosition);
                      keepCaretInsideCodeBlock(editor);
                    }, delay);
                  });
                }
              }}
            />
          </div>

          <TableToolbar
            editor={editor}
            onInsertTable={insertTable}
            onAddRowBefore={addTableRowBefore}
            onAddRowAfter={addTableRowAfter}
            onAddColumnBefore={addTableColumnBefore}
            onAddColumnAfter={addTableColumnAfter}
            onDeleteRow={removeTableRow}
            onDeleteColumn={removeTableColumn}
            onDeleteTable={removeCurrentTable}
          />

          <div className="tiptap-toolbar-group tiptap-toolbar-group-divider">
            <ToolbarButton
              active={editor?.isActive("bulletList")}
              icon="<span class='toolbar-list'>•≡</span>"
              label="项目符号"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              active={editor?.isActive("orderedList")}
              icon="<span class='toolbar-list'>1≡</span>"
              label="编号"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
            <ToolbarButton
              icon="<span class='toolbar-align toolbar-align-left'></span>"
              label="左对齐"
              onClick={() => (editor?.isActive("image") ? applyImageAlign("left") : editor?.chain().focus().setTextAlign("left").run())}
            />
            <ToolbarButton
              icon="<span class='toolbar-align toolbar-align-center'></span>"
              label="居中"
              onClick={() => (editor?.isActive("image") ? applyImageAlign("center") : editor?.chain().focus().setTextAlign("center").run())}
            />
            <ToolbarButton
              icon="<span class='toolbar-align toolbar-align-right'></span>"
              label="右对齐"
              onClick={() => (editor?.isActive("image") ? applyImageAlign("right") : editor?.chain().focus().setTextAlign("right").run())}
            />
            <ToolbarButton icon="<span class='toolbar-link'>∞</span>" label="链接" onClick={applyLink} />
            <ImageToolbar
              buttonRef={imageInsertButtonRef}
              showMenu={showImageSourceMenu}
              onToggleMenu={() => setShowImageSourceMenu((currentValue) => !currentValue)}
              onUpload={() => openUploadPicker()}
              onSelectLibrary={() => openLibraryUploadPicker()}
            />
            <AttachmentToolbar
              buttonRef={attachmentInsertButtonRef}
              showMenu={showAttachmentSourceMenu}
              onToggleMenu={() => setShowAttachmentSourceMenu((currentValue) => !currentValue)}
              onUpload={openAttachmentUploadPicker}
              onSelectLibrary={openAttachmentLibraryPicker}
            />
            <ToolbarButton
              icon="<span class='toolbar-code toolbar-html-mark'>HTML</span>"
              label="HTML 源码"
              onClick={() => onToggleHtmlMode?.()}
            />
          </div>
        </div>
        <div className="tiptap-upload-hint">{uploadMessage}</div>
      </div>
      {showMediaLibraryPicker ? (
        <div className="tiptap-media-library-modal">
          <div className="tiptap-media-library-panel">
            <div className="tiptap-media-library-header">
              <strong>从媒体库选择图片</strong>
              <button className="tiptap-context-link" onClick={() => setShowMediaLibraryPicker(false)} type="button">
                关闭
              </button>
            </div>
            {mediaLibraryStatus ? <div className="tiptap-media-library-status">{mediaLibraryStatus}</div> : null}
            <div className="tiptap-media-library-grid">
              {mediaLibraryImages.map((image) => (
                <button
                  className="tiptap-media-library-card"
                  key={image.image_id}
                  onClick={() => insertMediaLibraryImage(image)}
                  type="button"
                >
                  <img alt={image.alt_text || image.title} src={image.file_url} />
                  <strong>{image.title || `图片 ${image.image_id}`}</strong>
                  <span>{image.alt_text || "未填写 alt"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {showAttachmentLibraryPicker ? (
        <div className="tiptap-media-library-modal">
          <div className="tiptap-media-library-panel">
            <div className="tiptap-media-library-header">
              <div>
                <strong>从附件库选择文件</strong>
                <p>选择后会以下载链接形式插入正文。</p>
              </div>
              <button className="tiptap-context-link" onClick={() => setShowAttachmentLibraryPicker(false)} type="button">
                关闭
              </button>
            </div>
            {attachmentLibraryStatus ? <div className="tiptap-media-library-status">{attachmentLibraryStatus}</div> : null}
            <div className="tiptap-attachment-library-list">
              {mediaLibraryFiles.map((file) => (
                <button
                  className="tiptap-attachment-library-item"
                  key={file.file_id}
                  onClick={() => insertAttachmentLink(file)}
                  type="button"
                >
                  <strong>{file.title || file.file_name}</strong>
                  <span>{file.file_name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <input
        ref={uploadInputRef}
        className="tiptap-upload-input"
        onChange={(event) => {
          void handleUploadImage(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
        type="file"
        accept="image/*"
      />
      <input
        ref={attachmentUploadInputRef}
        className="tiptap-upload-input"
        onChange={(event) => {
          void handleUploadAttachment(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
        type="file"
      />

      <div className="tiptap-editor-layout">
        <div className="tiptap-editor-main">
          {editor ? (
            <>
              <BubbleMenu className="tiptap-bubble-menu" editor={editor}>
                <ToolbarButton
                  active={editor.isActive("bold")}
                  label="B"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                />
                <ToolbarButton
                  active={editor.isActive("italic")}
                  label="I"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                />
                <ToolbarButton
                  active={editor.isActive("underline")}
                  label="U"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                />
                <ToolbarButton
                  active={editor.isActive("link")}
                  label="链接"
                  onClick={applyLink}
                />
              </BubbleMenu>

              <TableBubbleMenu
                editor={editor}
                onAddRowBefore={addTableRowBefore}
                onAddRowAfter={addTableRowAfter}
                onAddColumnBefore={addTableColumnBefore}
                onAddColumnAfter={addTableColumnAfter}
                onDeleteRow={removeTableRow}
                onDeleteColumn={removeTableColumn}
                onDeleteTable={removeCurrentTable}
              />

              <FloatingMenu className="tiptap-floating-menu" editor={editor}>
                <ToolbarButton label="+ H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
                <ToolbarButton label="+ 列表" onClick={() => editor.chain().focus().toggleBulletList().run()} />
                <ToolbarButton label="+ 图片" onClick={() => openUploadPicker()} />
              </FloatingMenu>
            </>
          ) : null}

          <div className="tiptap-editor-content" ref={editorContentRef}>
            {htmlMode ? (
              <div className="tiptap-html-source-panel">
                <div className="tiptap-html-toolbar">
                  <div className="tiptap-html-toolbar-left">
                    <span className="tiptap-html-panel-title">index.html</span>
                    <span className="tiptap-html-panel-meta">只读预览</span>
                  </div>
                  <div className="tiptap-html-toolbar-right">
                    <button className="tiptap-html-copy-button" onClick={() => void handleCopyHtmlPreview()} type="button">
                      {copyStatus === "done" ? "已复制" : copyStatus === "error" ? "复制失败" : "复制 HTML"}
                    </button>
                  </div>
                </div>
                <div className="tiptap-html-source" aria-label="HTML 源码预览" role="textbox">
                  {visibleHtmlPreview.map((line) => (
                    <div
                      className={`tiptap-html-line${hoveredHtmlPairKey && line.pairKey === hoveredHtmlPairKey ? " is-pair-highlighted" : ""}`}
                      key={`html-line-${line.lineNumber}`}
                      onMouseEnter={() => setHoveredHtmlPairKey(line.pairKey)}
                      onMouseLeave={() => setHoveredHtmlPairKey((currentState) => (currentState === line.pairKey ? null : currentState))}
                    >
                      <span className="tiptap-html-fold-slot">
                        {line.collapsible && line.pairKey ? (
                          <button
                            aria-label={collapsedHtmlBlocks.has(line.pairKey) ? "展开标签" : "折叠标签"}
                            className="tiptap-html-fold-button"
                            onClick={() => toggleHtmlFold(line.pairKey!)}
                            type="button"
                          >
                            {collapsedHtmlBlocks.has(line.pairKey) ? "▸" : "▾"}
                          </button>
                        ) : null}
                      </span>
                      <span aria-hidden="true" className="tiptap-html-line-number">
                        {line.lineNumber}
                      </span>
                      <span className="tiptap-html-indent-guide" style={{ width: `${line.indentLevel * 14}px` }} />
                      {line.role === "opening" && line.pairKey && collapsedHtmlBlocks.has(line.pairKey) ? (
                        <span className="tiptap-html-fold-preview">...</span>
                      ) : null}
                      {line.role === "closing" && line.pairKey && collapsedHtmlBlocks.has(line.pairKey) ? (
                        <span className="tiptap-html-fold-preview">...</span>
                      ) : null}
                      <code
                        className="tiptap-html-line-code"
                        dangerouslySetInnerHTML={{ __html: line.html }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className={`tiptap-paper-shell${htmlMode ? " is-hidden" : ""}`}>
              <div className="tiptap-paper">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
          {imageContextState.open ? (
            <div
              className="tiptap-image-context-menu"
              onClick={(event) => event.stopPropagation()}
              style={{
                left: `${imageContextState.x}px`,
                top: `${imageContextState.y}px`,
              }}
            >
              <div className="tiptap-image-context-section">
                <span className="tiptap-image-context-title">图片操作</span>
                <div className="tiptap-image-context-row">
                  <button className="tiptap-context-action" onClick={() => applyImageAlign("left")} type="button">
                    居左
                  </button>
                  <button className="tiptap-context-action" onClick={() => applyImageAlign("center")} type="button">
                    居中
                  </button>
                  <button className="tiptap-context-action" onClick={() => applyImageAlign("right")} type="button">
                    居右
                  </button>
                </div>
                <div className="tiptap-image-context-row">
                  <button
                    className="tiptap-context-action"
                    onClick={() =>
                      setImageContextState((currentState) => ({
                        ...currentState,
                        replaceSourceOpen: !currentState.replaceSourceOpen,
                      }))
                    }
                    type="button"
                  >
                    替换图片
                  </button>
                  <button
                    className="tiptap-context-action"
                    onClick={() => {
                      const currentNode = editor?.state.doc.nodeAt(imageContextState.pos ?? -1);
                      const imageUrl = typeof currentNode?.attrs?.src === "string" ? currentNode.attrs.src : "";
                      if (imageUrl) {
                        window.open(imageUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                    type="button"
                  >
                    放大预览
                  </button>
                  <button className="tiptap-context-action is-danger" onClick={removeCurrentImage} type="button">
                    删除图片
                  </button>
                </div>
                {imageContextState.replaceSourceOpen ? (
                  <div className="tiptap-image-context-row">
                    <button
                      className="tiptap-context-action"
                      onClick={() => openUploadPicker("replace", imageContextState.pos)}
                      type="button"
                    >
                      本地上传替换
                    </button>
                    <button
                      className="tiptap-context-action"
                      onClick={() => openLibraryUploadPicker("replace", imageContextState.pos)}
                      type="button"
                    >
                      媒体库替换
                    </button>
                  </div>
                ) : null}
              </div>
              <input
                className="tiptap-image-context-input"
                onChange={(event) =>
                  setImageContextState((currentState) => ({
                    ...currentState,
                    title: event.target.value,
                  }))
                }
                placeholder="输入图片名称，和媒体库保持一致"
                value={imageContextState.title}
              />
              <input
                autoFocus
                className="tiptap-image-context-input"
                onChange={(event) =>
                  setImageContextState((currentState) => ({
                    ...currentState,
                    alt: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveImageMetadata();
                  }
                  if (event.key === "Escape") {
                    setImageContextState((currentState) => ({ ...currentState, open: false }));
                  }
                }}
                placeholder="输入图片描述，利于 SEO 与无障碍"
                value={imageContextState.alt}
              />
              <div className="tiptap-image-context-inline-actions">
                <button
                  className="tiptap-context-action tiptap-context-action-ai"
                  disabled={imageContextState.generatingAlt || imageContextState.saving || !articleId}
                  onClick={() => void generateImageAltWithAi()}
                  type="button"
                >
                  {imageContextState.generatingAlt ? "AI 生成中..." : "AI 生成 Alt"}
                </button>
              </div>
              <div className="tiptap-image-context-actions">
                <button
                  className="tiptap-context-link"
                  onClick={() => setImageContextState((currentState) => ({ ...currentState, open: false }))}
                  type="button"
                >
                  取消
                </button>
                <button
                  className="tiptap-secondary-button"
                  disabled={imageContextState.saving}
                  onClick={() => void saveImageMetadata()}
                  type="button"
                >
                  {imageContextState.saving ? "保存中..." : "保存图片信息"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

      </div>

      {activePatch ? (
        <div className="tiptap-editor-preview">
          <div className="insight-meta">
            <span>补丁预览：{activePatch.operation}</span>
            <span>目标 block：{activePatch.target_block_id}</span>
          </div>
          <div className="editor-article-preview">
            {renderPreviewLines(previewDocument).map((line: string, index: number) => (
              <p key={`${activePatch.patch_id}-${index}`}>{line}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="tiptap-editor-meta">
        <span>blockId 已规范化</span>
        <span>HTML 预览长度 {previewHtmlLength} 字符</span>
        <span>正文 {currentCharacters} 字 / 图片 {seoMetrics.images}</span>
        <span>{validateTipTapDocument(previewDocument ?? EMPTY_DOCUMENT) ? "文档结构有效" : "文档结构待修复"}</span>
      </div>
    </div>
  );
}
