import { describe, expect, it } from "vitest";

import { STUDIO_PROXY_BASE_PATH, studioBrowserPath, studioProxyPath } from "./routes";

describe("studioProxyPath", () => {
  it("returns app-relative path for next navigation", () => {
    expect(studioProxyPath("/studio/articles")).toBe("/studio/articles");
    expect(studioProxyPath(`${STUDIO_PROXY_BASE_PATH}/studio/articles`)).toBe("/studio/articles");
  });
});

describe("studioBrowserPath", () => {
  it("prefixes basePath for raw browser urls", () => {
    expect(studioBrowserPath("/api/media/files/")).toBe("/django-admin/next-editor/api/media/files/");
    expect(studioBrowserPath("/studio/articles")).toBe("/django-admin/next-editor/studio/articles");
  });

  it("keeps already-prefixed paths unchanged", () => {
    expect(studioBrowserPath("/django-admin/next-editor/api/articles/1/")).toBe(
      "/django-admin/next-editor/api/articles/1/",
    );
  });
});
