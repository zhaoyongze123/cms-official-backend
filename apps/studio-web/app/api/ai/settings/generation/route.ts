import { proxyDjangoRequest } from "../../../../../lib/django-proxy";

export async function GET() {
  return proxyDjangoRequest("/api/ai/settings/generation/", { method: "GET" });
}

export async function PATCH(request: Request) {
  const body = await request.text();
  return proxyDjangoRequest("/api/ai/settings/generation/", {
    method: "PATCH",
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
