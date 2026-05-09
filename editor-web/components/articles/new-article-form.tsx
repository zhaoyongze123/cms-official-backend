"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createArticle } from "../../lib/api-client";

export function NewArticleForm() {
  const router = useRouter();
  const [title, setTitle] = useState("新的 AI SEO 草稿");
  const [message, setMessage] = useState("当前创建动作只写入 Next.js 本地 Mock 数据。");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const article = await createArticle(title);
        setMessage(`已创建 Mock 草稿 #${article.article_id}，正在进入编辑页。`);
        router.push(`/studio/articles/${article.article_id}`);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "未知错误";
        setMessage(`创建失败：${detail}`);
      }
    });
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <h2>创建 Mock 草稿</h2>
          <p>只验证 Studio 新建流程和契约字段，不代表 Django `POST /api/articles/` 已联调。</p>
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="article-title">
          文章标题
        </label>
        <input
          id="article-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="输入文章标题"
          value={title}
        />
      </div>
      <div className="form-actions">
        <button className="cta primary" disabled={isPending || title.trim().length === 0} type="submit">
          {isPending ? "创建中..." : "创建并进入编辑"}
        </button>
        <span className="form-message">{message}</span>
      </div>
    </form>
  );
}
