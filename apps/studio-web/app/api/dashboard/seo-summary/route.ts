import { proxyDjangoRequest } from "../../../../lib/django-proxy";

export async function GET() {
  return proxyDjangoRequest("/api/dashboard/seo-summary/", { method: "GET" });
}
