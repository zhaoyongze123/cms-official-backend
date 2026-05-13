import { afterEach, describe, expect, it, vi } from "vitest";

import { updateMediaLibraryImage } from "./api-client";

describe("api client media helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
