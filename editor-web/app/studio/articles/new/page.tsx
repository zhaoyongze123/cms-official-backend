import Link from "next/link";

import { NewArticleForm } from "../../../../components/articles/new-article-form";

export default function NewArticlePage() {
  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">New Article</span>
        <h1>创建一篇用于本地演示的文章草稿。</h1>
        <p>
          当前表单调用的是 Next.js 本地 Mock API。它用于验证新建、跳转和编辑体验，
          不代表 Django 文章创建接口已经真实落地。
        </p>
        <div className="cta-row">
          <Link className="cta primary" href="/studio/articles">
            返回文章列表
          </Link>
          <a className="cta" href="/api/articles" target="_blank" rel="noreferrer">
            查看当前 Mock 数据
          </a>
        </div>
      </section>

      <NewArticleForm />
    </div>
  );
}
