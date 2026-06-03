import { proxyNormalizedMediaResponse } from "../../shared";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;
  const contentType = request.headers.get("content-type") ?? "application/json";
  const body = contentType.startsWith("multipart/form-data")
    ? await request.arrayBuffer()
    : await request.text();

  return proxyNormalizedMediaResponse(request, `/api/media/images/${params.id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": contentType,
      Accept: request.headers.get("accept") ?? "application/json",
      Cookie: request.headers.get("cookie") ?? "",
      "X-CSRFToken": request.headers.get("x-csrftoken") ?? "",
      Referer: request.headers.get("referer") ?? "",
      Origin: request.headers.get("origin") ?? "",
    },
    body,
  });
}
