"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, ArrowRight, Cloud, Code, Mail, MapPin, Phone, Server, Settings, Shield, X, Zap } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import PublicLayout from "./public-layout";
import HeroScene from "../../components/HeroScene";
import { InteractiveCard } from "../../components/InteractiveCard";

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

function SolutionItem({ title, tag, desc }: { title: string; tag: string; desc: string }) {
  return (
    <motion.a
      href="/solutions"
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

function ConsultationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-charcoal/55 backdrop-blur-md px-4 py-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="mx-auto flex min-h-full max-w-5xl items-center justify-center"
          >
            <div
              className="relative w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-ink/30"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="关闭咨询弹层"
                onClick={onClose}
                className="absolute right-6 top-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white/90 text-charcoal shadow-sm transition-colors hover:border-hermes hover:text-hermes"
              >
                <X size={18} />
              </button>

              <div className="grid gap-10 p-8 md:grid-cols-[1.4fr_0.9fr] md:p-12">
                <div>
                  <div className="mb-10">
                    <span className="text-xs font-black uppercase tracking-[0.35em] text-hermes">Architecture Desk</span>
                    <h3 className="mt-4 text-4xl font-black text-charcoal md:text-5xl">扫码咨询</h3>
                  </div>

                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-hermes/15 via-white to-ink/10 text-4xl font-black text-hermes shadow-inner">
                      Y
                    </div>
                    <div className="space-y-3">
                      <div className="text-4xl font-black text-charcoal">云璨</div>
                      <div className="text-xl text-charcoal/75">专属顾问</div>
                      <div className="flex flex-wrap items-center gap-3 text-xl text-muted">
                        <Phone className="text-hermes" size={22} />
                        <span>021-50583875</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-base text-muted">
                        <Mail className="text-hermes" size={18} />
                        <span>service@yuncan.com</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-hermes/10 ring-1 ring-line">
                    <div className="relative grid h-56 w-56 grid-cols-7 gap-1 rounded-2xl bg-white p-4">
                      {Array.from({ length: 49 }).map((_, index) => {
                        const active = [0, 1, 2, 4, 6, 7, 8, 10, 12, 14, 18, 19, 20, 21, 24, 26, 28, 30, 31, 33, 35, 36, 40, 42, 43, 44, 46, 48].includes(index);
                        return <span key={index} className={`rounded-[2px] ${active ? "bg-charcoal" : "bg-charcoal/10"}`} />;
                      })}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-hermes text-2xl font-black text-white shadow-lg">
                          Y
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative bg-gradient-to-r from-[#2358d8] via-[#3165e6] to-[#2d6eff] px-8 py-10 text-white md:px-12">
                <div className="absolute left-20 top-0 h-6 w-6 -translate-y-1/2 rotate-45 bg-[#3165e6]" />
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <p className="max-w-2xl text-2xl font-medium leading-relaxed md:text-4xl">
                    欢迎扫码，在线体验云璨企业级方案
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-[#2d6eff]"
                  >
                    我知道了
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function PublicLandingPage() {
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const [consultationOpen, setConsultationOpen] = useState(false);

  useEffect(() => {
    const lens = document.getElementById("hero-lens");
    const moveCursor = (e: MouseEvent) => {
      if (lens && titleContainerRef.current) {
        const rect = titleContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const mask = `circle(80px at ${x}px ${y}px)`;
        (lens.style as CSSStyleDeclaration & { webkitClipPath?: string }).webkitClipPath = mask;
        lens.style.clipPath = mask;
      }
    };

    window.addEventListener("mousemove", moveCursor);
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

    return () => window.removeEventListener("mousemove", moveCursor);
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
      <section className="relative pt-40 pb-20 px-6 overflow-hidden min-h-[90vh] flex items-center">
        <HeroScene />
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="inline-block px-4 py-1.5 bg-hermes/10 rounded-full mb-6">
              <span className="text-hermes text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                <Activity size={12} className="animate-pulse" /> Global Enterprise Cloud Solution
              </span>
            </div>
            <div ref={titleContainerRef} className="relative group/hero overflow-visible mb-12">
              <h1 className="text-5xl lg:text-7xl font-black text-charcoal leading-tight pointer-events-none select-none">
                让云贴近业务，
                <br />
                让 AI 驱动增长
              </h1>
              <div
                id="hero-lens"
                className="absolute inset-0 pointer-events-none select-none hidden md:block"
                style={{
                  clipPath: "circle(0px at 0px 0px)",
                  WebkitClipPath: "circle(0px at 0px 0px)"
                }}
              >
                <h1 className="text-5xl lg:text-7xl font-black text-hermes leading-tight">
                  让云贴近业务，
                  <br />
                  让 AI 驱动增长
                </h1>
              </div>
            </div>
            <p className="text-xl text-muted leading-relaxed mb-10 max-w-xl">
              整合公有云、私有云与 AI 能力，为企业提供全栈云解决方案与定制开发服务，助力数智化转型。
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => setConsultationOpen(true)}
                className="bg-hermes text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-hermes/30"
              >
                立即咨询架构专家
              </button>
              <button
                type="button"
                onClick={() => setConsultationOpen(true)}
                className="bg-white text-charcoal border border-line px-8 py-4 rounded-full font-bold hover:bg-mist transition-colors"
              >
                探索服务矩阵
              </button>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-8">
              {[
                { label: "IT服务经验", val: "20年+" },
                { label: "客户案例", val: "500+" },
                { label: "解决方案", val: "100+" }
              ].map((stat, i) => (
                <div key={i} className="border-l-2 border-hermes/20 pl-4">
                  <div className="text-2xl font-black text-charcoal">{stat.val}</div>
                  <div className="text-[10px] text-muted font-bold mt-1 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <InteractiveCard />
          </div>
        </div>
      </section>

      <section id="服务体系" className="py-32 px-6 bg-mist">
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
              <button className="mt-8 bg-white text-hermes font-black py-4 rounded-xl shadow-lg hover:bg-mist transition-colors">预约专家诊断</button>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="解决方案" className="py-32 px-6">
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
              <SolutionItem tag="Cloud Infrastructure" title="通用上云方案" desc="针对异地多活、弹性扩容等痛点，提供标准化计算、存储及灾备链路，快速构建稳健云底座。" />
              <SolutionItem tag="Collaboration" title="Zimbra 企业邮箱解决方案" desc="高效协同的邮件系统，支持海量存储、智能过滤及多端同步，深度契合B端办公场景。" />
              <SolutionItem tag="Cloud Storage" title="可道云 (KodCloud) 企业网盘" desc="私有化部署的最佳选择，集文件管理、在线编辑、协作分享于一体的云端资源中心。" />
              <SolutionItem tag="Security" title="等保合规与安全加固" desc="全方位安全防护体系，助力企业快速通过等保测评，构建从边缘到核心的纵深防御架构。" />
            </div>
          </div>
        </div>
      </section>

      <ConsultationModal open={consultationOpen} onClose={() => setConsultationOpen(false)} />
    </PublicLayout>
  );
}
