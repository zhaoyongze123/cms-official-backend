import { describe, expect, it } from "vitest";

import type { TipTapDocument } from "@cms/editor-protocol";
import {
  buildDraftValidationIssues,
  documentToHtml,
  getPersistStatus,
  validateDraftRequiredFields,
} from "./article-editor-workspace";

describe("article editor workspace serializer", () => {
  it("preserves text alignment in generated html", () => {
    const document: TipTapDocument = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center" },
          content: [{ type: "text", text: "居中的说明" }],
        },
        {
          type: "heading",
          attrs: { level: 2, textAlign: "right" },
          content: [{ type: "text", text: "右对齐标题" }],
        },
      ],
    };

    expect(documentToHtml(document)).toBe(
      '<p style="text-align:center;">居中的说明</p><h2 style="text-align:right;">右对齐标题</h2>',
    );
  });

  it("preserves image alignment and dimensions in generated html", () => {
    const document: TipTapDocument = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            src: "https://cdn.example.com/demo.png",
            alt: "示例图片",
            align: "right",
            width: 420,
            height: 280,
          },
        },
      ],
    };

    expect(documentToHtml(document)).toBe(
      '<figure data-align="right"><img src="https://cdn.example.com/demo.png" alt="示例图片" width="420" height="280" style="width:420px;height:280px;max-width:100%;" /></figure>',
    );
  });

  it("does not treat empty body as a save-blocking validation error", () => {
    expect(
      validateDraftRequiredFields({
        title: "示例标题",
        slug: "sample-slug",
        categoryName: "客户案例",
        metaDescription: "这是摘要。",
      }),
    ).toEqual({});
  });

  it("builds reminder items for force save when required fields are missing", () => {
    expect(
      buildDraftValidationIssues(
        validateDraftRequiredFields({
          title: "",
          slug: "",
          categoryName: "",
          metaDescription: "",
        }),
      ),
    ).toEqual([
      "标题不能为空。",
      "Slug 不能为空。",
      "请选择或输入所属分类。",
      "摘要不能为空。",
    ]);
  });

  it("keeps a published article published when saving edits", () => {
    expect(getPersistStatus("save", "published")).toBe("published");
    expect(getPersistStatus("publish", "published")).toBe("draft");
  });
});
