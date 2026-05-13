import { proxyDjangoRequest } from "../../../lib/django-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const targetPath = searchParams.length > 0 ? `/api/articles/?${searchParams}` : "/api/articles/";
  return proxyDjangoRequest(targetPath, { method: "GET" });
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyDjangoRequest("/api/articles/", {
    method: "POST",
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
      Accept: request.headers.get("accept") ?? "application/json",
      Cookie: request.headers.get("cookie") ?? "",
      "X-CSRFToken": request.headers.get("x-csrftoken") ?? "",
      Referer: request.headers.get("referer") ?? "",
      Origin: request.headers.get("origin") ?? "",
    },
    body,
  });
}
