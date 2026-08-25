"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, Cloud, Code, Server, Settings, Shield, X, Zap } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import PublicLayout from "./public-layout";
import AiDriveProductShowcase, { type AiDriveProduct } from "./ai-drive-product-showcase";
import PublicLeadForm from "./public-lead-form";
import type { PublicArticle } from "../../lib/articles-api";

gsap.registerPlugin(ScrollTrigger);

function FeatureCard({ icon: Icon, title, desc, index }: { icon: React.ComponentType<{ size?: number }>; title: string; desc: string; index: number }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -10 }}
      className="p-8 bg-white border border-line rounded-2xl hover:border-hermes hover:shadow-2xl hover:shadow-hermes/5 transition-all group"
    >
      <div className="w-14 h-14 bg-mist rounded-xl flex items-center justify-center text-hermes mb-8 group-hover:bg-hermes group-hover:text-white transition-colors duration-500">
        <Icon size={28} />
      </div>
      <h3 className="text-xl font-bold mb-4 text-charcoal">{title}</h3>
      <p className="text-muted leading-relaxed text-sm">{desc}</p>
    </motion.div>
  );
}

interface HomepageSolutionEntry {
  title: string;
  tag: string;
  desc: string;
  href: string;
}

const FALLBACK_SOLUTION_ITEMS: HomepageSolutionEntry[] = [
  {
    tag: "Cloud Infrastructure",
    title: "通用上云方案",
    desc: "针对异地多活、弹性扩容等痛点，提供标准化计算、存储及灾备链路，快速构建稳健云底座。",
    href: "/solutions",
  },
  {
    tag: "Collaboration",
    title: "Zimbra 企业邮箱解决方案",
    desc: "高效协同的邮件系统，支持海量存储、智能过滤及多端同步，深度契合B端办公场景。",
    href: "/solutions",
  },
  {
    tag: "Cloud Storage",
    title: "可道云 (KodCloud) 企业网盘",
    desc: "私有化部署的最佳选择，集文件管理、在线编辑、协作分享于一体的云端资源中心。",
    href: "/solutions",
  },
  {
    tag: "Security",
    title: "等保合规与安全加固",
    desc: "全方位安全防护体系，助力企业快速通过等保测评，构建从边缘到核心的纵深防御架构。",
    href: "/solutions",
  },
];

function buildHomepageSolutionItems(solutionArticles: PublicArticle[]): HomepageSolutionEntry[] {
  if (solutionArticles.length < 4) {
    return FALLBACK_SOLUTION_ITEMS;
  }

  return solutionArticles.slice(0, 4).map((article) => ({
    title: article.title,
    tag: article.categorySlug || "solutions",
    desc: article.excerpt,
    href: `/articles/${article.slug}`,
  }));
}

function SolutionItem({ title, tag, desc, href }: HomepageSolutionEntry) {
  return (
    <motion.a
      href={href}
      whileHover={{ x: 10 }}
      className="group flex flex-col md:flex-row md:items-center justify-between py-8 border-b border-line cursor-pointer"
    >
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-2 py-0.5 bg-hermes/10 text-hermes text-[10px] font-bold rounded uppercase tracking-wider">{tag}</span>
          <h4 className="text-2xl font-bold text-charcoal group-hover:text-hermes transition-colors">{title}</h4>
        </div>
        <p className="text-muted text-sm max-w-xl">{desc}</p>
      </div>
      <div className="mt-4 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-12 h-12 rounded-full border border-hermes flex items-center justify-center text-hermes">
          <ArrowRight size={20} />
        </div>
      </div>
    </motion.a>
  );
}

/* 旧弹窗表单已迁移到独立的 /contact 页面。
  const [values, setValues] = useState<LeadValues>(INITIAL_LEAD_VALUES);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<LeadErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const updateValue = <K extends keyof LeadValues>(name: K, value: LeadValues[K]) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validateOne = (name: keyof LeadValues) => {
    const message = validateLeadField(name, values);
    setErrors((current) => ({ ...current, [name]: message }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = (Object.keys(values) as Array<keyof LeadValues>).reduce<LeadErrors>((result, name) => {
      const message = validateLeadField(name, values);
      if (message) result[name] = message;
      return result;
    }, {});
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/contact-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: values.companyName,
          contact_name: values.contactName,
          phone: values.phone.replace(/\s/g, ""),
          email: values.email,
          requirement: values.requirement,
          privacy_consent: values.privacyConsent,
          source: "homepage_ai_drive_demo",
          referrer: window.location.href,
          website,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = body?.error?.details;
        if (details && typeof details === "object") {
          const fieldMap: Record<string, keyof LeadValues> = {
            company_name: "companyName",
            contact_name: "contactName",
            phone: "phone",
            email: "email",
            privacy_consent: "privacyConsent",
          };
          const serverErrors = Object.entries(details).reduce<LeadErrors>((result, [key, value]) => {
            const field = fieldMap[key];
            if (field) result[field] = Array.isArray(value) ? String(value[0]) : String(value);
            return result;
          }, {});
          if (Object.keys(serverErrors).length > 0) setErrors(serverErrors);
        }
        throw new Error(body?.error?.message || "提交失败，请稍后重试。");
      }
      setSubmitted(true);
      setValues(INITIAL_LEAD_VALUES);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "提交失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
        <CheckCircle2 className="text-hermes" size={44} aria-hidden="true" />
        <h3 className="mt-5 text-balance text-2xl font-black text-charcoal">提交成功</h3>
        <p className="mt-3 max-w-lg text-pretty leading-7 text-muted">云璨顾问将在 1 个工作日内联系您，为您安排可道云 AI 网盘演示。</p>
      </div>
    );
  }

  const fieldClass = "mt-2 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-hermes";
  return (
    <form className="border-t border-line px-5 py-7 md:px-8" noValidate onSubmit={submit}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-balance text-xl font-black text-charcoal">留下联系方式</h3>
          <p className="mt-1 text-pretty text-sm text-muted">架构师将在 1 个工作日内与您联系。</p>
        </div>
        <span className="rounded-full bg-hermes/10 px-3 py-1 text-sm font-bold text-hermes">免费咨询</span>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-bold text-charcoal">
          公司名称 <span className="text-hermes">*</span>
          <input aria-describedby={errors.companyName ? "lead-company-error" : undefined} aria-invalid={Boolean(errors.companyName)} className={fieldClass} maxLength={60} name="companyName" onBlur={() => validateOne("companyName")} onChange={(event) => updateValue("companyName", event.target.value)} value={values.companyName} />
          {errors.companyName ? <span className="mt-1 block text-sm text-red-700" id="lead-company-error">{errors.companyName}</span> : null}
        </label>
        <label className="block text-sm font-bold text-charcoal">
          您的姓名 <span className="text-hermes">*</span>
          <input aria-describedby={errors.contactName ? "lead-name-error" : undefined} aria-invalid={Boolean(errors.contactName)} className={fieldClass} maxLength={20} name="contactName" onBlur={() => validateOne("contactName")} onChange={(event) => updateValue("contactName", event.target.value)} value={values.contactName} />
          {errors.contactName ? <span className="mt-1 block text-sm text-red-700" id="lead-name-error">{errors.contactName}</span> : null}
        </label>
        <label className="block text-sm font-bold text-charcoal">
          手机号码 <span className="text-hermes">*</span>
          <input aria-describedby={errors.phone ? "lead-phone-error" : undefined} aria-invalid={Boolean(errors.phone)} className={fieldClass} inputMode="numeric" maxLength={11} name="phone" onBlur={() => validateOne("phone")} onChange={(event) => updateValue("phone", event.target.value)} placeholder="用于演示预约联系" type="tel" value={values.phone} />
          {errors.phone ? <span className="mt-1 block text-sm text-red-700" id="lead-phone-error">{errors.phone}</span> : null}
        </label>
        <label className="block text-sm font-bold text-charcoal">
          邮箱地址 <span className="font-normal text-muted">（选填）</span>
          <input aria-describedby={errors.email ? "lead-email-error" : undefined} aria-invalid={Boolean(errors.email)} className={fieldClass} maxLength={254} name="email" onBlur={() => validateOne("email")} onChange={(event) => updateValue("email", event.target.value)} placeholder="方便接收方案资料" type="email" value={values.email} />
          {errors.email ? <span className="mt-1 block text-sm text-red-700" id="lead-email-error">{errors.email}</span> : null}
        </label>
      </div>
      <label className="mt-4 block text-sm font-bold text-charcoal">
        咨询需求 <span className="font-normal text-muted">（选填）</span>
        <textarea className={`${fieldClass} min-h-24 resize-y`} maxLength={1000} name="requirement" onChange={(event) => updateValue("requirement", event.target.value)} placeholder="可填写部署规模、现有环境或希望重点了解的能力" value={values.requirement} />
      </label>
      <input aria-hidden="true" autoComplete="off" className="hidden" name="website" onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} value={website} />
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-2 text-sm leading-6 text-muted">
          <input checked={values.privacyConsent} className="mt-1 size-4 accent-hermes" name="privacyConsent" onBlur={() => validateOne("privacyConsent")} onChange={(event) => updateValue("privacyConsent", event.target.checked)} type="checkbox" />
          <span>我已阅读并同意<a className="ml-1 font-bold text-hermes underline underline-offset-2" href="/legal/privacy-policy" target="_blank">隐私政策</a>，同意云璨为本次咨询联系我。</span>
        </label>
        <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-hermes px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-hermes-dark disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
          {submitting ? "提交中..." : "提交咨询"}
        </button>
      </div>
      {errors.privacyConsent ? <p className="mt-2 text-sm text-red-700">{errors.privacyConsent}</p> : null}
      {submitError ? <p className="mt-3 text-sm text-red-700" role="alert">{submitError}</p> : null}
    </form>
  );
}

function DemoConsultationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog aria-labelledby="ai-drive-consultation-title" className="m-auto max-h-[94dvh] w-[min(100%-1rem,42rem)] overflow-hidden rounded-2xl border border-line bg-white p-0 text-charcoal shadow-2xl backdrop:bg-charcoal/65" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} onClose={onClose} ref={dialogRef}>
      <div className="max-h-[94dvh] overflow-y-auto">
        <div className="relative border-b border-line bg-mist px-5 pb-7 pt-10 md:px-8">
          <button aria-label="关闭预约演示" className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-line bg-white text-charcoal transition-colors hover:border-hermes hover:text-hermes" onClick={onClose} type="button"><X size={17} /></button>
          <p className="text-xs font-black tracking-[0.2em] text-hermes">AI DRIVE / DEMO REQUEST</p>
          <h2 className="mt-3 text-3xl font-black text-charcoal" id="ai-drive-consultation-title">预约深度演示</h2>
          <p className="mt-2 text-sm leading-6 text-muted">留下联系方式，云璨顾问将为您安排可道云 AI 网盘的产品演示。</p>
        </div>
        <ContactLeadForm />
      </div>
    </dialog>
  );
}
*/

function DemoConsultationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog aria-labelledby="ai-drive-consultation-title" className="m-auto max-h-[94dvh] w-[min(100%-1rem,42rem)] overflow-hidden rounded-2xl border border-line bg-white p-0 text-charcoal shadow-2xl backdrop:bg-charcoal/65" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} onClose={onClose} ref={dialogRef}>
      <div className="max-h-[94dvh] overflow-y-auto">
        <div className="relative border-b border-line bg-mist px-5 pb-7 pt-10 md:px-8">
          <button aria-label="关闭联系顾问弹窗" className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-line bg-white text-charcoal transition-colors hover:border-hermes hover:text-hermes" onClick={onClose} type="button"><X size={17} /></button>
          <p className="text-xs font-black tracking-[0.2em] text-hermes">AI DRIVE / CONTACT</p>
          <h2 className="mt-3 text-3xl font-black text-charcoal" id="ai-drive-consultation-title">申请免费体验</h2>
          <p className="mt-2 text-sm leading-6 text-muted">留下联系方式，云璨信息将在 1 个工作日内与您联系</p>
        </div>
        <PublicLeadForm source="homepage_ai_drive_consultant" submitLabel="提交申请" successDescription="云璨信息将在 1 个工作日内与您联系。" />
      </div>
    </dialog>
  );
}

interface PublicLandingPageProps {
  solutionArticles: PublicArticle[];
  caseLogoWallImageUrl?: string;
  aiDriveDemos?: Array<{
    title: string;
    description: string;
    highlights: string[];
    videoUrl: string;
  }>;
}

const DEFAULT_AI_DRIVE_PRODUCTS: AiDriveProduct[] = [
  {
    id: "ai-drive",
    name: "私有化 AI 网盘",
    summary: "文件问答、智能体配置与 RAG 检索能力",
    video: "/media/ai-drive/ai-drive-product-flow.mp4",
    poster: "/media/ai-drive/ai-drive-product-flow.jpg",
  },
];

function buildAiDriveProducts(aiDriveDemos: PublicLandingPageProps["aiDriveDemos"]): AiDriveProduct[] {
  const configuredDemo = aiDriveDemos?.[0];
  if (!configuredDemo) return DEFAULT_AI_DRIVE_PRODUCTS;
  return [{
    ...DEFAULT_AI_DRIVE_PRODUCTS[0],
    summary: configuredDemo.description.trim() || DEFAULT_AI_DRIVE_PRODUCTS[0].summary,
  }];
}

export default function PublicLandingPage({ solutionArticles, caseLogoWallImageUrl, aiDriveDemos }: PublicLandingPageProps) {
  const homepageSolutionItems = buildHomepageSolutionItems(solutionArticles);
  const aiDriveProducts = buildAiDriveProducts(aiDriveDemos);
  const [consultationOpen, setConsultationOpen] = useState(false);

  useEffect(() => {
    const counter = { val: 0 };
    gsap.to(counter, {
      val: 99.98,
      duration: 3,
      delay: 1,
      ease: "power2.out",
      onUpdate: () => {
        const el = document.getElementById("stability-counter");
        if (el) {
          el.innerText = `${counter.val.toFixed(2)}%`;
        }
      }
    });

    return () => undefined;
  }, []);

  useEffect(() => {
    const scheduledTimers: number[] = [];
    let resetInterval: number | null = null;

    const resetLandingViewport = () => {
      if (window.location.pathname !== "/" || window.location.hash) {
        return;
      }
      const applyScrollReset = () => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const scrollingElement = document.scrollingElement;
        if (scrollingElement) {
          scrollingElement.scrollTop = 0;
          scrollingElement.scrollLeft = 0;
        }
        ScrollTrigger.refresh();
      };

      applyScrollReset();
      requestAnimationFrame(() => {
        applyScrollReset();
        requestAnimationFrame(applyScrollReset);
      });

      [0, 80, 220].forEach((delay) => {
        const timer = window.setTimeout(applyScrollReset, delay);
        scheduledTimers.push(timer);
      });

      if (resetInterval !== null) {
        window.clearInterval(resetInterval);
      }
      resetInterval = window.setInterval(applyScrollReset, 16);
      const stopTimer = window.setTimeout(() => {
        if (resetInterval !== null) {
          window.clearInterval(resetInterval);
          resetInterval = null;
        }
      }, 700);
      scheduledTimers.push(stopTimer);
    };

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    resetLandingViewport();
    window.addEventListener("popstate", resetLandingViewport);
    window.addEventListener("pageshow", resetLandingViewport);

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
      if (resetInterval !== null) {
        window.clearInterval(resetInterval);
      }
      scheduledTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("popstate", resetLandingViewport);
      window.removeEventListener("pageshow", resetLandingViewport);
    };
  }, []);

  return (
    <PublicLayout active="landing">
      <AiDriveProductShowcase
        description={<>企业文件留在内网，AI 能力直接接入。右键文件或文件夹即可提问，也能快速搭建业务智能体，文件不动，知识库不重建。</>}
        eyebrow="本地部署 · LLM 接入"
        onPrimaryCta={() => { window.location.href = "https://www.yuncan.com/contact"; }}
        onSecondaryCta={() => setConsultationOpen(true)}
        primaryCtaLabel="申请免费体验"
        products={aiDriveProducts}
        secondaryCtaLabel="联系云璨顾问"
        tags={["文件夹问答", "LLM 灵活接入", "快速搭建智能体", "数据不出企业"]}
        title={<><span className="block">私有化 AI 网盘</span><span className="mt-2 block text-hermes">数据不出企业，AI 直接答。</span></>}
        trustItems={["阿里云授权合作伙伴", "500+ 企业客户的选择"]}
      />
      <DemoConsultationModal open={consultationOpen} onClose={() => setConsultationOpen(false)} />

      <section id="service-matrix" className="scroll-mt-32 py-32 px-6 bg-mist">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
            <div className="max-w-2xl">
              <span className="section-label">Service Matrix</span>
              <h2 className="text-4xl md:text-5xl font-black text-charcoal mt-4 mb-6">全生命周期的云技术力量</h2>
              <p className="text-muted text-lg">从初创上云到大规模集团化跨云治理，我们提供涵盖各阶段的专业解决方案。</p>
            </div>
            <a href="/services" className="group flex items-center gap-3 text-hermes font-bold">
              了解详细服务标准 <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </a>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard icon={Cloud} title="上云咨询与架构" desc="根据业务特性制定云战略，涵盖合规性审查、 TCO成本估算及三级架构高可用设计方案。" index={0} />
            <FeatureCard icon={Server} title="自动化迁移托管" desc="无感迁移数据库与应用逻辑，具备全自动容灾回退能力，确保业务在迁移过程中“零”停机风险。" index={1} />
            <FeatureCard icon={Code} title="云原生应用开发" desc="基于容器、FaaS等现代云技术重构企业业务链路，提升开发效率，释放云端弹性算力。" index={2} />
            <FeatureCard icon={Shield} title="7*24 智能运维" desc="自研智能监控平台配合资深专家团队，实现秒级告警响应与自动化故障自愈（Auto-healing）。" index={3} />
            <FeatureCard icon={Settings} title="云资源优化治理" desc="深挖资源空闲点，平衡性能与其对应支出，帮助企业平均每年节约30%-50%的云计算费用。" index={4} />
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.35, ease: "easeOut" }}
              className="p-8 bg-hermes rounded-2xl shadow-xl shadow-hermes/20 flex flex-col justify-between"
            >
              <div>
                <Zap className="text-white mb-8" size={32} />
                <h3 className="text-xl font-bold text-white mb-4">定制化服务</h3>
                <p className="text-white/80 text-sm leading-relaxed">除标准化产品外，云璨还支持针对特殊行业、高并发场景的1对1深度定制开发。</p>
              </div>
              <a href="/contact" className="mt-8 inline-flex items-center justify-center rounded-xl bg-white py-4 font-black text-hermes shadow-lg transition-colors hover:bg-mist">
                预约专家诊断
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="enterprise-solutions" className="scroll-mt-32 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-20">
            <div>
              <span className="section-label">Enterprise Solutions</span>
              <h2 className="text-4xl font-black text-charcoal mt-4 mb-8">
                深耕行业
                <br />
                沉淀云端智慧
              </h2>
              <p className="text-muted mb-10 leading-relaxed">云璨不仅仅提供底座，更致力于让云技术与企业核心业务逻辑深度耦合，在快消、制造、医疗等多个领域均有成熟落地案例。</p>
            </div>

            <div className="space-y-2">
              {homepageSolutionItems.map((item) => (
                <SolutionItem
                  key={`${item.href}-${item.title}`}
                  title={item.title}
                  tag={item.tag}
                  desc={item.desc}
                  href={item.href}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {caseLogoWallImageUrl ? (
        <section id="customer-logo-wall" className="scroll-mt-32 px-6 pb-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            <div className="border-b border-line px-8 py-7 md:px-12">
              <div className="flex flex-col gap-3">
                <div>
                  <span className="section-label">Trusted by Customers</span>
                  <h2 className="mt-3 text-3xl font-black text-charcoal md:text-4xl">部分客户案例</h2>
                </div>
              </div>
            </div>
            <div className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-5 md:px-8 md:py-8">
              <div className="overflow-hidden rounded-[1.5rem] border border-line bg-white p-3 md:p-4">
                <Image
                  alt="云璨客户案例 LOGO 墙"
                  className="h-auto w-full object-contain"
                  height={900}
                  src={caseLogoWallImageUrl}
                  width={2400}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

    </PublicLayout>
  );
}
