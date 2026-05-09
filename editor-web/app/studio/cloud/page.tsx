import { PlaceholderPage } from "../../../components/studio/placeholder-page";

export default function CloudPage() {
  return (
    <PlaceholderPage
      currentSupport={[
        { label: "EcsInstanceSnapshot", status: "Django 模型存在" },
        { label: "DnsDomainStat", status: "Django 模型存在" },
        { label: "EcsMetricPoint", status: "Django 模型存在" },
      ]}
      description="云资源监控不是内容编辑主线，当前没有公开 JSON API。本页只保留后台入口和边界说明。"
      eyebrow="Studio / Cloud"
      missingApi={["云资源指标聚合 API", "ECS 实例列表 API", "DNS 统计 API", "趋势查询 API"]}
      title="云资源监控入口已预留。"
    />
  );
}
