import { describe, expect, it } from "vitest";

import {
  createDocumentFromPlainText,
  extractPlainText,
  normalizeTiptapDocument,
} from "./tiptap-document";

describe("tiptap document helpers", () => {
  it("creates paragraph blocks with blockId from plain text", () => {
    const document = createDocumentFromPlainText("第一段\n\n第二段");

    expect(document.tiptap_schema_version).toBe("v1");
    expect(document.content).toHaveLength(2);
    expect(document.content.every((node) => node.attrs?.blockId?.startsWith("blk_"))).toBe(true);
  });

  it("normalizes missing blockId values", () => {
    const document = normalizeTiptapDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "A08" }],
        },
      ],
    });

    expect(document.content[0].attrs?.blockId).toMatch(/^blk_/);
  });

  it("extracts readable plain text", () => {
    const document = normalizeTiptapDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { blockId: "blk_intro" },
          content: [{ type: "text", text: "第一段" }],
        },
        {
          type: "paragraph",
          attrs: { blockId: "blk_body" },
          content: [{ type: "text", text: "第二段" }],
        },
      ],
    });

    expect(extractPlainText(document)).toBe("第一段\n\n第二段");
  });
});
