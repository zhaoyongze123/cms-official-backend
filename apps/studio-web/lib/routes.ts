import { redirect } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteImpl = any;

export const STUDIO_PROXY_BASE_PATH = "/django-admin/next-editor";

export function studioProxyPath(path: string): RouteImpl {
  if (!path) {
    return "/";
  }

  if (path === STUDIO_PROXY_BASE_PATH) {
    return "/";
  }

  if (path.startsWith(`${STUDIO_PROXY_BASE_PATH}/`)) {
    return path.slice(STUDIO_PROXY_BASE_PATH.length) || "/";
  }

  if (path.startsWith("/")) {
    return path;
  }

  return `/${path}`;
}

export function studioBrowserPath(path: string): string {
  if (!path) {
    return STUDIO_PROXY_BASE_PATH;
  }

  if (path === STUDIO_PROXY_BASE_PATH) {
    return STUDIO_PROXY_BASE_PATH;
  }

  if (path.startsWith(`${STUDIO_PROXY_BASE_PATH}/`)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${STUDIO_PROXY_BASE_PATH}${normalizedPath}`;
}
