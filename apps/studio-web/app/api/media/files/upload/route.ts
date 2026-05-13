import { proxyDjangoRequest } from "../../../../../lib/django-proxy";

export async function POST(request: Request) {
  const formData = await request.formData();

  return proxyDjangoRequest("/api/media/files/upload/", {
    method: "POST",
    headers: {
      Accept: request.headers.get("accept") ?? "application/json",
      Cookie: request.headers.get("cookie") ?? "",
      "X-CSRFToken": request.headers.get("x-csrftoken") ?? "",
      Referer: request.headers.get("referer") ?? "",
      Origin: request.headers.get("origin") ?? "",
    },
    body: formData,
  });
}
