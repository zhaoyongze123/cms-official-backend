import { BLOCK_ID_PATTERN, PATCH_SCHEMA_VERSION } from "./constants";
import type {
  EditorPatch,
  TipTapDocument,
  TipTapNode,
  TextNode,
} from "./validators";
import { validatePatch, validateTipTapDocument } from "./validators";

export class EditorProtocolError extends Error {}

type LocatedBlock = {
  index: number;
  node: Extract<TipTapNode, { type: string }>;
  text: string;
};

type NodeWithAttrs = {
  attrs?: {
    blockId?: string;
  };
};

function isTextNode(node: TipTapNode | TextNode | undefined): node is TextNode {
  return Boolean(node && node.type === "text" && typeof node.text === "string");
}

function extractText(node: TipTapNode): string {
  if (node.type === "text") {
    return (node as TextNode).text;
  }

  if ("content" in node && Array.isArray(node.content)) {
    return node.content
      .map((child) => (typeof child === "object" && child !== null ? extractText(child as TipTapNode) : ""))
      .join("");
  }

  return "";
}

function cloneDocument(document: TipTapDocument): TipTapDocument {
  return JSON.parse(JSON.stringify(document)) as TipTapDocument;
}

function locateBlock(document: TipTapDocument, blockId: string): LocatedBlock | null {
  for (let index = 0; index < document.content.length; index += 1) {
    const node = document.content[index];
    const attrs = (node as NodeWithAttrs).attrs;
    if (attrs?.blockId === blockId) {
      return {
        index,
        node,
        text: extractText(node),
      };
    }
  }

  return null;
}

function ensurePatchSupported(patch: EditorPatch) {
  if (patch.patch_schema_version !== PATCH_SCHEMA_VERSION) {
    throw new EditorProtocolError("patch_schema_version 不匹配");
  }
  if (!validatePatch(patch)) {
    throw new EditorProtocolError("patch 结构不合法");
  }
  if (!BLOCK_ID_PATTERN.test(patch.target_block_id)) {
    throw new EditorProtocolError("target_block_id 不合法");
  }
}

function patchNodeText(node: TipTapNode, nextText: string): TipTapNode {
  if (node.type === "text") {
    return { ...node, text: nextText };
  }

  if ("content" in node && Array.isArray(node.content)) {
    let updated = false;
    const nextContent = node.content.map((child) => {
      if (!updated) {
        const text = extractText(child as TipTapNode);
        if (text.length > 0) {
          updated = true;
          return { type: "text", text: nextText };
        }
      }
      return child as TipTapNode;
    });
    return { ...node, content: nextContent };
  }

  return node;
}

export function applyEditorPatch(
  document: TipTapDocument,
  patch: EditorPatch
): TipTapDocument {
  if (!validateTipTapDocument(document)) {
    throw new EditorProtocolError("TipTap 文档结构不合法");
  }

  ensurePatchSupported(patch);

  const nextDocument = cloneDocument(document);
  const located = locateBlock(nextDocument, patch.target_block_id);
  if (!located) {
    throw new EditorProtocolError(`未找到目标 block: ${patch.target_block_id}`);
  }

  if (
    (patch.operation === "replace_text" || patch.operation === "delete") &&
    patch.old_text &&
    patch.old_text !== located.text
  ) {
    throw new EditorProtocolError("old_text 与当前 block 文本不匹配");
  }

  if (patch.operation === "replace_text") {
    const replacement = patch.new_text ?? "";
    nextDocument.content[located.index] = patchNodeText(located.node, replacement);
    return nextDocument;
  }

  if (patch.operation === "delete") {
    nextDocument.content.splice(located.index, 1);
    return nextDocument;
  }

  if (patch.operation === "insert_after") {
    const insertedNode = patch.new_block;
    if (!insertedNode) {
      throw new EditorProtocolError("insert_after 需要 new_block");
    }
    nextDocument.content.splice(located.index + 1, 0, insertedNode);
    return nextDocument;
  }

  return nextDocument;
}
