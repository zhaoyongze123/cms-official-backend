import { proxyDjangoRequest } from "../../../../lib/django-proxy";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  return proxyDjangoRequest(`/api/pages/${id}/`, { method: "GET" });
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return proxyDjangoRequest(`/api/pages/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
      Accept: "application/json",
      Cookie: request.headers.get("cookie") ?? "",
      "X-CSRFToken": request.headers.get("x-csrftoken") ?? "",
    },
    body: await request.text(),
  });
}

export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return proxyDjangoRequest(`/api/pages/${id}/`, {
    method: "DELETE",
    headers: { Cookie: request.headers.get("cookie") ?? "" },
  });
}
