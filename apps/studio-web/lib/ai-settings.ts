import { studioProxyPath } from "./routes";

type DjangoErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

async function readJson<T>(response: Response) {
  if (!response.ok) {
    let errorMessage = `请求失败: ${response.status}`;
    try {
      const payload = (await response.json()) as DjangoErrorResponse;
      const message = payload.error?.message;
      const code = payload.error?.code;
      if (message) {
        errorMessage = code ? `${code}: ${message}` : message;
      }
    } catch {
      // 保留默认错误文案
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

function getCsrfToken() {
  if (typeof document === "undefined") {
    return "";
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("csrftoken="));

  return cookie?.split("=").slice(1).join("=") ?? "";
}

export type AiGenerationSettings = {
  models: {
    review: string;
    generation: string;
  };
  api_key: {
    has_value: boolean;
    masked_value: string;
  };
  model_options: string[];
  siliconflow_models: string[];
  siliconflow_models_error: string | null;
  prompts: {
    review_prompt: string;
    metadata_prompt: string;
    faq_prompt: string;
    internal_links_prompt: string;
    alt_prompt: string;
    title_prompt: string;
    slug_prompt: string;
    tags_prompt: string;
    description_prompt: string;
  };
};

export type AiGenerationSettingsUpdatePayload = {
  models?: AiGenerationSettings["models"];
  api_key?: {
    value?: string;
    clear?: boolean;
  };
  model_options?: string[];
  prompts?: AiGenerationSettings["prompts"];
};

export async function fetchAiGenerationSettings() {
  const response = await fetch(studioProxyPath("/api/ai/settings/generation/"), {
    method: "GET",
    cache: "no-store",
  });

  return readJson<AiGenerationSettings>(response);
}

export async function updateAiGenerationSettings(payload: AiGenerationSettingsUpdatePayload) {
  const csrfToken = getCsrfToken();
  const response = await fetch(studioProxyPath("/api/ai/settings/generation/"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  });

  return readJson<AiGenerationSettings>(response);
}
