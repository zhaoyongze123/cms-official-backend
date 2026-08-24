import Link from "next/link";
import type { Route } from "next";
import { fetchServerPages } from "../../../lib/server-pages";

export default async function StudioPagesPage() {
  const pages = await fetchServerPages();
  return <div className="page-stack"><section className="hero"><span className="eyebrow">CMS / Pages</span><h1>页面内容</h1><p>独立页面使用自定义 URL 和前端模板，不与文章发布混用。</p><div className="cta-row"><Link className="cta primary" href={"/studio/pages/new" as Route}>新增页面</Link></div></section><section className="panel"><div className="article-list">{pages.length ? pages.map((page) => <article className="article-card" key={page.page_id}><div className="article-card-head"><span className={`status-pill status-${page.status}`}>{page.status}</span><span className="caption">{page.template_key}</span></div><h3>{page.title}</h3><p>{page.path}</p><div className="cta-row"><Link className="cta primary" href={`/studio/pages/${page.page_id}` as Route}>编辑页面</Link><a className="cta" href={page.path} target="_blank" rel="noreferrer">打开前台</a></div></article>) : <div className="empty-state"><h3>暂无页面</h3><p>创建页面后可在这里管理。</p></div>}</div></section></div>;
}
