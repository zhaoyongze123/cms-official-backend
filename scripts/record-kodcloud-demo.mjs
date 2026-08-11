#!/usr/bin/env node

import { mkdir, rename } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(repositoryRoot, "apps/public-web/package.json"));
const { chromium } = require("playwright-core");

const baseUrl = "https://demo.box.kodcloud.com/";
const outputDirectory = path.join(repositoryRoot, "apps/public-web/public/media/ai-drive/raw");
const browserPath = process.env.KODCLOUD_CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const username = process.env.KODCLOUD_DEMO_USERNAME;
const password = process.env.KODCLOUD_DEMO_PASSWORD;

if (!username || !password) {
  throw new Error("请通过 KODCLOUD_DEMO_USERNAME 与 KODCLOUD_DEMO_PASSWORD 提供演示账号。");
}

async function installCursor(page) {
  await page.addStyleTag({
    content: `
      #yuncan-recording-cursor { position: fixed; z-index: 2147483647; width: 22px; height: 22px; margin: -4px 0 0 -4px; pointer-events: none; transform: translate3d(0, 0, 0); transition: transform 120ms linear; }
      #yuncan-recording-cursor::before { content: ""; position: absolute; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-left: 14px solid #ff7900; filter: drop-shadow(0 1px 2px rgba(0,0,0,.28)); transform: rotate(-38deg); transform-origin: 0 50%; }
      #yuncan-recording-cursor::after { content: ""; position: absolute; inset: -12px; border: 2px solid rgba(255,121,0,.85); border-radius: 999px; opacity: 0; }
      #yuncan-recording-cursor.is-clicking::after { animation: yuncan-recording-click 420ms ease-out; }
      #yuncan-recording-focus { position: fixed; z-index: 2147483646; box-sizing: border-box; border: 2px solid rgba(255,121,0,.92); border-radius: 6px; box-shadow: 0 0 0 5px rgba(255,121,0,.16); opacity: 0; pointer-events: none; transition: opacity 120ms ease; }
      #yuncan-recording-focus.is-visible { opacity: 1; animation: yuncan-recording-focus 900ms ease-in-out infinite; }
      @keyframes yuncan-recording-click { from { transform: scale(.25); opacity: 1; } to { transform: scale(1.45); opacity: 0; } }
      @keyframes yuncan-recording-focus { 50% { box-shadow: 0 0 0 10px rgba(255,121,0,0); } }
    `,
  });
  await page.evaluate(() => {
    const cursor = document.createElement("div");
    cursor.id = "yuncan-recording-cursor";
    cursor.setAttribute("aria-hidden", "true");
    document.body.append(cursor);
    const focus = document.createElement("div");
    focus.id = "yuncan-recording-focus";
    focus.setAttribute("aria-hidden", "true");
    document.body.append(focus);
  });
}

async function moveCursor(page, x, y) {
  await page.mouse.move(x, y, { steps: 12 });
  await page.evaluate(({ x: cursorX, y: cursorY }) => {
    const cursor = document.getElementById("yuncan-recording-cursor");
    if (cursor) cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
  }, { x, y });
}

async function showFocus(page, box) {
  await page.evaluate(({ x, y, width, height }) => {
    const focus = document.getElementById("yuncan-recording-focus");
    if (!focus) return;
    focus.style.left = `${x - 5}px`;
    focus.style.top = `${y - 5}px`;
    focus.style.width = `${width + 10}px`;
    focus.style.height = `${height + 10}px`;
    focus.classList.add("is-visible");
  }, box);
}

async function hideFocus(page) {
  await page.evaluate(() => document.getElementById("yuncan-recording-focus")?.classList.remove("is-visible"));
}

async function guidedClick(page, locator) {
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  if (!box) throw new Error("无法获取待点击元素的位置。");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await showFocus(page, box);
  await moveCursor(page, x, y);
  await page.waitForTimeout(520);
  await page.evaluate(() => {
    const cursor = document.getElementById("yuncan-recording-cursor");
    if (!cursor) return;
    cursor.classList.remove("is-clicking");
    void cursor.offsetWidth;
    cursor.classList.add("is-clicking");
  });
  await page.mouse.click(x, y);
  await page.waitForTimeout(520);
  await hideFocus(page);
}

async function login(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "登录账号" }).fill(username);
  await page.getByRole("textbox", { name: "密码" }).fill(password);
  await page.getByText("登录", { exact: true }).click();
  await page.waitForTimeout(2000);
  const storageState = await context.storageState();
  await context.close();
  return storageState;
}

async function recordScene(browser, storageState, filename, route, actions) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState,
    recordVideo: { dir: outputDirectory, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const video = page.video();
  await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "networkidle" });
  await installCursor(page);
  await page.waitForTimeout(700);
  await actions(page);
  await page.waitForTimeout(9000);
  await context.close();
  await rename(await video.path(), path.join(outputDirectory, filename));
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: browserPath });
  try {
    const storageState = await login(browser);
    await recordScene(browser, storageState, "scene-01-folder-qa.webm", "#ai/chat", async (page) => {
      await guidedClick(page, page.getByTitle("添加文件夹"));
      await guidedClick(page, page.getByRole("button", { name: "确定" }));
      const editor = page.locator("[contenteditable=true]").last();
      await guidedClick(page, editor);
      await editor.fill("请总结这个文件夹中的资料。");
      await guidedClick(page, page.getByTitle("发送", { exact: true }));
    });
    await recordScene(browser, storageState, "scene-02-agent.webm", "#ai/chat", async (page) => {
      await guidedClick(page, page.getByText("全部应用").first());
      await guidedClick(page, page.getByText("新建智能体").first());
    });
    await recordScene(browser, storageState, "scene-03-model-settings.webm", "#ai/admin", async (page) => {
      await guidedClick(page, page.getByText("设置", { exact: true }));
    });
    await recordScene(browser, storageState, "scene-04-upload-rag.webm", "#ai/admin", async (page) => {
      await guidedClick(page, page.getByText("RAG 检索增强", { exact: true }));
    });
  } finally {
    await browser.close();
  }
}

await main();
