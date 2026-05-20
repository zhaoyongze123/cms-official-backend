"use client";

import { Building2, Globe2, ShieldCheck, Sparkles } from "lucide-react";

import PublicLayout from "./public-layout";

const capabilityCards = [
  {
    title: "云架构咨询",
    description: "围绕企业上云、混合云治理与业务连续性，提供从评估、规划到实施的完整交付能力。",
    icon: Globe2,
  },
  {
    title: "企业级运维",
    description: "覆盖监控巡检、容灾加固、故障响应与资源优化，持续保障生产系统稳定运行。",
    icon: ShieldCheck,
  },
  {
    title: "方案落地能力",
    description: "连接公有云、企业邮箱、归档、安全与协同平台，帮助客户把方案真正部署到业务现场。",
    icon: Building2,
  },
  {
    title: "AI 场景实践",
    description: "在知识库、表单自动化、内部协作等场景中推进 AI 能力落地，强调可用、可控、可维护。",
    icon: Sparkles,
  },
];

export default function PublicAboutPage() {
  return (
    <PublicLayout active="about">
      <section className="px-6 pb-20 pt-36">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex rounded-full bg-hermes/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-hermes">
              About Yuncan
            </span>
            <h1 className="mt-8 max-w-4xl text-5xl font-black leading-tight text-charcoal md:text-6xl">
              上海云璨信息技术有限公司
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-9 text-muted">
              云璨长期专注企业信息化基础设施、云架构与运维服务，围绕上云咨询、系统集成、邮件与归档、安全加固、知识管理与 AI
              场景落地，持续为企业提供面向生产环境的技术支持与解决方案。
            </p>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-muted">
              当前页面先作为独立静态介绍页，后续可以继续扩展公司历程、资质荣誉、合作伙伴与客户服务网络等模块。
            </p>
          </div>

          <div className="rounded-[2rem] border border-line bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-hermes">Company Snapshot</div>
            <div className="mt-8 space-y-6">
              <div className="border-b border-line pb-6">
                <div className="text-sm font-bold text-muted">成立时间</div>
                <div className="mt-2 text-3xl font-black text-charcoal">2011</div>
              </div>
              <div className="border-b border-line pb-6">
                <div className="text-sm font-bold text-muted">核心方向</div>
                <div className="mt-2 text-xl font-black text-charcoal">企业上云 / 运维治理 / 方案交付</div>
              </div>
              <div className="border-b border-line pb-6">
                <div className="text-sm font-bold text-muted">服务方式</div>
                <div className="mt-2 text-xl font-black text-charcoal">咨询规划、项目实施、持续运维</div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted">联系邮箱</div>
                <div className="mt-2 text-xl font-black text-charcoal">service@yuncan.com</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-mist px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-hermes shadow-sm">
              Core Capability
            </span>
            <h2 className="mt-6 text-4xl font-black text-charcoal md:text-5xl">以可落地为标准组织技术服务</h2>
            <p className="mt-6 text-lg leading-8 text-muted">
              我们更关注方案能否在真实环境持续运行，而不是只停留在展示层。页面后续可以继续加入资质、团队、里程碑和案例摘要。
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {capabilityCards.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-[1.75rem] border border-line bg-white p-7 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-hermes/10 text-hermes">
                  <Icon size={26} />
                </div>
                <h3 className="mt-6 text-2xl font-black text-charcoal">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
