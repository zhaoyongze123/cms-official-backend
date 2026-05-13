const DEFAULT_DJANGO_PUBLIC_BASE_URL = "http://127.0.0.1:8001";
const DEFAULT_DJANGO_INTERNAL_BASE_URL = "http://web:8000";

export function getDjangoBaseUrl() {
  const internalBaseUrl = process.env.DJANGO_INTERNAL_BASE_URL?.trim();
  const publicBaseUrl = process.env.NEXT_PUBLIC_DJANGO_BASE_URL?.trim();
  const isProduction = process.env.NODE_ENV === "production";
  const baseUrl = isProduction
    ? publicBaseUrl ?? internalBaseUrl ?? DEFAULT_DJANGO_INTERNAL_BASE_URL
    : internalBaseUrl ?? publicBaseUrl ?? DEFAULT_DJANGO_INTERNAL_BASE_URL;

  return baseUrl.replace(/\/+$/, "");
}

export function getDjangoPublicBaseUrl() {
  return (process.env.NEXT_PUBLIC_DJANGO_BASE_URL ?? DEFAULT_DJANGO_PUBLIC_BASE_URL).replace(/\/+$/, "");
}

function toHeaderRecord(headers: Headers) {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-length") {
      return;
    }
    record[key] = value;
  });
  return record;
}

export async function proxyDjangoRequest(
  path: string,
  init: RequestInit = {}
) {
  const url = `${getDjangoBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
  });
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: toHeaderRecord(response.headers),
  });
}
