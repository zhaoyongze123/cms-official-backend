"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Building2, X } from "lucide-react";

import PublicLayout from "./public-layout";

const companyStats = [
  {
    label: "成立时间",
    value: "2011年1月",
  },
  {
    label: "累计服务",
    value: "500+ 机构客户",
  },
  {
    label: "方案沉淀",
    value: "100+ 行业方案",
  },
  {
    label: "核心角色",
    value: "阿里云核心合作伙伴",
  },
];

const honorCards = [
  {
    title: "高新技术企业",
    category: "企业资质",
    image: "/about/high-tech-enterprise.jpg",
    preview: "/about/high-tech-enterprise.pdf",
  },
  {
    title: "ISO 9001 质量管理体系认证",
    category: "管理体系",
    image: "/about/iso9001-certificate.jpg",
    preview: "/about/iso9001-certificate.pdf",
  },
  {
    title: "云璨内容管理软件 V1.0",
    category: "软件产品",
    image: "/about/software-product-certificate.jpg",
    preview: "/about/software-product-certificate.pdf",
  },
  {
    title: "企业分布式服务器监控系统 V1.0",
    category: "软件著作权",
    image: "/about/monitor-certificate.png",
    preview: "/about/monitor-certificate.pdf",
  },
  {
    title: "企业数据库交互式查询应用软件 V1.0",
    category: "软件著作权",
    image: "/about/database-certificate.png",
    preview: "/about/database-certificate.pdf",
  },
  {
    title: "云璨互联网云服务项目管理协同系统",
    category: "软件著作权",
    image: "/about/project-certificate.png",
    preview: "/about/project-certificate.pdf",
  },
  {
    title: "腾讯云标准级代理合作伙伴",
    category: "生态合作",
    image: "/about/tencent-cloud-certificate.png",
    preview: "/about/tencent-cloud-certificate.pdf",
  },
  {
    title: "阿里云合作伙伴",
    category: "生态合作",
    image: "/about/aliyun-certificate.png",
    preview: "/about/aliyun-certificate.pdf",
  },
  {
    title: "OceanBase 注册经销商",
    category: "生态合作",
    image: "/about/oceanbase-certificate.png",
    preview: "/about/oceanbase-certificate.pdf",
  },
];

export default function PublicAboutPage() {
  const [selectedHonor, setSelectedHonor] = useState<{
    title: string;
    preview: string;
    isPdf: boolean;
  } | null>(null);

  return (
    <PublicLayout active="about">
      <section className="overflow-hidden border-b border-line bg-[linear-gradient(180deg,#fff_0%,#fff7f0_100%)] px-6 pb-20 pt-36">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="max-w-4xl">
            <span className="inline-flex rounded-full border border-hermes/15 bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-hermes shadow-sm">
              About Yuncan
            </span>
            <h1 className="mt-7 text-5xl font-black leading-[0.95] text-charcoal md:text-6xl xl:text-7xl">
              企业级云服务
              <br />
              与方案交付团队
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">
              上海云璨信息技术有限公司成立于 2011 年，持续聚焦企业上云、系统建设与运维治理，
              以真实项目经验沉淀长期可复用的行业方案。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-full bg-hermes px-6 py-3 text-sm font-bold text-white shadow-[0_16px_38px_rgba(244,114,37,0.28)] transition-transform duration-300 hover:-translate-y-0.5"
                href="#company-intro"
              >
                公司简介
                <ArrowUpRight size={16} />
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3 text-sm font-bold text-charcoal transition-colors hover:border-hermes hover:text-hermes"
                href="#honors"
              >
                资质荣誉
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {companyStats.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.8rem] border border-white/70 bg-white/90 p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] backdrop-blur"
              >
                <div className="text-xs font-black uppercase tracking-[0.24em] text-muted">{item.label}</div>
                <div className="mt-4 text-2xl font-black leading-tight text-charcoal">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="company-intro" className="scroll-mt-28 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 border-t border-line/80 pt-10 lg:grid-cols-[0.28fr_0.72fr] lg:items-start xl:grid-cols-[0.24fr_0.76fr]">
            <div className="space-y-4 lg:sticky lg:top-32">
              <div className="inline-flex items-center gap-2 rounded-full bg-hermes/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-hermes">
                <Building2 size={14} />
                公司简介
              </div>
              <h2 className="text-4xl font-black leading-tight text-charcoal md:text-5xl">
                公司简介
              </h2>
            </div>

            <div className="max-w-none text-base leading-8 text-muted md:text-lg md:leading-9">
              <p>
                上海云璨信息技术有限公司成立于2011年1月，注册资金500万元，坐落于上海市浦东新区，系上海市高新技术企业、阿里云核心合作伙伴。作为阿里云最早的一批合作伙伴，我们与阿里云携手走过十余载。
              </p>
              <p className="mt-6">
                公司专注于为企业（机构）提供专业的云解决方案及开发、实施、运维服务。团队精干务实，在云架构设计、解决方案咨询、应用开发、实施运维等领域积累了丰富的实战经验。
              </p>
              <p className="mt-6">
                十余年来，我们已服务机构客户500余家，沉淀了包括混合云架构、云上灾备、自建邮件系统、企业知识库、AI智能问数等在内的100多个行业应用方案。每一个方案，均源自真实业务场景，并至少在一个客户现场成功落地。
              </p>
              <p className="mt-6">
                未来，我们将继续秉持&quot;发现需求—满足需求—沉淀方案&quot;的闭环理念，为企业（机构）提供可落地的专业方案与服务，助力客户持续提升数智化水平。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="honors" className="scroll-mt-28 bg-mist px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-hermes shadow-sm">
              Qualification & Honors
            </span>
            <h2 className="mt-6 text-4xl font-black text-charcoal md:text-5xl">资质荣誉与生态合作</h2>
            <p className="mt-6 text-lg leading-8 text-muted">
              选取企业资质、软件产品认证、软著与云生态合作证明，压缩为可快速浏览的视觉证据区，避免页面过长，同时保留可信度。
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {honorCards.map(({ title, category, image, preview }) => (
              <button
                key={title}
                className="group overflow-hidden rounded-[1.9rem] border border-line bg-white text-left shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-transform duration-300 hover:-translate-y-1"
                onClick={() =>
                  setSelectedHonor({
                    title,
                    preview,
                    isPdf: preview.endsWith(".pdf"),
                  })
                }
                type="button"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f6fb]">
                  <Image
                    alt={title}
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    src={image}
                  />
                </div>
                <div className="p-6">
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-hermes">{category}</div>
                  <h3 className="mt-3 text-xl font-black leading-8 text-charcoal">{title}</h3>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-muted transition-colors group-hover:text-hermes">
                    点击预览
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedHonor ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-charcoal/72 px-4 py-8"
          onClick={() => setSelectedHonor(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_28px_100px_rgba(15,23,42,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="text-lg font-black text-charcoal">{selectedHonor.title}</div>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper text-charcoal transition-colors hover:border-hermes hover:text-hermes"
                onClick={() => setSelectedHonor(null)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[#f3f5f9] p-4 md:p-6">
              {selectedHonor.isPdf ? (
                <iframe
                  className="h-[78vh] w-full overflow-hidden rounded-[1.5rem] border border-line bg-white"
                  src={`${selectedHonor.preview}#toolbar=1&navpanes=0&view=FitH`}
                  title={selectedHonor.title}
                />
              ) : (
                <div className="flex min-h-[70vh] items-center justify-center rounded-[1.5rem] border border-line bg-white p-4">
                  <img
                    alt={selectedHonor.title}
                    className="max-h-[72vh] w-auto max-w-full rounded-[1rem] object-contain"
                    src={selectedHonor.preview}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}
