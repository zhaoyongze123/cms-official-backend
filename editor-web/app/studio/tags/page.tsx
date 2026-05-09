import { PlaceholderPage } from "../../../components/studio/placeholder-page";

export default function TagsPage() {
  return (
    <PlaceholderPage
      currentSupport={[
        { label: "Tag", status: "Django 模型存在" },
        { label: "文章标签展示", status: "Mock Article 字段已包含 tags" },
        { label: "Studio 标签管理", status: "当前只保留目标路由" },
      ]}
      description="标签管理还没有面向 Studio 的公开 API，因此本页不提供新增、编辑、删除操作。"
      eyebrow="Studio / Tags"
      missingApi={["标签列表 API", "标签新建 API", "标签编辑 API", "标签删除 API"]}
      title="标签管理入口已预留。"
    />
  );
}
