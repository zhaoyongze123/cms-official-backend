"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useSpring } from "motion/react";
import { Headset, Mail, Menu, Phone, X } from "lucide-react";

interface PublicLayoutProps {
  active: "landing" | "services" | "solutions" | "products" | "cases" | "about" | "article" | "join";
  children: React.ReactNode;
}

export default function PublicLayout({ active, children }: PublicLayoutProps) {
  const { scrollYProgress } = useScroll();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });
  const contactQrPath = "/contact-qr.png";
  const logoPath = "/yuncan-logo.png";
  const navItems = [
    { href: "/services", label: "上云服务", active: active === "services" },
    { href: "/solutions", label: "解决方案", active: active === "solutions" || active === "article" },
    { href: "/cases", label: "客户案例", active: active === "cases" },
    { href: "/products", label: "产品中心", active: active === "products" },
    { href: "/about", label: "关于我们", active: active === "about" },
  ];

  const wecomHoverCard = (
    <div className="relative overflow-hidden rounded-[2.25rem] border border-[#e7ecf4] bg-[#f3f6fb] shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
      <div className="relative space-y-5 bg-[#eef2f8] p-5">
        <div className="flex items-start gap-3 rounded-[1.6rem] border border-[#eef1f6] bg-white px-4 py-3 shadow-[0_12px_28px_rgba(148,163,184,0.12)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-[#edf0f5] text-charcoal shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
            <Phone size={18} />
          </div>
          <div>
            <div className="text-[0.82rem] font-bold tracking-[0.08em] text-charcoal">电话咨询</div>
            <div className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight text-charcoal">021-50583875</div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-[1.6rem] border border-[#eef1f6] bg-white px-4 py-3 shadow-[0_12px_28px_rgba(148,163,184,0.12)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-[#edf0f5] text-charcoal shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
            <Mail size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[0.82rem] font-bold tracking-[0.08em] text-charcoal">邮件咨询</div>
            <div className="mt-1 break-all text-[0.98rem] font-black leading-6 tracking-tight text-charcoal">service@yuncan.com</div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#e7ecf4] bg-[#eef2f8] px-5 py-5 shadow-[0_14px_36px_rgba(148,163,184,0.16)]">
          <div className="mb-3 text-center text-[0.82rem] font-bold tracking-[0.08em] text-charcoal">企业微信咨询</div>
          <div className="flex justify-center overflow-hidden rounded-[1.7rem] bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <Image
              alt="企业微信二维码"
              className="block h-44 w-44 rounded-[1.2rem] object-cover"
              height={176}
              src={contactQrPath}
              width={176}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen selection:bg-hermes/30 bg-paper overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-line px-6 py-4 shadow-sm">
        <motion.div className="absolute bottom-0 left-0 right-0 h-[2px] bg-hermes origin-left" style={{ scaleX }} />
        <div className="relative max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link className="flex items-center gap-3 cursor-pointer shrink-0" href="/">
            <Image
              alt="YUNCAN professional service"
              className="h-auto w-[15.2rem] max-w-none"
              height={727}
              priority
              src={logoPath}
              width={2164}
            />
          </Link>
          <div className="absolute left-1/2 hidden -translate-x-1/2 md:flex items-center justify-center gap-8 lg:gap-10">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className={`text-sm font-semibold transition-colors relative group ${item.active ? "text-hermes" : "text-charcoal hover:text-hermes"}`}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex w-[15.2rem] shrink-0 items-center justify-end">
            <Link
              className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-black transition-all ${
                active === "join"
                  ? "bg-hermes text-white shadow-[0_16px_38px_rgba(244,114,37,0.28)]"
                  : "bg-hermes text-white shadow-[0_16px_38px_rgba(244,114,37,0.24)] hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(244,114,37,0.3)]"
              }`}
              href="/join"
            >
              关联注册享折扣
            </Link>
          </div>
          <button
            type="button"
            aria-label={mobileMenuOpen ? "关闭导航菜单" : "打开导航菜单"}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.6rem] border border-line bg-white text-charcoal shadow-[0_18px_35px_rgba(15,23,42,0.08)] transition-colors hover:border-hermes hover:text-hermes md:hidden"
          >
            {mobileMenuOpen ? <X size={26} strokeWidth={1.8} /> : <Menu size={26} strokeWidth={1.8} />}
          </button>
        </div>
        <motion.div
          initial={false}
          animate={{
            height: mobileMenuOpen ? "auto" : 0,
            opacity: mobileMenuOpen ? 1 : 0,
            marginTop: mobileMenuOpen ? 16 : 0,
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mx-auto max-w-7xl overflow-hidden md:hidden"
        >
          <div className="rounded-[1.8rem] border border-line bg-white p-3 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-[1.1rem] px-4 py-3 text-sm font-bold transition-colors ${item.active ? "bg-hermes/10 text-hermes" : "text-charcoal hover:bg-mist"}`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/join"
              onClick={() => setMobileMenuOpen(false)}
              className={`mt-2 block rounded-[1.1rem] px-4 py-3 text-sm font-black transition-colors ${
                active === "join" ? "bg-hermes text-white" : "bg-hermes text-white hover:bg-hermes/90"
              }`}
            >
              关联注册享折扣
            </Link>
          </div>
        </motion.div>
      </nav>

      {children}

      <div className="pointer-events-none fixed right-0 top-1/2 z-[70] hidden -translate-y-1/2 md:block">
        <div className="relative flex items-center">
          <div className="group/contact pointer-events-auto relative flex h-36 w-20 flex-col items-center justify-center gap-3 overflow-visible rounded-l-[1.5rem]">
            <div className="pointer-events-none absolute right-full top-1/2 mr-4 w-[21rem] -translate-y-1/2 translate-x-6 opacity-0 transition-all duration-300 group-hover/contact:translate-x-0 group-hover/contact:opacity-100">
              {wecomHoverCard}
            </div>

            <div className="relative flex h-36 w-20 flex-col items-center justify-center gap-3 overflow-hidden rounded-l-[1.5rem] border border-[#e4e8ef] bg-[#f2f4f8] px-3 text-ink shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#dde3eb] bg-white text-charcoal shadow-[0_10px_24px_rgba(148,163,184,0.18)]">
                <Headset size={24} />
              </div>
              <div className="relative text-center text-xs font-bold leading-5 text-charcoal">
                <span className="block">联系</span>
                <span className="block">我们</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-charcoal text-white pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-12 pb-16 border-b border-white/10 xl:flex-row xl:items-start xl:justify-between">
          <div className="grid flex-1 grid-cols-2 gap-12 md:grid-cols-4 lg:gap-20">
            <div>
              <h5 className="font-bold mb-6 text-sm">友情链接</h5>
              <ul className="space-y-4 text-sm text-white/40">
                <li className="hover:text-hermes transition-colors">MDaemon中文站</li>
                <li className="hover:text-hermes transition-colors">SecurityGateway中文站</li>
                <li className="hover:text-hermes transition-colors">MailStore中文站</li>
                <li className="hover:text-hermes transition-colors">
                  <a href="https://www.zimbra.com.cn" target="_blank" rel="noreferrer">
                    Zimbra中文站
                  </a>
                </li>
                <li className="hover:text-hermes transition-colors">可道云</li>
                <li className="hover:text-hermes transition-colors">53AI</li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-sm">合作伙伴</h5>
              <ul className="space-y-4 text-sm text-white/40">
                <li className="hover:text-hermes transition-colors">阿里云</li>
                <li className="hover:text-hermes transition-colors">腾讯云</li>
                <li className="hover:text-hermes transition-colors">MDaemon</li>
                <li className="hover:text-hermes transition-colors">MailStore</li>
                <li className="hover:text-hermes transition-colors">可道云</li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-sm">关于我们</h5>
              <ul className="space-y-4 text-sm text-white/40">
                <li>
                  <Link className="hover:text-hermes transition-colors" href="/about#company-intro">
                    公司简介
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-hermes transition-colors" href="/about#honors">
                    资质荣誉
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-sm">法律合规</h5>
              <ul className="space-y-4 text-sm text-white/40">
                <li>
                  <Link className="hover:text-hermes transition-colors" href="/legal/service-agreement">
                    服务协议
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-hermes transition-colors" href="/legal/privacy-policy">
                    隐私协议
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="w-full xl:w-[15rem] xl:shrink-0 xl:pl-10 xl:border-l xl:border-white/10">
            <h5 className="font-bold mb-6 text-sm">联系我们</h5>
            <ul className="space-y-4 text-sm text-white/40">
              <li>地址：</li>
              <li>电话：021-50583875</li>
              <li>邮箱：service@yuncan.com</li>
              <li>
                <div className="group/wecom relative inline-flex">
                  <Image
                    alt="企业微信 Logo"
                    className="h-auto w-28 cursor-pointer opacity-95 transition-opacity duration-200 group-hover/wecom:opacity-75"
                    height={37}
                    src="/wecom-logo-white.png"
                    width={178}
                  />
                  <div className="pointer-events-none absolute top-full left-0 mt-3 -translate-y-2 opacity-0 transition-all duration-200 group-hover/wecom:translate-y-0 group-hover/wecom:opacity-100">
                    <div className="w-28 rounded-2xl border border-white/10 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.24)]">
                      <Image
                        alt="企业微信二维码"
                        className="h-24 w-24 rounded-xl object-cover"
                        height={96}
                        src={contactQrPath}
                        width={96}
                      />
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mt-12 text-white/20 text-[10px] font-bold uppercase tracking-[0.2em]">
          <span>2011-2026 上海云璨信息技术有限公司 all rights reserved</span>
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
