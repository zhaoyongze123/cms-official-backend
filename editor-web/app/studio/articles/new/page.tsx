import Link from "next/link";

export default function NewArticlePage() {
  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">New Article</span>
        <h1>新建文章占位页已预留。</h1>
        <p>
          当前分支不持久化真正的新建结果，只固定路由、交互入口和后续表单落点。
          在接入 Django `POST /api/articles/` 之前，这里作为工作台流程演示页存在。
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

      <section className="panel">
        <h2>下一步对接清单</h2>
        <ul className="mono-list">
          <li>调用 `POST /api/articles/` 创建草稿文章</li>
          <li>创建成功后跳转到 <code>/studio/articles/:id</code></li>
          <li>复用 A07 编辑壳并接入 A08 TipTap 保存逻辑</li>
        </ul>
      </section>
    </div>
  );
}
