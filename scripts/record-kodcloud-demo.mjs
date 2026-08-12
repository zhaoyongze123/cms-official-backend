#!/usr/bin/env node

import { access, mkdir } from "node:fs/promises";
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
const storageStatePath = process.env.KODCLOUD_STORAGE_STATE;
const username = process.env.KODCLOUD_DEMO_USERNAME;
const password = process.env.KODCLOUD_DEMO_PASSWORD;
const requestedScenes = new Set((process.env.KODCLOUD_RECORD_SCENES || "1,2,3,4").split(",").map((scene) => scene.trim()));
const agentName = "AI解决方案演示助手";
const viewport = { width: 1280, height: 672 };

const pause = (page, milliseconds = 700) => page.waitForTimeout(milliseconds);

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
    for (const id of ["yuncan-recording-cursor", "yuncan-recording-focus"]) {
      document.getElementById(id)?.remove();
    }
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
  await page.mouse.move(x, y, { steps: 8 });
  await page.evaluate(({ cursorX, cursorY }) => {
    const cursor = document.getElementById("yuncan-recording-cursor");
    if (cursor) cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
  }, { cursorX: x, cursorY: y });
}

async function setFocus(page, box, visible) {
  await page.evaluate(({ focusBox, shouldShow }) => {
    const focus = document.getElementById("yuncan-recording-focus");
    if (!focus) return;
    if (shouldShow && focusBox) {
      focus.style.left = `${focusBox.x - 5}px`;
      focus.style.top = `${focusBox.y - 5}px`;
      focus.style.width = `${focusBox.width + 10}px`;
      focus.style.height = `${focusBox.height + 10}px`;
    }
    focus.classList.toggle("is-visible", shouldShow);
  }, { focusBox: box, shouldShow: visible });
}

async function clickEffect(page) {
  await page.evaluate(() => {
    const cursor = document.getElementById("yuncan-recording-cursor");
    if (!cursor) return;
    cursor.classList.remove("is-clicking");
    void cursor.offsetWidth;
    cursor.classList.add("is-clicking");
  });
}

async function guidedPointer(page, locator, action) {
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  if (!box) throw new Error("无法获取待操作元素的位置。");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await setFocus(page, box, true);
  await moveCursor(page, x, y);
  await pause(page, 420);
  await clickEffect(page);
  await action(x, y);
  await pause(page, 420);
  await setFocus(page, null, false);
  await pause(page);
}

const guidedClick = (page, locator) => guidedPointer(page, locator, (x, y) => page.mouse.click(x, y));
const guidedDoubleClick = (page, locator) => guidedPointer(page, locator, (x, y) => page.mouse.dblclick(x, y, { delay: 110 }));
const guidedRightClick = (page, locator) => guidedPointer(page, locator, (x, y) => page.mouse.click(x, y, { button: "right" }));

async function guidedFill(page, locator, value) {
  await locator.waitFor({ state: "visible" });
  await guidedClick(page, locator);
  await locator.fill("");
  await locator.pressSequentially(value, { delay: 35 });
  await pause(page, 650);
}

function fileItem(page, name) {
  return page.locator(".file").filter({ hasText: name }).first();
}

async function openDemoFolder(page, name) {
  await page.goto(new URL("#/", baseUrl).toString(), { waitUntil: "networkidle" });
  await pause(page, 1200);
  const companyRoot = page.getByText("公司总部", { exact: true }).first();
  await guidedClick(page, companyRoot);
  await fileItem(page, "AI测试资料").waitFor({ state: "visible" });
  await guidedDoubleClick(page, fileItem(page, "AI测试资料"));
  await guidedDoubleClick(page, fileItem(page, name));
}

async function openPolicyFolder(page) {
  await openDemoFolder(page, "制度问答");
  await fileItem(page, "员工考勤管理制度.docx").waitFor({ state: "visible" });
}

async function login(browser) {
  if (storageStatePath) {
    await access(storageStatePath);
    return storageStatePath;
  }
  if (!username || !password) {
    throw new Error("请通过 KODCLOUD_STORAGE_STATE 或 KODCLOUD_DEMO_USERNAME / KODCLOUD_DEMO_PASSWORD 提供演示会话。");
  }
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "登录账号" }).fill(username);
  await page.getByRole("textbox", { name: "密码" }).fill(password);
  await page.getByText("登录", { exact: true }).click();
  await page.waitForTimeout(2000);
  const state = await context.storageState();
  await context.close();
  return state;
}

async function recordScene(browser, storageState, filename, actions) {
  const context = await browser.newContext({
    viewport,
    storageState,
    recordVideo: { dir: outputDirectory, size: viewport },
  });
  const page = await context.newPage();
  const video = page.video();
  await actions(page);
  await pause(page, 1500);
  await context.close();
  const destination = path.join(outputDirectory, filename);
  console.info(`导出录制文件: ${filename}`);
  await video.saveAs(destination);
  await video.delete();
}

async function sceneFolderQuestion(page) {
  await openPolicyFolder(page);
  const policyFile = fileItem(page, "员工考勤管理制度.docx");
  await guidedRightClick(page, policyFile);
  const aiAssistant = page.getByText("AI助手", { exact: true }).last();
  await guidedClick(page, aiAssistant);
  const editor = page.locator("[contenteditable=true]:visible").last();
  await editor.waitFor({ state: "visible" });
  await guidedFill(page, editor, "请根据这份员工考勤管理制度，说明迟到和请假的处理规则。");
  await guidedClick(page, page.getByTitle("发送", { exact: true }));
  await pause(page, 3500);
}

async function sceneAgentKnowledgeBase(page) {
  await page.goto(new URL("#ai/agent", baseUrl).toString(), { waitUntil: "networkidle" });
  await pause(page, 800);
  await guidedClick(page, page.locator("[data-action='agentAdd']:visible").first());
  await guidedClick(page, page.getByRole("listitem").filter({ hasText: "基础设置" }));
  const nameInput = page.getByRole("textbox", { name: "名称" });
  await guidedFill(page, nameInput, agentName);
  await guidedClick(page, page.getByRole("combobox").first());
  await guidedClick(page, page.getByText("实用工具", { exact: true }).last());
  await guidedClick(page, page.getByRole("listitem").filter({ hasText: "知识库" }));
  await guidedClick(page, page.getByRole("button", { name: /添加文件/ }));
  const picker = page.frameLocator("iframe").last();
  await fileItem(picker, "AI解决方案.docx").waitFor({ state: "visible" });
  await guidedClick(page, fileItem(picker, "AI解决方案.docx"));
  await guidedClick(page, picker.getByRole("button", { name: "确定" }));
  await guidedClick(page, page.getByRole("button", { name: "保存" }).last());
  const agentCard = page.getByText(agentName, { exact: true }).last();
  await agentCard.scrollIntoViewIfNeeded();
  await agentCard.hover();
  await pause(page, 700);
  const useAgentButton = agentCard.locator("xpath=ancestor::*[contains(@class, 'agent-item') or @cursor='pointer'][1]").locator("[data-action='agentUse']");
  await guidedClick(page, useAgentButton);
  const editor = page.locator("[contenteditable=true]:visible").last();
  await guidedFill(page, editor, "AI解决方案中的数据清洗模块支持哪些文件格式？");
  await guidedClick(page, page.getByTitle("发送", { exact: true }));
  await pause(page, 3500);
}

async function sceneModelSettings(page) {
  await page.goto(new URL("#ai/admin", baseUrl).toString(), { waitUntil: "networkidle" });
  await pause(page, 1200);
  await guidedClick(page, page.getByText("设置", { exact: true }));
  await guidedClick(page, page.getByRole("tablist").getByText("模型服务", { exact: true }));
  await pause(page, 2600);
}

async function sceneUploadAndRag(page) {
  await openDemoFolder(page, "制度问答");
  await guidedClick(page, page.getByRole("button", { name: "上传" }));
  const uploadInput = page.locator('input[type="file"]:not([webkitdirectory])').first();
  await uploadInput.setInputFiles(path.join(repositoryRoot, "tmp/kodcloud-rag-demo.txt"));
  await pause(page, 1800);
  await page.goto(new URL("#ai/admin", baseUrl).toString(), { waitUntil: "networkidle" });
  await pause(page, 1200);
  await guidedClick(page, page.getByText("RAG 检索增强", { exact: true }));
  await pause(page, 3200);
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: browserPath });
  try {
    const storageState = await login(browser);
    const scenes = [
      ["1", "scene-01-folder-qa.webm", sceneFolderQuestion],
      ["2", "scene-02-agent.webm", sceneAgentKnowledgeBase],
      ["3", "scene-03-model-settings.webm", sceneModelSettings],
      ["4", "scene-04-upload-rag.webm", sceneUploadAndRag],
    ];
    for (const [id, filename, action] of scenes) {
      if (requestedScenes.has(id)) {
        console.info(`正在录制场景 ${id}`);
        await recordScene(browser, storageState, filename, action);
      }
    }
  } finally {
    await browser.close();
  }
}

await main();
