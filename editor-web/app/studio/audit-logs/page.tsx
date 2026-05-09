import { PlaceholderPage } from "../../../components/studio/placeholder-page";

export default function AuditLogsPage() {
  return (
    <PlaceholderPage
      currentSupport={[
        { label: "AuditLog", status: "Django 模型存在" },
        { label: "Django Admin", status: "可查看管理侧记录" },
        { label: "Studio 审计日志", status: "当前只保留只读表格壳" },
      ]}
      description="审计日志在文档中明确为只有模型/Admin 支撑的领域，当前不能写成已可联调。"
      eyebrow="Studio / Audit"
      missingApi={["审计日志列表 API", "审计筛选 API", "用户资料 API", "权限策略 API"]}
      title="审计日志页当前只做目标入口。"
    />
  );
}
