"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Mail, Phone, QrCode } from "lucide-react";

import PublicLayout from "./public-layout";

const benefits = [
  {
    title: "专属钉群直连",
    description: "专属沟通渠道,问题反馈更直接高效",
  },
  {
    title: "架构师免费选型",
    description: "技术方案有专业架构师团队保驾护航",
  },
  {
    title: "首单折上折",
    description: "渠道价基础上,首次采购再叠加专属优惠",
  },
  {
    title: "100+场景方案库",
    description: "涵盖政企、互联网、传统行业等多场景方案",
  },
];

const steps = [
  {
    number: "1",
    title: "提供企业全称",
    description: "将营业执照上的标准名称发给我们",
    badge: "您来做",
  },
  {
    number: "2",
    title: "我们后台报备",
    description: "在阿里云渠道系统完成企业关联备案",
    badge: "约 1 个工作日",
  },
  {
    number: "3",
    title: "注册并实名认证",
    description: "报备成功后完成官网注册与实名",
    badge: "享折扣权益",
  },
];

const contactItems = [
  {
    title: "电话联系",
    value: "021-50583875",
    icon: Phone,
  },
  {
    title: "邮件联系",
    value: "service@yuncan.com",
    icon: Mail,
  },
];

const faqItems = [
  {
    question: "关联注册与直接官网注册的区别？",
    answer: "通过云璨注册可享代理渠道折扣及专属服务，直接官网注册通常无法享受此权益。",
  },
  {
    question: "需要准备哪些材料？",
    answer: "仅需先提供营业执照标准企业全称即可，我们协助完成后续流程。",
  },
  {
    question: "关联注册之后具体能享受哪些权益？",
    answer: (
      <>
        关联注册后可享受专属钉钉群 1 对 1 响应、工单优先通道、免费架构师方案设计、采购折上折、100+ 行业方案库等权益，全程持续技术护航。详细说明请查看：
        <Link
          className="font-bold text-hermes underline decoration-hermes/40 underline-offset-4 transition-colors hover:text-[#e36b1d]"
          href="https://www.yuncan.com/articles/yuncan-cloud-advantages"
        >
          阿里云关联注册优势详解
        </Link>
      </>
    ),
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-black tracking-tight text-charcoal md:text-[1.9rem]">{children}</h2>;
}

export default function PublicJoinPage() {
  return (
    <PublicLayout active="join">
      <section className="px-6 pb-14 pt-30 md:pb-18 md:pt-34">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,rgba(251,236,214,0.9),rgba(251,241,226,0.72))] px-7 py-8 md:px-10 md:py-10"
          >
            <div className="flex gap-5">
              <div className="hidden w-1 rounded-full bg-hermes md:block" />
              <div>
                <div className="inline-flex rounded-full bg-hermes px-4 py-2 text-sm font-black text-white">阿里云授权合作伙伴</div>
                <h1 className="mt-6 text-[2rem] font-black leading-tight tracking-tight text-hermes md:text-[3.2rem]">
                  通过云璨关联注册，享企业专属折扣
                </h1>
                <p className="mt-3 text-base text-[#b96b2e] md:text-lg">专人辅助 · 全程陪同 · 合规票据</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-[1.7rem] font-black tracking-tight text-[#b8bec7]">注册权益</div>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {benefits.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="rounded-[1.6rem] border border-line bg-white px-6 pb-7 pt-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]"
              >
                <div className="h-1 w-full rounded-full bg-hermes" />
                <div className="mt-5 text-[1.75rem] font-black tracking-tight text-charcoal">{item.title}</div>
                <p className="mt-2 text-[1.02rem] leading-8 text-muted">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl border-t border-line pt-10">
          <div className="text-[1.7rem] font-black tracking-tight text-[#b8bec7]">注册流程</div>
          <div className="mt-14 hidden items-start justify-between md:flex">
            {steps.map((step, index) => (
              <div key={step.number} className="relative flex w-full items-start">
                {index < steps.length - 1 ? (
                  <div className={`absolute left-[4.5rem] right-0 top-[1.95rem] h-px ${index === 0 ? "bg-hermes" : "bg-line"}`} />
                ) : null}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.38, delay: index * 0.05 }}
                  className="relative z-10 w-[18rem]"
                >
                  <div
                    className={`flex h-[4.1rem] w-[4.1rem] items-center justify-center rounded-full border-2 text-[2rem] font-black ${
                      index < 2 ? "border-hermes bg-hermes text-white" : "border-[#dddfe4] bg-white text-[#9ba3af]"
                    }`}
                  >
                    {step.number}
                  </div>
                  <div className="mt-7 text-[2rem] font-black tracking-tight text-charcoal">{step.title}</div>
                  <p className="mt-3 max-w-[15rem] text-[1.05rem] leading-8 text-muted">{step.description}</p>
                  <div
                    className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-black ${
                      index === 0
                        ? "bg-[#fff1dc] text-hermes"
                        : index === 1
                          ? "bg-[#fff1dc] text-hermes"
                          : "bg-[#eaf5e7] text-[#73a36c]"
                    }`}
                  >
                    {step.badge}
                  </div>
                </motion.div>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-7 md:hidden">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="border-b border-line pb-7"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl font-black ${
                      index < 2 ? "border-hermes bg-hermes text-white" : "border-[#dddfe4] bg-white text-[#9ba3af]"
                    }`}
                  >
                    {step.number}
                  </div>
                  <div className="text-[1.4rem] font-black tracking-tight text-charcoal">{step.title}</div>
                </div>
                <p className="mt-4 text-base leading-8 text-muted">{step.description}</p>
                <div
                  className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-black ${
                    index === 2 ? "bg-[#eaf5e7] text-[#73a36c]" : "bg-[#fff1dc] text-hermes"
                  }`}
                >
                  {step.badge}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 rounded-[1.4rem] border border-[#f3d956] bg-[#fffbea] px-6 py-5 text-[1.02rem] leading-8 text-[#8b5c18] md:px-8">
            <span className="mr-4 font-black text-hermes">注意</span>
            阿里云关联注册无独立在线入口，须通过授权合作伙伴人工报备方可操作。仅需提供企业全称，我们协助完成全部流程，报备完全免费。
          </div>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl border-t border-line pt-10">
          <div className="text-[1.7rem] font-black tracking-tight text-[#b8bec7]">立即开始</div>
          <div className="mt-6 rounded-[2rem] border border-[#d7e8ff] bg-[linear-gradient(180deg,#edf5ff_0%,#f7fbff_100%)] px-6 py-8 shadow-[0_28px_70px_rgba(58,114,205,0.12)] md:px-10">
            <SectionTitle>发送企业全称给我们，即可启动报备</SectionTitle>
            <div className="mt-8 grid gap-4 lg:grid-cols-[1.45fr_0.95fr]">
              <div className="grid gap-4">
                {contactItems.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.35, delay: index * 0.05 }}
                      className={`flex min-h-[8.2rem] flex-col items-center justify-center rounded-[1.35rem] px-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] ${
                        index === 0
                          ? "bg-[linear-gradient(180deg,#f39754_0%,#ea7f3e_100%)]"
                          : "bg-[linear-gradient(180deg,#eb8b4c_0%,#de7d45_100%)]"
                      }`}
                    >
                      <div className="flex items-center gap-3 text-[1.85rem] font-black">
                        <Icon size={24} />
                        <span>{item.title}</span>
                      </div>
                      <div className="mt-3 text-lg font-medium text-white/88">{item.value}</div>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                whileHover={{ y: -3, scale: 1.01 }}
                className="flex min-h-[16.8rem] items-center justify-center rounded-[1.35rem] border border-[#cfe1fb] bg-white px-5 py-5 shadow-[0_18px_40px_rgba(58,114,205,0.08)]"
              >
                <div className="flex flex-col items-center text-center">
                  <Image
                    alt="企微二维码"
                    className="h-[8.75rem] w-[8.75rem] rounded-2xl border border-[#dce7f5] object-cover"
                    height={140}
                    src="/contact-qr.png"
                    width={140}
                  />
                  <div className="mt-5 flex items-center gap-2 text-[1.55rem] font-black text-charcoal">
                    <QrCode size={20} className="text-hermes" />
                    <span>扫码咨询</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl border-t border-line pt-10">
          <div className="overflow-hidden rounded-[1.8rem] border border-line bg-[#fcfdff]">
            <div className="grid gap-8 px-6 py-8 md:grid-cols-[0.82fr_1.18fr] md:px-10">
              <div>
                <div className="text-sm font-black uppercase tracking-[0.2em] text-hermes">Authorized Partner</div>
                <SectionTitle>阿里云合作伙伴授权</SectionTitle>
                <Link
                  className="mt-8 inline-flex items-center rounded-full border border-hermes px-5 py-3 text-sm font-black text-hermes transition-all duration-300 hover:bg-hermes hover:text-white"
                  href="/about"
                >
                  查看更多
                </Link>
              </div>
              <div className="grid items-center justify-center gap-4 rounded-[1.4rem] bg-white p-4 md:grid-cols-[max-content_max-content] md:p-5">
                <div className="flex h-[430px] w-fit items-center justify-center rounded-[1.2rem] bg-[linear-gradient(180deg,#f5f9ff_0%,#edf4ff_100%)] p-2">
                  <Image
                    alt="阿里云优选级资质"
                    className="h-[430px] w-auto rounded-[1rem] object-contain object-center shadow-[0_10px_30px_rgba(103,146,212,0.16)]"
                    height={1612}
                    src="/about/aliyun-preferred-badge.jpg"
                    width={1398}
                  />
                </div>
                <div className="flex h-[430px] w-fit items-center justify-center rounded-[1.2rem] bg-[#fbfdff] p-2">
                  <Image
                    alt="阿里云合作伙伴授权"
                    className="h-[430px] w-auto rounded-[1rem] object-contain object-top shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                    height={420}
                    src="/about/aliyun-certificate.png"
                    width={680}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 pb-24 md:pb-28">
        <div className="mx-auto max-w-7xl border-t border-line pt-10">
          <div className="text-[1.7rem] font-black tracking-tight text-[#b8bec7]">常见问题</div>
          <div className="mt-8 space-y-7">
            {faqItems.map((item, index) => (
              <motion.div
                key={item.question}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className={index < faqItems.length - 1 ? "border-b border-line pb-7" : ""}
              >
                <div className="flex items-start gap-4">
                  <span className="pt-1 text-[1.8rem] font-black text-hermes">Q</span>
                  <div>
                    <div className="text-[1.6rem] font-black tracking-tight text-charcoal">{item.question}</div>
                    <div className="mt-3 max-w-5xl text-base leading-8 text-muted">{item.answer}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
