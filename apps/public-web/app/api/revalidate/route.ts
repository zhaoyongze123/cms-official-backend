import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const expectedToken = process.env.PUBLIC_WEB_REVALIDATE_TOKEN?.trim();
  const providedToken = request.headers.get("x-revalidate-token")?.trim();

  if (!expectedToken || !providedToken || providedToken !== expectedToken) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  revalidateTag("public-api", { expire: 0 });
  return Response.json({ revalidated: true, tag: "public-api" });
}
