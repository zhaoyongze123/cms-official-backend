"use client";

export interface WechatShareContent {
  title: string;
  desc: string;
  link: string;
  imgUrl: string;
}

interface WechatJsConfig {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
}

declare global {
  interface Window {
    wx?: {
      config(config: { appId: string; timestamp: number; nonceStr: string; signature: string; jsApiList: string[] }): void;
      ready(callback: () => void): void;
      error(callback: (error: unknown) => void): void;
      updateAppMessageShareData(data: WechatShareContent & { success?: () => void }): void;
      updateTimelineShareData(data: Omit<WechatShareContent, "desc"> & { success?: () => void }): void;
      onMenuShareAppMessage(data: WechatShareContent & { type?: string; dataUrl?: string; success?: () => void; cancel?: () => void; fail?: (error: unknown) => void }): void;
      onMenuShareTimeline(data: Omit<WechatShareContent, "desc"> & { success?: () => void; cancel?: () => void; fail?: (error: unknown) => void }): void;
    };
  }
}

const WX_SDK_URL = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";

function isWechatBrowser(): boolean {
  return typeof navigator !== "undefined" && /micromessenger/i.test(navigator.userAgent);
}

function loadWechatSdk(): Promise<void> {
  if (typeof window === "undefined" || window.wx) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-wechat-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("微信 JS-SDK 加载失败")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = WX_SDK_URL;
    script.async = true;
    script.dataset.wechatSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("微信 JS-SDK 加载失败"));
    document.head.appendChild(script);
  });
}

async function fetchWechatConfig(pageUrl: string): Promise<WechatJsConfig> {
  const baseUrl = (process.env.NEXT_PUBLIC_DJANGO_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/api/public/wechat/js-config/?url=${encodeURIComponent(pageUrl)}`;
  const response = await fetch(endpoint, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`微信签名接口返回 ${response.status}`);
  return response.json() as Promise<WechatJsConfig>;
}

export async function configureWechatShare(content: WechatShareContent): Promise<void> {
  if (!isWechatBrowser() || typeof window === "undefined") return;
  const pageUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  await loadWechatSdk();
  if (!window.wx) throw new Error("微信 JS-SDK 未就绪");
  const config = await fetchWechatConfig(pageUrl);
  window.wx.config({
    ...config,
    jsApiList: [
      "updateAppMessageShareData",
      "updateTimelineShareData",
      "onMenuShareAppMessage",
      "onMenuShareTimeline",
    ],
  });
  window.wx.ready(() => {
    const timelineContent = { title: content.title, link: content.link, imgUrl: content.imgUrl };
    // 新版接口覆盖新微信客户端，旧版接口兼容部分 iOS/公众号环境。
    window.wx?.updateAppMessageShareData(content);
    window.wx?.updateTimelineShareData(timelineContent);
    window.wx?.onMenuShareAppMessage({ ...content, type: "link", dataUrl: "" });
    window.wx?.onMenuShareTimeline(timelineContent);
  });
}
