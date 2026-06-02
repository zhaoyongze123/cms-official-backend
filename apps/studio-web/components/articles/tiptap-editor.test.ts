import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyEditorPatch,
  validateTipTapDocument,
  type EditorPatch,
  type TipTapDocument,
} from "@cms/editor-protocol";
import { TipTapEditor } from "./tiptap-editor";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root && container) {
    await act(async () => {
      root?.unmount();
    });
  }
  root = null;
  container?.remove();
  container = null;
});

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

  it("mounts an editable prose mirror in rich text mode", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const onChange = vi.fn();
    const documentValue: TipTapDocument = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: {
            blockId: "blk_editor_test_1",
          },
          content: [
            {
              type: "text",
              text: "测试正文",
            },
          ],
        },
      ],
    };

    await act(async () => {
      root?.render(
        createElement(TipTapEditor, {
          onChange,
          value: documentValue,
        }),
      );
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    const proseMirror = container.querySelector(".ProseMirror");
    expect(proseMirror).not.toBeNull();
    expect(proseMirror?.getAttribute("contenteditable")).toBe("true");
  });
});
