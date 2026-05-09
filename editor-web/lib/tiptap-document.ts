import { Extension } from "@tiptap/core";

export type TiptapTextNode = {
  type: "text";
  text: string;
};

export type TiptapBlockNode = {
  type: string;
  attrs?: {
    blockId?: string;
    level?: number;
    [key: string]: unknown;
  };
  content?: Array<TiptapTextNode | TiptapBlockNode>;
};

export type TiptapDocument = {
  tiptap_schema_version: "v1";
  type: "doc";
  content: TiptapBlockNode[];
};

const BLOCK_NODE_TYPES = new Set(["paragraph", "heading", "bulletList", "orderedList"]);

function randomToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createBlockId() {
  return `blk_${randomToken()}`;
}

function isTextNode(node: TiptapBlockNode | TiptapTextNode): node is TiptapTextNode {
  return node.type === "text";
}

function normalizeTextNode(node: unknown): TiptapTextNode | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  const value = node as Record<string, unknown>;
  if (value.type !== "text" || typeof value.text !== "string") {
    return null;
  }

  return {
    type: "text",
    text: value.text,
  };
}

function normalizeBlockNode(node: unknown): TiptapBlockNode | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  const value = node as Record<string, unknown>;
  if (typeof value.type !== "string") {
    return null;
  }

  if (value.type === "text") {
    return normalizeTextNode(node);
  }

  const attrsSource =
    value.attrs && typeof value.attrs === "object" ? (value.attrs as Record<string, unknown>) : {};
  const attrs = { ...attrsSource };

  if (BLOCK_NODE_TYPES.has(value.type) && typeof attrs.blockId !== "string") {
    attrs.blockId = createBlockId();
  }

  const rawChildren = Array.isArray(value.content) ? value.content : [];
  const content = rawChildren
    .map((child) => normalizeBlockNode(child))
    .filter((child): child is TiptapTextNode | TiptapBlockNode => child !== null);

  return {
    type: value.type,
    attrs,
    ...(content.length > 0 ? { content } : {}),
  };
}

function createParagraphNode(text: string) {
  return {
    type: "paragraph",
    attrs: {
      blockId: createBlockId(),
    },
    content: text
      ? [
          {
            type: "text" as const,
            text,
          },
        ]
      : [],
  };
}

export function createDocumentFromPlainText(value: string) {
  const blocks = value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => createParagraphNode(item));

  return {
    tiptap_schema_version: "v1" as const,
    type: "doc" as const,
    content: blocks.length > 0 ? blocks : [createParagraphNode("")],
  };
}

export function normalizeTiptapDocument(input: unknown): TiptapDocument {
  if (!input || typeof input !== "object") {
    return createDocumentFromPlainText("");
  }

  const value = input as Record<string, unknown>;
  const rawContent = Array.isArray(value.content) ? value.content : [];
  const content = rawContent
    .map((node) => normalizeBlockNode(node))
    .filter((node): node is TiptapBlockNode => node !== null && node.type !== "text");

  return {
    tiptap_schema_version: "v1",
    type: "doc",
    content: content.length > 0 ? content : createDocumentFromPlainText("").content,
  };
}

export function extractPlainText(document: TiptapDocument) {
  const visit = (node: TiptapBlockNode | TiptapTextNode): string => {
    if (isTextNode(node)) {
      return node.text;
    }

    return (node.content ?? []).map((child) => visit(child)).join("");
  };

  return document.content
    .map((node) => visit(node).trim())
    .filter(Boolean)
    .join("\n\n");
}

export const BlockIdExtension = Extension.create({
  name: "blockId",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "bulletList", "orderedList"],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) => {
              if (!attributes.blockId) {
                return {};
              }

              return {
                "data-block-id": attributes.blockId,
              };
            },
          },
        },
      },
    ];
  },
});
