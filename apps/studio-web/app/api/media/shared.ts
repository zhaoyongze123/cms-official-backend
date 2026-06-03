import { proxyDjangoRequest } from "../../../lib/django-proxy";

function resolvePublicOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = request.headers.get("host")?.trim();
  const candidateHost = forwardedHost || host;

  if (candidateHost) {
    const protocol = forwardedProto || (candidateHost.startsWith("127.0.0.1") || candidateHost.startsWith("localhost") ? "http" : "https");
    return `${protocol}://${candidateHost}`;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      return new URL(siteUrl).origin;
    } catch {
      // 忽略非法站点配置，继续回退
    }
  }

  return new URL(request.url).origin;
}

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
  const publicOrigin = resolvePublicOrigin(request);
  const normalizedPayload = normalizeMediaPayload(payload, publicOrigin);

  return Response.json(normalizedPayload, {
    status: response.status,
    statusText: response.statusText,
  });
}
