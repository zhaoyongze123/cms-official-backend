import { describe, expect, it } from "vitest";

import {
  applyEditorPatch,
  validateTipTapDocument,
  type EditorPatch,
  type TipTapDocument,
} from "@cms/editor-protocol";

describe("tiptap editor protocol", () => {
  it("normalizes block ids and applies a replace_text patch", () => {
    const document: TipTapDocument = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: {
            blockId: "blk_1",
          },
          content: [
            {
              type: "text",
              text: "原文",
            },
          ],
        },
      ],
    };

    expect(validateTipTapDocument(document)).toBe(true);

    const patch: EditorPatch = {
      patch_id: "patch_001",
      patch_schema_version: "v1",
      operation: "replace_text",
      target_block_id: "blk_1",
      content_hash: "sha256:test",
      old_text: "原文",
      new_text: "新文",
      reason: "预览替换",
    };

    const nextDocument = applyEditorPatch(document, patch);
    const nextText = (nextDocument.content[0] as { content?: Array<{ type: string; text?: string }> }).content?.[0].text;

    expect(nextText).toBe("新文");
  });
});
