import { proxyNormalizedMediaResponse } from "../shared";

export async function POST(request: Request) {
  const formData = await request.formData();

  return proxyNormalizedMediaResponse(request, "/api/media/upload/", {
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
