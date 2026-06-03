import { proxyDjangoRequest } from "../../../lib/django-proxy";

function normalizeMediaFileUrl(fileUrl: string, publicOrigin: string) {
  if (!fileUrl) {
    return fileUrl;
  }

  if (fileUrl.startsWith("/")) {
    return `${publicOrigin}${fileUrl}`;
  }

  try {
    const parsedUrl = new URL(fileUrl);
    if (parsedUrl.hostname === "web" || parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") {
      return `${publicOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }
    return parsedUrl.toString();
  } catch {
    return fileUrl;
  }
}

function normalizeMediaPayload(payload: unknown, publicOrigin: string): unknown {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeMediaPayload(item, publicOrigin));
  }

  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const nextRecord: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "file_url" && typeof value === "string") {
      nextRecord[key] = normalizeMediaFileUrl(value, publicOrigin);
      continue;
    }
    nextRecord[key] = normalizeMediaPayload(value, publicOrigin);
  }

  return nextRecord;
}

export async function proxyNormalizedMediaResponse(
  request: Request,
  path: string,
  init: RequestInit,
) {
  const response = await proxyDjangoRequest(path, init);
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return response;
  }

  const payload = await response.json();
  const publicOrigin = new URL(request.url).origin;
  const normalizedPayload = normalizeMediaPayload(payload, publicOrigin);

  return Response.json(normalizedPayload, {
    status: response.status,
    statusText: response.statusText,
  });
}
