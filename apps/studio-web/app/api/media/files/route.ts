import { proxyNormalizedMediaResponse } from "../shared";

export async function GET(request: Request) {
  return proxyNormalizedMediaResponse(request, "/api/media/files/", {
    method: "GET",
    headers: {
      Accept: request.headers.get("accept") ?? "application/json",
      Cookie: request.headers.get("cookie") ?? "",
      Referer: request.headers.get("referer") ?? "",
      Origin: request.headers.get("origin") ?? "",
    },
  });
}
