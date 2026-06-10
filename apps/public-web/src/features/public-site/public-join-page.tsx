"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, FileCheck2, Phone, QrCode, ShieldCheck, TicketPercent, TimerReset } from "lucide-react";

import PublicLayout from "./public-layout";

const benefits = [
  {
    icon: TicketPercent,
    title: "代理渠道折扣",
    description: "享受官网以外的代理商专属优惠，注册后即可对接企业方案与价格支持。",
  },
  {
    icon: BadgeCheck,
    title: "注册全程辅助",
    description: "注册与实名认证全程由专人协助，减少反复沟通与材料试错。",
  },
  {
    icon: FileCheck2,
    title: "合规票据齐全",
    description: "合同、发票、报备链路完整，满足企业采购与财税归档要求。",
  },
  {
    icon: TimerReset,
    title: "全周期跟进",
    description: "从报备到注册完成再到后续续费提醒，持续协同，不中断服务。",
  },
];

const steps = [
  {
    number: "1",
    title: "提供企业全称",
    description: "将营业执照上的标准企业名称发送给我们，用于渠道关联报备。",
    badge: "您来做",
  },
  {
    number: "2",
    title: "我们后台报备",
    description: "在阿里云渠道系统完成企业关联备案，正常约 1 个工作日内完成。",
    badge: "约 1 个工作日",
  },
  {
    number: "3",
    title: "注册并实名认证",
    description: "报备成功后完成官网注册与实名认证，即可享受对应折扣权益。",
    badge: "享折扣权益",
  },
];

const faqItems = [
  {
    question: "关联注册与直接官网注册的区别？",
    answer: "通过云璨关联注册后可享代理渠道折扣与专属服务，直接官网注册通常无法获得同类渠道权益。",
  },
  {
    question: "需要准备哪些材料？",
    answer: "通常只需要提供营业执照上的标准企业全称。后续如有实名认证辅助需求，我们会按阿里云页面提示协助准备。",
  },
  {
    question: "关联报备是否收费？",
    answer: "报备本身免费，我们负责协助完成关联流程，不额外收取报备服务费。",
  },
];

function BenefitCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(250,252,255,0.9)_100%)] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03] backdrop-blur transition-transform duration-300 hover:-translate-y-1">
      <div className="absolute inset-x-6 top-0 h-1 rounded-full bg-[linear-gradient(90deg,rgba(244,114,37,0.95)_0%,rgba(245,158,11,0.55)_100%)]" />
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(244,114,37,0.14)_0%,rgba(255,255,255,0.95)_100%)] text-hermes shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        <Icon size={22} />
      </div>
      <h3 className="text-xl font-black text-charcoal">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
    </div>
  );
}

export default function PublicJoinPage() {
  return (
    <PublicLayout active="join">
      <section className="border-b border-line bg-[radial-gradient(circle_at_top_left,rgba(255,228,198,0.42),transparent_32%),linear-gradient(180deg,#fff_0%,#fff8f0_100%)] px-6 pb-20 pt-36">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[2.8rem] border border-[#f8dcc4] bg-[linear-gradient(135deg,rgba(255,248,238,0.98)_0%,rgba(255,240,214,0.92)_100%)] px-8 py-8 shadow-[0_34px_90px_rgba(244,114,37,0.12)] ring-1 ring-white/60 md:px-12 md:py-10">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-hermes/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-amber-200/25 blur-3xl" />
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div className="relative pl-6">
                <div className="absolute left-0 top-1 h-32 w-1 rounded-full bg-hermes" />
                <span className="inline-flex rounded-full bg-hermes px-4 py-2 text-xs font-black tracking-[0.18em] text-white">
                  阿里云授权合作伙伴
                </span>
                <h1 className="mt-6 text-4xl font-black leading-tight text-charcoal md:text-5xl">
                  通过云璨关联注册，
                  <br />
                  享企业专属折扣
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
                  无需自己摸索报备链路。提供企业全称后，我们协助完成渠道关联、注册前报备与后续跟进，帮助企业更稳妥地拿到对应权益。
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-charcoal/70">
                  <span>专人辅助</span>
                  <span>·</span>
                  <span>全程陪同</span>
                  <span>·</span>
                  <span>合规票据</span>
                </div>
              </div>

              <div className="rounded-[2.2rem] border border-white/75 bg-white/72 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] backdrop-blur-sm">
                <div className="flex items-center gap-3 text-hermes">
                  <ShieldCheck size={20} />
                  <span className="text-sm font-black tracking-[0.16em]">注册权益</span>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {benefits.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[1.6rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(252,247,242,0.88)_100%)] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]"
                    >
                      <div className="text-lg font-black text-charcoal">{item.title}</div>
                      <div className="mt-2 text-sm leading-6 text-muted">{item.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {benefits.map((item) => (
              <BenefitCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3 text-muted">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-hermes">Registration Flow</span>
            <div className="h-px flex-1 bg-line" />
          </div>
          <h2 className="mt-5 text-4xl font-black text-charcoal md:text-5xl">注册流程</h2>

          <div className="relative mt-14 overflow-hidden rounded-[2.8rem] border border-line/70 bg-[linear-gradient(180deg,rgba(250,252,255,0.92)_0%,rgba(255,255,255,0.96)_100%)] px-6 py-8 shadow-[0_30px_80px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.02] md:px-8 lg:px-10">
            <div className="absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(244,114,37,0.35),transparent)]" />
            <div className="relative grid gap-8 lg:grid-cols-3">
            <div className="absolute left-[4.5rem] right-[4.5rem] top-10 hidden h-1 rounded-full bg-line lg:block" />
            <div className="absolute left-[4.5rem] top-10 hidden h-1 w-[calc(66%-4.5rem)] rounded-full bg-hermes lg:block" />

            {steps.map((step, index) => (
              <div
                key={step.number}
                className="relative rounded-[2.2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,253,0.92)_100%)] p-8 shadow-[0_18px_42px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03]"
              >
                <div className={`absolute inset-x-8 top-0 h-1 rounded-full ${index < 2 ? "bg-hermes/90" : "bg-slate-200"}`} />
                <div
                  className={`mb-8 flex h-20 w-20 items-center justify-center rounded-full border-4 text-3xl font-black ${
                    index < 2
                      ? "border-hermes bg-hermes text-white shadow-[0_18px_44px_rgba(244,114,37,0.26)]"
                      : "border-line bg-white text-charcoal/40"
                  }`}
                >
                  {step.number}
                </div>
                <h3 className="text-3xl font-black text-charcoal">{step.title}</h3>
                <p className="mt-4 text-base leading-8 text-muted">{step.description}</p>
                <div
                  className={`mt-8 inline-flex rounded-full px-4 py-2 text-sm font-black ${
                    index < 2 ? "bg-hermes/10 text-hermes" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {step.badge}
                </div>
              </div>
            ))}
            </div>
          </div>

          <div className="mt-10 rounded-[2.2rem] border border-[#f2df84] bg-[linear-gradient(180deg,rgba(255,253,242,0.98)_0%,rgba(255,248,219,0.86)_100%)] px-6 py-6 shadow-[0_18px_42px_rgba(245,158,11,0.1)] ring-1 ring-[#fff6cf] md:px-8">
            <div className="text-2xl font-black text-[#d97706]">注意</div>
            <p className="mt-3 text-base leading-8 text-charcoal/78">
              阿里云关联注册暂无独立在线入口，需通过授权合作伙伴人工报备后再操作。通常只需提供企业全称，我们协助完成渠道关联与后续流程，报备免费。
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-[linear-gradient(180deg,#f7f9fc_0%,#eef2f7_100%)] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3 text-muted">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-hermes">Get Started</span>
            <div className="h-px flex-1 bg-line" />
          </div>
          <h2 className="mt-5 text-4xl font-black text-charcoal md:text-5xl">立即开始</h2>

          <div className="mt-10 overflow-hidden rounded-[2.6rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,252,0.94)_100%)] p-8 shadow-[0_26px_70px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03] md:p-10">
            <div className="text-center text-4xl font-black text-charcoal">
              发送企业全称给我们，即可启动报备
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(249,251,254,0.98)_0%,rgba(255,255,255,0.92)_100%)] p-6 shadow-[0_16px_38px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.03]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.7rem] border border-white/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]">
                    <div className="flex items-center gap-3 text-hermes">
                      <Phone size={18} />
                      <span className="text-sm font-black tracking-[0.14em]">电话联系</span>
                    </div>
                    <div className="mt-3 text-3xl font-black text-charcoal">021-50583875</div>
                    <div className="mt-2 text-sm leading-6 text-muted">工作日可直接沟通企业名称、业务背景与注册计划。</div>
                  </div>
                  <div className="rounded-[1.7rem] border border-white/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]">
                    <div className="flex items-center gap-3 text-hermes">
                      <ArrowRight size={18} />
                      <span className="text-sm font-black tracking-[0.14em]">邮件联系</span>
                    </div>
                    <div className="mt-3 break-all text-2xl font-black text-charcoal">service@yuncan.com</div>
                    <div className="mt-2 text-sm leading-6 text-muted">适合发送企业标准全称、联系人与采购背景，便于归档跟进。</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(249,251,255,0.92)_100%)] p-6 shadow-[0_16px_38px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03]">
                <div className="flex items-center gap-3 text-hermes">
                  <QrCode size={18} />
                  <span className="text-sm font-black tracking-[0.14em]">企微二维码</span>
                </div>
                <div className="mt-5 flex justify-center rounded-[2rem] bg-[linear-gradient(180deg,#f7f9fc_0%,#f2f5fa_100%)] p-5 ring-1 ring-black/[0.02]">
                  <Image
                    alt="云璨企微二维码"
                    className="h-56 w-56 rounded-[1.3rem] object-cover"
                    height={224}
                    src="/contact-qr.png"
                    width={224}
                  />
                </div>
                <p className="mt-5 text-center text-sm leading-7 text-muted">
                  扫码后发送企业全称，我们会协助确认报备方式、预计时效和后续操作步骤。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="inline-flex rounded-full bg-hermes/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-hermes">
                FAQ
              </span>
              <h2 className="mt-6 text-4xl font-black text-charcoal md:text-5xl">常见问题</h2>
              <p className="mt-6 text-lg leading-8 text-muted">
                把最常被问到的流程差异、材料要求和费用边界提前说明，减少注册前的信息不对称。
              </p>
            </div>

            <div className="space-y-5">
              {faqItems.map((item) => (
                <div
                  key={item.question}
                  className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,253,0.94)_100%)] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.03]"
                >
                  <div className="text-xl font-black text-charcoal">Q　{item.question}</div>
                  <div className="mt-4 text-base leading-8 text-muted">{item.answer}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 overflow-hidden rounded-[2.6rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,253,0.94)_100%)] shadow-[0_24px_64px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03]">
            <div className="border-b border-line/70 px-8 py-6">
              <div className="text-sm font-black uppercase tracking-[0.2em] text-hermes">Authorized Partner</div>
              <h3 className="mt-3 text-3xl font-black text-charcoal">阿里云合作伙伴授权图</h3>
            </div>
            <div className="grid gap-8 p-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="rounded-[1.8rem] border border-white/80 bg-[linear-gradient(180deg,#f7f9fc_0%,#f2f5fa_100%)] p-4 shadow-[0_14px_36px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]">
                <Image
                  alt="阿里云合作伙伴授权图"
                  className="h-auto w-full rounded-[1.2rem] object-contain"
                  height={251247}
                  src="/about/aliyun-certificate.png"
                  width={251247}
                />
              </div>
              <div>
                <div className="inline-flex rounded-full bg-hermes/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-hermes">
                  资质可核验
                </div>
                <p className="mt-6 text-lg leading-8 text-muted">
                  云璨为阿里云授权合作伙伴，具备对应生态合作资质。页面展示图片来源于官网“关于我们”现有资质素材，保持与站内展示口径一致。
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    className="inline-flex items-center gap-2 rounded-full bg-hermes px-6 py-3 text-sm font-black text-white shadow-[0_16px_38px_rgba(244,114,37,0.24)] transition-transform hover:-translate-y-0.5"
                    href="/about#honors"
                  >
                    查看更多资质
                    <ArrowRight size={16} />
                  </Link>
                  <a
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3 text-sm font-black text-charcoal transition-colors hover:border-hermes hover:text-hermes"
                    href="/about/aliyun-certificate.pdf"
                    target="_blank"
                    rel="noreferrer"
                  >
                    打开原始证书 PDF
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
