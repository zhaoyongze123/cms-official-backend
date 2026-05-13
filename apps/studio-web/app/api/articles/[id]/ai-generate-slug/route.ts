import { proxyDjangoRequest } from "../../../../../lib/django-proxy";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const params = await context.params;
  const body = await request.text();
  return proxyDjangoRequest(`/api/articles/${params.id}/ai-generate-slug/`, {
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
