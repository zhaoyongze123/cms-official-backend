"use client";

import PublicLayout from "./public-layout";

interface PublicLegalPageProps {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
}

export default function PublicLegalPage({
  eyebrow,
  title,
  description,
  sections,
}: PublicLegalPageProps) {
  return (
    <PublicLayout active="landing">
      <section className="bg-[#f3f4f7] px-6 pb-24 pt-36">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-[#e3e6ec] bg-white px-10 py-12 shadow-[0_24px_60px_rgba(15,23,42,0.06)] md:px-16 md:py-16">
          <span className="inline-flex rounded-full bg-hermes/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-hermes">
            {eyebrow}
          </span>
          <h1 className="mt-8 text-4xl font-black leading-tight text-charcoal md:text-5xl">{title}</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-muted md:text-lg">{description}</p>

          <div className="mt-12 space-y-12">
            {sections.map((section, index) => (
              <article
                key={section.heading}
                className={index === 0 ? "" : "border-t border-[#eceff4] pt-10"}
              >
                <h2 className="text-2xl font-black leading-tight text-charcoal md:text-3xl">{section.heading}</h2>
                <div className="mt-6 space-y-5 text-base leading-9 text-slate-600">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
