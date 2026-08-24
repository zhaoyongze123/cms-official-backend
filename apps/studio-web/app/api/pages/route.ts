import { proxyDjangoRequest } from "../../../lib/django-proxy";

export async function GET() {
  return proxyDjangoRequest("/api/pages/", { method: "GET" });
}

export async function POST(request: Request) {
  return proxyDjangoRequest("/api/pages/", {
    method: "POST",
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
      Accept: "application/json",
      Cookie: request.headers.get("cookie") ?? "",
      "X-CSRFToken": request.headers.get("x-csrftoken") ?? "",
    },
    body: await request.text(),
  });
}
