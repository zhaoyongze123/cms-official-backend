"use client";

import { useState } from "react";
import { createManagedPage, updateManagedPage, DjangoValidationError } from "../../lib/api-client";
import type { ManagedPageRecord } from "../../lib/pages";

export function ManagedPageEditor({ page }: { page?: ManagedPageRecord }) {
  const [form, setForm] = useState({
    path: page?.path ?? "/new-page",
    title: page?.title ?? "",
    template_key: page?.template_key ?? "default",
    status: page?.status ?? "draft",
    content_html: page?.content_html ?? "",
    meta_description: page?.meta_description ?? "",
    canonical_url: page?.canonical_url ?? "",
    robots: page?.robots ?? "index,follow",
  });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setBusy(true);
    try {
      const result = page
        ? await updateManagedPage(page.page_id, form)
        : await createManagedPage(form);
      setNotice(`已保存：${result.path}`);
      if (!page) window.history.replaceState(null, "", `/studio/pages/${result.page_id}`);
    } catch (error) {
      setNotice(error instanceof DjangoValidationError ? error.message : "保存失败，请检查登录态和字段。" );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel page-editor-panel">
      <div className="panel-heading"><div><h1>{page ? "编辑页面" : "新增页面"}</h1><p>页面样式由前端模板控制，内容只保存为页面数据。</p></div></div>
      <div className="form-grid">
        <label>页面 URL<input value={form.path} onChange={(event) => setField("path", event.target.value)} /></label>
        <label>页面标题<input value={form.title} onChange={(event) => setField("title", event.target.value)} /></label>
        <label>前端模板<select value={form.template_key} onChange={(event) => setField("template_key", event.target.value)}><option value="default">标准页面</option><option value="rich-text">富文本页面</option></select></label>
        <label>状态<select value={form.status} onChange={(event) => setField("status", event.target.value)}><option value="draft">草稿</option><option value="published">发布</option></select></label>
        <label className="form-grid-wide">页面 HTML 内容<textarea rows={14} value={form.content_html} onChange={(event) => setField("content_html", event.target.value)} /></label>
        <label className="form-grid-wide">SEO 描述<textarea rows={3} value={form.meta_description} onChange={(event) => setField("meta_description", event.target.value)} /></label>
        <label>Canonical URL<input value={form.canonical_url} onChange={(event) => setField("canonical_url", event.target.value)} /></label>
        <label>Robots<input value={form.robots} onChange={(event) => setField("robots", event.target.value)} /></label>
      </div>
      <div className="cta-row"><button className="cta primary" disabled={busy} onClick={() => void submit()} type="button">{busy ? "保存中..." : "保存页面"}</button>{notice ? <span className="caption">{notice}</span> : null}</div>
    </section>
  );
}
