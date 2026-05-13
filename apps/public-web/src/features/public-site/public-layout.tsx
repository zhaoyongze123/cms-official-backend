"use client";

import React from "react";
import Link from "next/link";
import { motion, useScroll, useSpring } from "motion/react";
import { ArrowRight, Cloud, ExternalLink, Headset, Mail, Phone, Shield } from "lucide-react";

interface PublicLayoutProps {
  active: "landing" | "solutions" | "article";
  children: React.ReactNode;
}

export default function PublicLayout({ active, children }: PublicLayoutProps) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="relative min-h-screen selection:bg-hermes/30 bg-paper overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-line px-6 py-4">
        <motion.div className="absolute bottom-0 left-0 right-0 h-[2px] bg-hermes origin-left" style={{ scaleX }} />
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link className="flex items-center gap-3 cursor-pointer" href="/">
            <div className="w-10 h-10 bg-hermes rounded-lg shadow-lg shadow-hermes/30 flex items-center justify-center text-white font-black text-xl">
              Y
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight leading-none uppercase">Yuncan</span>
              <span className="text-[10px] text-muted font-medium tracking-widest mt-1 text-nowrap">云璨科技</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8 lg:gap-10">
            <Link className={`text-sm font-semibold transition-colors relative group ${active === "landing" ? "text-hermes" : "text-charcoal hover:text-hermes"}`} href="/#服务体系">
              上云服务
            </Link>
            <Link className={`text-sm font-semibold transition-colors relative group ${active === "solutions" || active === "article" ? "text-hermes" : "text-charcoal hover:text-hermes"}`} href="/solutions">
              解决方案
            </Link>
            <Link className="text-sm font-semibold transition-colors relative group text-charcoal hover:text-hermes" href="/#产品中心">
              产品中心
            </Link>
            <Link className="text-sm font-semibold transition-colors relative group text-charcoal hover:text-hermes" href="/#关于我们">
              关于我们
            </Link>
          </div>
          <Link
            href="/solutions"
            className="bg-ink text-white px-5 lg:px-6 py-2.5 rounded-full text-xs lg:text-sm font-bold shadow-lg shadow-ink/20 hover:bg-hermes transition-colors shrink-0"
          >
            架构知识库
          </Link>
        </div>
      </nav>

      {children}

      <div className="pointer-events-none fixed right-0 top-1/2 z-[70] hidden -translate-y-1/2 md:block">
        <div className="relative flex items-center">
          <div className="group/contact pointer-events-auto relative flex h-36 w-20 flex-col items-center justify-center gap-3 overflow-visible rounded-l-[1.5rem]">
            <div className="pointer-events-none absolute right-full top-1/2 mr-4 w-[21rem] -translate-y-1/2 translate-x-6 opacity-0 transition-all duration-300 group-hover/contact:translate-x-0 group-hover/contact:opacity-100">
              <div className="relative overflow-hidden rounded-[2.25rem] border border-white/45 bg-white/18 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-[28px]">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(255,255,255,0.22))]" />
                <div className="absolute inset-x-6 top-4 h-10 rounded-full bg-white/40 blur-2xl" />
                <div className="relative space-y-5 p-5">
                  <div className="flex items-start gap-4 rounded-[1.6rem] border border-white/40 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_30px_rgba(148,163,184,0.14)] backdrop-blur-xl">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-[#3b6af0] text-white shadow-[0_12px_28px_rgba(59,106,240,0.32)]">
                      <Phone size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold tracking-[0.08em] text-charcoal">售前咨询</div>
                      <div className="mt-1 text-[2rem] font-black tracking-tight text-[#3b6af0]">021-50583875</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-[1.6rem] border border-white/40 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_30px_rgba(148,163,184,0.14)] backdrop-blur-xl">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-hermes text-white shadow-[0_12px_28px_rgba(255,121,0,0.26)]">
                      <Mail size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold tracking-[0.08em] text-charcoal">邮件咨询</div>
                      <div className="mt-1 break-all text-[1.05rem] font-black leading-8 tracking-tight text-charcoal">service@yuncan.com</div>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/45 bg-white/58 px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_36px_rgba(148,163,184,0.16)] backdrop-blur-xl">
                    <div className="mx-auto relative grid h-44 w-44 grid-cols-7 gap-1 rounded-[1.7rem] bg-white/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      {Array.from({ length: 49 }).map((_, index) => {
                        const active = [0, 1, 2, 4, 6, 7, 8, 10, 12, 14, 18, 19, 20, 21, 24, 26, 28, 30, 31, 33, 35, 36, 40, 42, 43, 44, 46, 48].includes(index);
                        return <span key={index} className={`rounded-[2px] ${active ? "bg-charcoal" : "bg-charcoal/10"}`} />;
                      })}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border-4 border-white bg-hermes text-xl font-black text-white shadow-[0_14px_30px_rgba(255,121,0,0.22)]">
                          Y
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 text-center text-[1.05rem] font-semibold leading-8 tracking-[0.04em] text-slate-500">
                      微信扫码
                      <br />
                      添加专属顾问
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative flex h-36 w-20 flex-col items-center justify-center gap-3 overflow-hidden rounded-l-[1.5rem] border border-white/40 bg-white/20 px-3 text-ink shadow-2xl shadow-white/10 backdrop-blur-2xl">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.18))]" />
              <div className="absolute inset-x-2 top-2 h-8 rounded-full bg-white/35 blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-white/35 shadow-lg shadow-white/20 backdrop-blur-xl">
                <Headset size={24} />
              </div>
              <div className="relative text-center text-xs font-bold leading-5 tracking-[0.12em] text-charcoal">
                联 系 我 们
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-charcoal text-white pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12 pb-16 border-b border-white/10">
          <div className="max-w-sm">
            <div className="flex items-center gap-3 mb-6">
              <Link className="w-10 h-10 bg-hermes rounded-lg flex items-center justify-center text-white font-black cursor-pointer" href="/">
                Y
              </Link>
              <Link className="font-bold text-xl uppercase tracking-widest cursor-pointer" href="/">
                Yuncan
              </Link>
            </div>
            <p className="text-white/40 text-sm leading-relaxed mb-8">
              始于2011，云璨始终坚持以技术为驱动，助力企业释放云端潜能。依托上海科技枢纽，服务全球数字化转型。
            </p>
            <div className="flex gap-4">
              {[ExternalLink, Shield, Cloud].map((Icon, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-hermes hover:border-hermes transition-all cursor-pointer"
                >
                  <Icon size={18} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-12 lg:gap-24">
            <div>
              <h5 className="font-bold mb-6 text-sm">服务指南</h5>
              <ul className="space-y-4 text-sm text-white/40">
                <li><Link className="hover:text-hermes cursor-pointer" href="/#服务体系">上云咨询</Link></li>
                <li><Link className="hover:text-hermes cursor-pointer" href="/#服务体系">技术架构</Link></li>
                <li><Link className="hover:text-hermes cursor-pointer" href="/#服务体系">运维巡检</Link></li>
                <li><Link className="hover:text-hermes cursor-pointer" href="/#服务体系">费用调优</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-sm uppercase tracking-widest text-white/60">知识库</h5>
              <ul className="space-y-4 text-sm text-white/40">
                <li><Link className="hover:text-hermes cursor-pointer" href="/solutions">典型案例</Link></li>
                <li><Link className="hover:text-hermes cursor-pointer" href="/solutions">架构方案</Link></li>
                <li><Link className="hover:text-hermes cursor-pointer" href="/solutions">迁移指南</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-sm">法律合规</h5>
              <ul className="space-y-4 text-sm text-white/40">
                <li className="hover:text-hermes cursor-pointer">隐私协议</li>
                <li className="hover:text-hermes cursor-pointer">授权说明</li>
                <li className="hover:text-hermes cursor-pointer">信息披露</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mt-12 text-white/20 text-[10px] font-bold uppercase tracking-[0.2em]">
          <span>© 2024 上海云璨科技发展有限公司 ALL RIGHTS RESERVED.</span>
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-center gap-3 md:gap-8 normal-case tracking-normal text-center md:text-right">
            <a
              className="hover:text-hermes transition-colors"
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noreferrer"
            >
              沪ICP备14033669号-6
            </a>
            <a
              className="hover:text-hermes transition-colors"
              href="https://beian.mps.gov.cn/#/"
              target="_blank"
              rel="noreferrer"
            >
              沪公网安备31011502004792号
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
