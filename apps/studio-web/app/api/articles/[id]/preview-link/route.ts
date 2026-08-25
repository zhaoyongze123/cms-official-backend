import { proxyDjangoRequest } from "../../../../../lib/django-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyDjangoRequest(`/api/articles/${id}/preview-link/`, {
    method: "POST",
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
      Accept: request.headers.get("accept") ?? "application/json",
      Cookie: request.headers.get("cookie") ?? "",
      "X-CSRFToken": request.headers.get("x-csrftoken") ?? "",
      Referer: request.headers.get("referer") ?? "",
      Origin: request.headers.get("origin") ?? "",
    },
  });
}
