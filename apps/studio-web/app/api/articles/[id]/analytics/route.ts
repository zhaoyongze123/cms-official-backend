import { proxyDjangoRequest } from "../../../../../lib/django-proxy";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  return proxyDjangoRequest(`/api/articles/${params.id}/analytics/`, {
    method: "GET",
  });
}
