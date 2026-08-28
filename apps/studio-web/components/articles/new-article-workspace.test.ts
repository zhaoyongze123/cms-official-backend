import { describe, expect, it } from "vitest";

import { studioBrowserPath } from "../../lib/routes";

describe("new article workspace redirect path", () => {
  it("keeps embedded first-save redirect inside the next-editor proxy", () => {
    const articleId = 18;
    const nextPath = studioBrowserPath(`/django-admin/articles/${articleId}/`);

    expect(nextPath).toBe("/django-admin/next-editor/django-admin/articles/18/");
  });
});
