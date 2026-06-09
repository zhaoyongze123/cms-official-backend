import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchMediaLibraryImages, updateMediaLibraryImage } from "./api-client";

describe("api client media helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses multipart PATCH when replacing a media library image file", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          image_id: 23,
          title: "替换后图片",
          alt_text: "替换后的图片描述",
          file_url: "/media/library/images/2026/05/after.png",
          uploaded_at: "2026-05-12T06:00:00Z",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["after-image-bytes"], "after.png", { type: "image/png" });
    const result = await updateMediaLibraryImage(23, {
      title: "替换后图片",
      alt_text: "替换后的图片描述",
      file,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(requestUrl)).toContain("/api/media/images/23/");
    expect(requestInit?.method).toBe("PATCH");
    expect(requestInit?.body).toBeInstanceOf(FormData);
    expect(result.file_url).toContain("/media/library/images/2026/05/after.png");
  });

  it("normalizes media library file urls when django base url was built with admin path", async () => {
    vi.stubEnv("NEXT_PUBLIC_DJANGO_BASE_URL", "https://www.yuncan.com/django/django-admin");
    vi.stubEnv("NEXT_PUBLIC_DJANGO_MEDIA_URL", "/django/media/");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            image_id: 119,
            title: "image-4-1024x871.png",
            alt_text: "",
            file_url: "https://web:8000/django/media/library/images/2023/05/image-4-1024x871.png",
            uploaded_at: "2026-05-16T10:51:47.655065+00:00",
          },
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchMediaLibraryImages();

    expect(result[0]?.file_url).toBe("https://www.yuncan.com/django/media/library/images/2023/05/image-4-1024x871.png");
  });

  it("rewrites legacy prod media paths back to dev media prefix", async () => {
    vi.stubEnv("NEXT_PUBLIC_DJANGO_BASE_URL", "http://127.0.0.1:8001");
    vi.stubEnv("NEXT_PUBLIC_DJANGO_MEDIA_URL", "/media/");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            image_id: 120,
            title: "legacy-prod.png",
            alt_text: "",
            file_url: "/django/media/library/images/2026/06/legacy-prod.png",
            uploaded_at: "2026-06-05T07:00:00Z",
          },
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchMediaLibraryImages();

    expect(result[0]?.file_url).toBe("http://127.0.0.1:8001/media/library/images/2026/06/legacy-prod.png");
  });
});
