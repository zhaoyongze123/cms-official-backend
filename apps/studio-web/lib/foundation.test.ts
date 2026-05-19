import { describe, expect, it } from "vitest";

import { getDjangoBaseUrl } from "./django-proxy";
import { getFoundationStatus } from "./foundation";

describe("getFoundationStatus", () => {
  it("returns default foundation endpoints", () => {
    const status = getFoundationStatus();

    expect(status.authMode).toBeTruthy();
    expect(status.djangoBaseUrl).toContain("127.0.0.1");
    expect(status.editorBaseUrl).toContain("127.0.0.1");
  });
});

describe("getDjangoBaseUrl", () => {
  it("strips trailing /django from internal base url", () => {
    const originalInternalBaseUrl = process.env.DJANGO_INTERNAL_BASE_URL;
    const originalPublicBaseUrl = process.env.NEXT_PUBLIC_DJANGO_BASE_URL;

    process.env.DJANGO_INTERNAL_BASE_URL = "http://web:8000/django";
    delete process.env.NEXT_PUBLIC_DJANGO_BASE_URL;

    expect(getDjangoBaseUrl()).toBe("http://web:8000");

    if (originalInternalBaseUrl === undefined) {
      delete process.env.DJANGO_INTERNAL_BASE_URL;
    } else {
      process.env.DJANGO_INTERNAL_BASE_URL = originalInternalBaseUrl;
    }

    if (originalPublicBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_DJANGO_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_DJANGO_BASE_URL = originalPublicBaseUrl;
    }
  });
});
