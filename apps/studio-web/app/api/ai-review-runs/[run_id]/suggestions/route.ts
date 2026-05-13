import { proxyDjangoRequest } from "../../../../../lib/django-proxy";

type RouteContext = {
  params: Promise<{
    run_id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  return proxyDjangoRequest(`/api/ai-review-runs/${params.run_id}/suggestions/`, {
    method: "GET",
  });
}
