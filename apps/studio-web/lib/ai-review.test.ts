import { describe, expect, it, vi } from "vitest";

import { submitAiReview } from "./ai-review";

describe("ai review helpers", () => {
  it("posts review payload and reads review response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          run: {
            run_id: "run_001",
            schema_version: "v1",
            article_id: 10,
            status: "completed",
            provider: "fastapi",
            model: "fastapi-reviewer",
            prompt_version: "v1",
            trace_id: "trace_001",
            token_usage: {},
            error: null,
            created_at: "2026-05-11T10:00:00Z",
            completed_at: "2026-05-11T10:00:00Z",
          },
          suggestions: [],
        }),
        {
          status: 202,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    try {
      const result = await submitAiReview(10, { title: "测试文章" });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/articles/10/ai-review/");
      expect(result.run.run_id).toBe("run_001");
      expect(result.suggestions).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
