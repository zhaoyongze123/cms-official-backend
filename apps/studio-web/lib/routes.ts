export const STUDIO_PROXY_BASE_PATH = "/django-admin/next-editor";

export function studioProxyPath(path: string) {
  if (path === STUDIO_PROXY_BASE_PATH || path.startsWith(`${STUDIO_PROXY_BASE_PATH}/`)) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${STUDIO_PROXY_BASE_PATH}${path}`;
  }

  return `${STUDIO_PROXY_BASE_PATH}/${path}`;
}
