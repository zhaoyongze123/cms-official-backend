import Link from "next/link";

import { PlaceholderPage } from "../../../components/studio/placeholder-page";

export default function CategoriesPage() {
  return (
    <>
      <PlaceholderPage
        currentSupport={[
          { label: "Category", status: "Django 模型存在" },
          { label: "Tag", status: "Django 模型存在" },
          { label: "Django Admin", status: "可由管理员维护" },
        ]}
        description="分类与标签当前只能作为文章字段展示，前端不新增管理功能，避免绕过文档边界。"
        eyebrow="Studio / Taxonomy"
        missingApi={["分类列表/保存 API", "标签列表/保存 API", "分类排序 API", "标签搜索 API"]}
        title="分类与标签管理当前是占位入口。"
      />
      <div className="cta-row">
        <Link className="cta" href="/studio/tags">
          查看标签占位页
        </Link>
      </div>
    </>
  );
}
