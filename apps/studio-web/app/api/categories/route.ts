import { proxyDjangoRequest } from "../../../lib/django-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const suffix = url.search ? `?${url.searchParams.toString()}` : "";
  return proxyDjangoRequest(`/api/categories/${suffix}`, {
    method: "GET",
  });
}
