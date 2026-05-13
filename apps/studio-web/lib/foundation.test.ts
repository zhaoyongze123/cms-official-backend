import { describe, expect, it } from "vitest";

import { getFoundationStatus } from "./foundation";

describe("getFoundationStatus", () => {
  it("returns default foundation endpoints", () => {
    const status = getFoundationStatus();

    expect(status.authMode).toBeTruthy();
    expect(status.djangoBaseUrl).toContain("127.0.0.1");
    expect(status.editorBaseUrl).toContain("127.0.0.1");
  });
});
