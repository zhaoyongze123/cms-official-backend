"use client";

import React from "react";
import Link from "next/link";
import { motion, useScroll, useSpring } from "motion/react";
import { ArrowRight, Cloud, ExternalLink, Shield } from "lucide-react";

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
              服务体系
            </Link>
            <Link className={`text-sm font-semibold transition-colors relative group ${active === "solutions" || active === "article" ? "text-hermes" : "text-charcoal hover:text-hermes"}`} href="/solutions">
              解决方案
            </Link>
            <Link className="text-sm font-semibold transition-colors relative group text-charcoal hover:text-hermes" href="/#产品中心">
              产品中心
            </Link>
            <Link className="text-sm font-semibold transition-colors relative group text-charcoal hover:text-hermes" href="/#交付中心">
              交付中心
            </Link>
            <Link className="text-sm font-semibold transition-colors relative group text-charcoal hover:text-hermes" href="/#合作伙伴">
              合作伙伴
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
          <div className="flex gap-8 mt-4 md:mt-0">
            <span>沪ICP备XXXXXXXX号</span>
            <span>沪公网安备XXXXXXXX号</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
