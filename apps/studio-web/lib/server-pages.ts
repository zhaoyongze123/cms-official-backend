import "server-only";

import { proxyDjangoRequest } from "./django-proxy";
import type { ManagedPageRecord } from "./pages";

export async function fetchServerPages() {
  const response = await proxyDjangoRequest("/api/pages/", { method: "GET" });
  if (!response.ok) {
    throw new Error(`页面列表请求失败: ${response.status}`);
  }
  return (JSON.parse(await response.text()) as ManagedPageRecord[]);
}

export async function fetchServerPage(pageId: number) {
  const response = await proxyDjangoRequest(`/api/pages/${pageId}/`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`页面请求失败: ${response.status}`);
  }
  return JSON.parse(await response.text()) as ManagedPageRecord;
}
