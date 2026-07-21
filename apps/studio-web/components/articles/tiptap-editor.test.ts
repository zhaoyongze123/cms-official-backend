import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyEditorPatch,
  validateTipTapDocument,
  type EditorPatch,
  type TipTapDocument,
} from "@cms/editor-protocol";
import {
  clampImageContextMenuPosition,
  keepCaretInsideCodeBlock,
  restoreEditorSelection,
  TipTapEditor,
  toggleCodeBlockAtCaret,
} from "./tiptap-editor";

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

async function flushEditor() {
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

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
      await flushEditor();
    });

    const proseMirror = container.querySelector(".ProseMirror");
    expect(proseMirror).not.toBeNull();
    expect(proseMirror?.getAttribute("contenteditable")).toBe("true");
  });

  it("renders table nodes in rich text mode", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const onChange = vi.fn();
    const documentValue: TipTapDocument = {
      type: "doc",
      content: [
        {
          type: "table",
          attrs: { blockId: "blk_table_1" },
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [{ type: "text", text: "标题列" }],
                },
              ],
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
      await flushEditor();
    });

    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector("th")?.textContent).toContain("标题列");
  });

  it("moves the caret back into the previous code block when selection slips into the trailing paragraph", () => {
    const focus = vi.fn();
    const mockEditor = {
      state: {
        selection: {
          $from: {
            parent: {
              type: { name: "paragraph" },
            },
            depth: 1,
            node: () => ({
              child: () => ({
                type: { name: "codeBlock" },
              }),
            }),
            index: () => 1,
            before: () => 25,
          },
        },
      },
      commands: {
        focus,
      },
    };

    keepCaretInsideCodeBlock(mockEditor as never);

    expect(focus).toHaveBeenCalledWith(24);
  });

  it("does nothing when the previous sibling is not a code block", () => {
    const focus = vi.fn();
    const mockEditor = {
      state: {
        selection: {
          $from: {
            parent: {
              type: { name: "paragraph" },
            },
            depth: 1,
            node: () => ({
              child: () => ({
                type: { name: "paragraph" },
              }),
            }),
            index: () => 1,
            before: () => 25,
          },
        },
      },
      commands: {
        focus,
      },
    };

    keepCaretInsideCodeBlock(mockEditor as never);

    expect(focus).not.toHaveBeenCalled();
  });

  it("collapses the selection before toggling a code block", () => {
    const calls: string[] = [];
    const chain = {
      focus() {
        calls.push("focus");
        return chain;
      },
      setTextSelection(selection: { from: number; to: number }) {
        calls.push(`selection:${selection.from}-${selection.to}`);
        return chain;
      },
      toggleCodeBlock() {
        calls.push("toggleCodeBlock");
        return chain;
      },
      run() {
        calls.push("run");
        return true;
      },
    };

    const mockEditor = {
      chain: () => chain,
    };

    expect(toggleCodeBlockAtCaret(mockEditor as never, 18)).toBe(true);
    expect(calls).toEqual(["focus", "selection:18-18", "toggleCodeBlock", "run"]);
  });

  it("restores the saved selection before applying a dropdown format", () => {
    const calls: string[] = [];
    const chain = {
      focus() {
        calls.push("focus");
        return chain;
      },
      setTextSelection(selection: { from: number; to: number }) {
        calls.push(`selection:${selection.from}-${selection.to}`);
        return chain;
      },
      run() {
        calls.push("run");
        return true;
      },
    };

    expect(restoreEditorSelection({ chain: () => chain } as never, { from: 12, to: 24 })).toBe(true);
    expect(calls).toEqual(["focus", "selection:12-24", "run"]);
  });

  it("keeps the image context menu inside the viewport", () => {
    expect(
      clampImageContextMenuPosition(
        { x: 1180, y: 690 },
        { width: 1280, height: 720 },
        { width: 360, height: 420 },
      ),
    ).toEqual({ x: 908, y: 288 });
  });

  it("pins the image context menu to the viewport margin when the menu is taller than the viewport", () => {
    expect(
      clampImageContextMenuPosition(
        { x: 40, y: 640 },
        { width: 375, height: 667 },
        { width: 351, height: 760 },
      ),
    ).toEqual({ x: 12, y: 12 });
  });
});
