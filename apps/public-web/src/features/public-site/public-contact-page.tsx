"use client";

import PublicLayout from "./public-layout";
import PublicLeadForm, { type ContactProductOption } from "./public-lead-form";

interface PublicContactPageProps {
  initialProductKey: string;
  productOptions: ContactProductOption[];
}

export default function PublicContactPage({
  initialProductKey,
  productOptions,
}: PublicContactPageProps) {
  return (
    <PublicLayout active="join">
      <main className="min-h-screen bg-[#f5f8fc] px-5 pb-20 pt-36 text-charcoal md:px-8 md:pb-28 md:pt-44 lg:px-12">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-[#dbe4f0] bg-white shadow-[0_24px_75px_rgba(31,54,88,0.11)]">
        <div className="border-b border-line bg-[#fbfcfe] px-7 pb-8 pt-9 md:px-10 md:pt-11">
          <p className="text-xs font-black tracking-[0.24em] text-hermes">AI DRIVE / DEMO REQUEST</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-charcoal md:text-5xl">申请免费体验</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">留下联系方式，云璨信息将在 1 个工作日内与您联系</p>
        </div>
        <PublicLeadForm
          initialProductKey={initialProductKey}
          productOptions={productOptions}
          source="public_contact_page"
        />
      </div>
      </main>
    </PublicLayout>
  );
}
