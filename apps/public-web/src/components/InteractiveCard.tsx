import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { Layers, Users, Zap, RotateCw } from 'lucide-react';

interface CardInfo {
  id: number;
  type: 'poster' | 'case' | 'feedback';
  title: string;
  subtitle: string;
  description: string;
  image: string;
  color: string;
}

const CARD_DATA: CardInfo[] = [
  {
    id: 1,
    type: 'poster',
    title: '邮件数据归档，安全合规，尽在掌控',
    subtitle: 'Mail Archive',
    description: '邮件归档解决方案，帮助企业实现邮件数据本地化存储，支持压缩、审计、快速检索与统一管理。',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
    color: '#FF5F1F'
  },
  {
    id: 2,
    type: 'case',
    title: 'AI 真实提效，填表不再耗时',
    subtitle: 'AI Automation',
    description: 'AI 驱动的表格自动化解决方案，实现表格读取、查询、分类与填充的智能化处理，大幅减少人工操作，显著提升填表效率。',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop',
    color: '#00D1FF'
  },
  {
    id: 3,
    type: 'feedback',
    title: 'AI + 网盘，落地效果出乎意料',
    subtitle: 'AI Knowledge Base',
    description: '以企业网盘作为 AI 数据底座，一举解决落地 AI 的三大痛点：数据孤岛、场景缺失与数据安全，让 AI 真正在企业内部跑起来。',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
    color: '#32CD32'
  }
];

export const InteractiveCard = () => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  
  const currentCard = CARD_DATA[index % CARD_DATA.length];

  const variants: Variants = {
    initial: (direction: number) => ({
      rotateY: direction > 0 ? 90 : -90,
      x: direction > 0 ? 100 : -100,
      scale: 0.8,
      opacity: 0,
    }),
    animate: {
      rotateY: 0,
      x: 0,
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 120,
        damping: 18,
      }
    },
    exit: (direction: number) => ({
      rotateY: direction > 0 ? -90 : 90,
      x: direction > 0 ? -100 : 100,
      scale: 0.8,
      opacity: 0,
      transition: {
        duration: 0.3
      }
    }),
  };

  const handleNext = () => {
    setDirection(1);
    setIndex((prev) => prev + 1);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDirection(1);
      setIndex((prev) => prev + 1);
    }, 7000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[550px] flex items-center justify-center perspective-2000">
      <div 
        className="relative w-full max-w-md h-full cursor-pointer group"
        onClick={handleNext}
      >
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 w-full h-full"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="w-full h-full bg-white rounded-[3rem] shadow-2xl border border-line overflow-hidden flex flex-col group-hover:border-hermes/30 transition-colors duration-500">
              {/* Image Header with Liquid Overlay */}
              <div className="relative h-[60%] overflow-hidden">
                <Image
                  src={currentCard.image}
                  alt={currentCard.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 448px"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                <div className="absolute top-6 left-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentCard.color }} />
                  <span className="text-[10px] font-black tracking-[0.3em] text-white/60 uppercase">
                    {currentCard.subtitle}
                  </span>
                </div>

                <div className="absolute bottom-8 left-8 right-8">
                  <h3 className="text-3xl font-black text-white leading-tight tracking-tight">
                    {currentCard.title}
                  </h3>
                </div>
              </div>

              {/* Content Body */}
              <div className="flex-1 p-8 flex flex-col justify-between bg-white relative">
                <p className="text-charcoal/70 leading-relaxed font-medium">
                  {currentCard.description}
                </p>

                <div className="flex items-center justify-between pt-6">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-500 group-hover:rotate-12"
                      style={{ backgroundColor: currentCard.color }}
                    >
                      {currentCard.type === 'poster' && <Zap size={22} />}
                      {currentCard.type === 'case' && <Layers size={22} />}
                      {currentCard.type === 'feedback' && <Users size={22} />}
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-0.5">Explorer</div>
                      <div className="text-xs font-bold text-charcoal">0{ (index % CARD_DATA.length) + 1 } / 03</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 px-4 py-2 bg-mist rounded-full hover:bg-hermes hover:text-white transition-all duration-300">
                    <span className="text-[10px] font-black uppercase tracking-widest">NEXT</span>
                    <RotateCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Stage-Manager Inspired Side Accumulations (Visual Dept) */}
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex flex-col gap-4 -z-10 opacity-20 group-hover:opacity-40 transition-all duration-700 blur-[1px] group-hover:blur-0">
              <div className="w-20 h-14 bg-slate-300 rounded-xl -rotate-12 translate-x-4" />
              <div className="w-20 h-14 bg-slate-400 rounded-xl rotate-6 -translate-x-2" />
              <div className="w-20 h-14 bg-slate-500 rounded-xl -rotate-3 translate-x-1" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Background Decor */}
      <div className="absolute inset-0 -z-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-hermes/5 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] border border-hermes/5 rounded-full pointer-events-none" />
      </div>
    </div>
  );
};
