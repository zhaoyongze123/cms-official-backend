"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type AiDriveProduct = {
  id: string;
  name: string;
  summary: string;
  video: string;
  poster: string;
};

type AiDriveProductShowcaseProps = {
  products: AiDriveProduct[];
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  tags: string[];
  primaryCtaLabel: string;
  onPrimaryCta: () => void;
  secondaryCtaLabel: string;
  onSecondaryCta: () => void;
  trustItems: string[];
};

export default function AiDriveProductShowcase({
  products,
  eyebrow,
  title,
  description,
  tags,
  primaryCtaLabel,
  onPrimaryCta,
  secondaryCtaLabel,
  onSecondaryCta,
  trustItems,
}: AiDriveProductShowcaseProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeProductId, setActiveProductId] = useState(products[0]?.id ?? "");
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const reduceMotion = useReducedMotion();
  const activeProduct = products.find((product) => product.id === activeProductId) ?? products[0];

  const playVideo = useCallback(() => {
    if (!isVisible || isPaused || reduceMotion) return;
    void videoRef.current?.play().catch(() => setIsPaused(true));
  }, [isPaused, isVisible, reduceMotion]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          window.setTimeout(playVideo, 120);
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.24 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [playVideo]);

  useEffect(() => {
    if (!isVisible) return;
    const timer = window.setTimeout(playVideo, 90);
    return () => window.clearTimeout(timer);
  }, [activeProductId, isVisible, playVideo]);

  if (!activeProduct) return null;

  const selectProduct = (productId: string) => {
    if (productId === activeProductId) return;
    setProgress(0);
    setIsPaused(false);
    setActiveProductId(productId);
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setIsPaused(false);
      void video.play().catch(() => setIsPaused(true));
      return;
    }
    setIsPaused(true);
    video.pause();
  };

  const updateProgress = () => {
    const video = videoRef.current;
    if (!video?.duration || !Number.isFinite(video.duration)) return;
    setProgress(Math.min(100, (video.currentTime / video.duration) * 100));
  };

  const handlePrimaryCta = () => {
    onPrimaryCta();
    setIsPaused(false);
    window.setTimeout(() => void videoRef.current?.play().catch(() => setIsPaused(true)), 0);
  };

  return (
    <section
      aria-labelledby="ai-drive-showcase-heading"
      className="relative isolate flex min-h-0 items-center overflow-hidden bg-white px-5 pb-12 pt-28 text-charcoal md:min-h-[100svh] md:px-8 md:pb-8 md:pt-32 lg:px-12"
      id="ai-drive-showcase"
      ref={sectionRef}
    >
      <div className="relative mx-auto grid w-full max-w-[1520px] items-center gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.5fr)] lg:gap-16">
        <div className="min-w-0 px-1 md:px-4 lg:px-0">
          <div className="max-w-[32rem]">
            <div className="inline-flex items-center rounded-full border border-hermes/25 bg-hermes/10 px-4 py-2 text-sm font-bold text-hermes">{eyebrow}</div>
            <h1 className="mt-6 text-balance text-4xl font-black leading-[1.1] tracking-tight text-charcoal md:text-[2.9rem] xl:text-[3.35rem]" id="ai-drive-showcase-heading">{title}</h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted md:text-[1.05rem]">{description}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-charcoal">
              {tags.map((tag) => <span className="rounded-full border border-line bg-white px-3 py-2" key={tag}>{tag}</span>)}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-hermes px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-hermes-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hermes" onClick={handlePrimaryCta} type="button">{primaryCtaLabel} <ArrowRight size={17} aria-hidden="true" /></button>
              <button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-bold text-charcoal transition-colors hover:border-hermes hover:text-hermes focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hermes" onClick={onSecondaryCta} type="button">{secondaryCtaLabel}</button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">{trustItems.map((item) => <span key={item}>{item}</span>)}</div>
          </div>

          {products.length > 1 ? <div className="mt-10 border-t border-line">
            <div className="pb-3 pt-5 text-xs font-black tracking-[0.18em] text-[#7c8ba1]">产品能力</div>
            <div aria-label="产品选择" role="tablist">
              {products.map((product, index) => {
                const isActive = product.id === activeProduct.id;
                return (
                  <button
                    aria-selected={isActive}
                    className={`group flex min-h-16 w-full items-center gap-4 border-t border-line py-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-hermes ${isActive ? "text-[#1d4ed8]" : "text-charcoal hover:text-[#1d4ed8]"}`}
                    key={product.id}
                    onClick={() => selectProduct(product.id)}
                    role="tab"
                    type="button"
                  >
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${isActive ? "bg-[#2563eb] text-white" : "bg-white/70 text-[#7c8ba1]"}`} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1"><span className="block text-base font-black">{product.name}</span><span className={`mt-1 block truncate text-xs ${isActive ? "text-[#5c78aa]" : "text-muted"}`}>{product.summary}</span></span>
                    <ArrowRight className={`shrink-0 transition-all ${isActive ? "text-[#2563eb]" : "-translate-x-1 text-[#9aa7b8] opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`} size={17} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div> : null}
        </div>

        <div className="relative min-w-0 flex items-center">
          <div className="relative w-full">
            <motion.video animate={{ opacity: 1 }} autoPlay={!reduceMotion && !isPaused && isVisible} className="h-auto w-full object-contain" initial={{ opacity: 0 }} key={activeProduct.video} loop muted onTimeUpdate={updateProgress} playsInline poster={activeProduct.poster || undefined} preload="metadata" ref={videoRef} src={activeProduct.video} transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(0deg,rgba(10,29,52,0.32),transparent)]" aria-hidden="true" />
            <div className="pointer-events-none absolute bottom-4 left-5 min-w-0 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)] md:bottom-6 md:left-7">
              <p className="text-[11px] font-black tracking-[0.15em] text-[#ffd0ad]">正在展示</p>
              <p className="mt-1 text-lg font-black leading-tight md:text-2xl">{activeProduct.name}</p>
            </div>
            <button aria-label={isPaused ? "播放产品演示" : "暂停产品演示"} aria-pressed={isPaused} className="absolute bottom-4 right-4 inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/90 text-charcoal shadow-lg transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hermes md:bottom-6 md:right-6" onClick={togglePlayback} type="button">{isPaused ? <Play size={17} fill="currentColor" aria-hidden="true" /> : <Pause size={17} fill="currentColor" aria-hidden="true" />}</button>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10" aria-hidden="true"><span className="block h-full bg-hermes transition-[width] duration-100" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
