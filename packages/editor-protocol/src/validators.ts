import {
  ALLOWED_PATCH_OPERATIONS,
  BLOCK_ID_PATTERN,
  PATCH_SCHEMA_VERSION,
  TIPTAP_SCHEMA_VERSION,
  type AllowedPatchOperation,
} from "./constants";

export type TextNode = {
  type: "text";
  text: string;
};

export type ParagraphNode = {
  type: "paragraph";
  attrs?: {
    blockId?: string;
  };
  content?: TextNode[];
};

export type HeadingNode = {
  type: "heading";
  attrs?: {
    blockId?: string;
    level?: number;
  };
  content?: TextNode[];
};

export type BulletListNode = {
  type: "bulletList";
  attrs?: {
    blockId?: string;
  };
  content?: Array<{
    type: "listItem";
    content?: Array<ParagraphNode | HeadingNode | TextNode>;
  }>;
};

export type OrderedListNode = {
  type: "orderedList";
  attrs?: {
    blockId?: string;
  };
  content?: Array<{
    type: "listItem";
    content?: Array<ParagraphNode | HeadingNode | TextNode>;
  }>;
};

export type ImageNode = {
  type: "image";
  attrs?: {
    blockId?: string;
    src?: string;
    alt?: string;
  };
};

export type TipTapNode =
  | TextNode
  | ParagraphNode
  | HeadingNode
  | BulletListNode
  | OrderedListNode
  | ImageNode
  | {
      type: string;
      attrs?: {
        blockId?: string;
        [key: string]: unknown;
      };
      content?: TipTapNode[];
      [key: string]: unknown;
    };

export type TipTapDocument = {
  type: "doc";
  content: TipTapNode[];
};

export type PatchOperation = AllowedPatchOperation;

export type EditorPatch = {
  patch_id: string;
  patch_schema_version: typeof PATCH_SCHEMA_VERSION;
  operation: PatchOperation;
  target_block_id: string;
  old_text?: string | null;
  new_text?: string | null;
  new_block?: TipTapNode | null;
  position?: number | null;
  content_hash: string;
  reason?: string | null;
};

export type PatchApplyTarget = {
  patch_id: string;
  patch_schema_version: typeof PATCH_SCHEMA_VERSION;
  operation: PatchOperation;
  target_block_id: string;
  content_hash: string;
  old_text?: string | null;
  new_text?: string | null;
  new_block?: TipTapNode | null;
  position?: number | null;
  reason?: string | null;
};

export function validateTipTapDocument(document: unknown): document is TipTapDocument {
  if (!document || typeof document !== "object") {
    return false;
  }

  const value = document as Partial<TipTapDocument>;
  if (value.type !== "doc" || !Array.isArray(value.content)) {
    return false;
  }

  return value.content.every((node) => validateTipTapNode(node));
}

export function validateTipTapNode(node: unknown): node is TipTapNode {
  if (!node || typeof node !== "object") {
    return false;
  }

  const value = node as TipTapNode;
  if (value.type === "text") {
    return typeof (value as TextNode).text === "string";
  }

  if (value.type === "paragraph" || value.type === "heading") {
    const attrs = (value as ParagraphNode | HeadingNode).attrs;
    if (attrs?.blockId !== undefined && !BLOCK_ID_PATTERN.test(attrs.blockId)) {
      return false;
    }
    return Array.isArray((value as ParagraphNode | HeadingNode).content)
      ? (value as ParagraphNode | HeadingNode).content!.every((child) => validateTipTapNode(child))
      : true;
  }

  if (value.type === "bulletList" || value.type === "orderedList") {
    const attrs = (value as BulletListNode | OrderedListNode).attrs;
    if (attrs?.blockId !== undefined && !BLOCK_ID_PATTERN.test(attrs.blockId)) {
      return false;
    }
    return Array.isArray((value as BulletListNode | OrderedListNode).content)
      ? (value as BulletListNode | OrderedListNode).content!.every((child) => validateTipTapNode(child))
      : true;
  }

  if (value.type === "image") {
    const attrs = (value as ImageNode).attrs;
    return attrs?.blockId === undefined || BLOCK_ID_PATTERN.test(attrs.blockId);
  }

  return true;
}

export function validatePatch(patch: unknown): patch is EditorPatch {
  if (!patch || typeof patch !== "object") {
    return false;
  }

  const value = patch as Partial<EditorPatch>;
  if (
    typeof value.patch_id !== "string" ||
    value.patch_id.length === 0 ||
    value.patch_schema_version !== PATCH_SCHEMA_VERSION ||
    typeof value.operation !== "string" ||
    !ALLOWED_PATCH_OPERATIONS.includes(value.operation as AllowedPatchOperation) ||
    typeof value.target_block_id !== "string" ||
    !BLOCK_ID_PATTERN.test(value.target_block_id) ||
    typeof value.content_hash !== "string" ||
    value.content_hash.length === 0
  ) {
    return false;
  }

  if (
    (value.operation === "insert_after" ||
      value.operation === "delete" ||
      value.operation === "replace_text") &&
    (!value.target_block_id || !value.content_hash)
  ) {
    return false;
  }

  return true;
}

export function validateEditorProtocol(input: unknown): boolean {
  if (!input || typeof input !== "object") {
    return false;
  }

  const value = input as {
    tiptap_schema_version?: string;
    document?: unknown;
    patch?: unknown;
  };

  if (value.tiptap_schema_version !== TIPTAP_SCHEMA_VERSION) {
    return false;
  }

  if (value.document !== undefined && !validateTipTapDocument(value.document)) {
    return false;
  }

  if (value.patch !== undefined && !validatePatch(value.patch)) {
    return false;
  }

  return true;
}
