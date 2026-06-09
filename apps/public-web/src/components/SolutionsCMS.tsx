"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Clock, Home, Search, Tag } from "lucide-react";
import { motion } from "motion/react";

import type { PublicArticle, PublicArticleSectionConfig } from "../lib/articles-api";
import ArticleHtmlContent from "./ArticleHtmlContent";

function Breadcrumbs({
  section,
  selectedArticle,
}: {
  section: PublicArticleSectionConfig;
  selectedArticle?: PublicArticle;
}) {
  return (
    <nav className="flex items-center gap-2 text-sm font-medium text-muted mb-8 overflow-hidden whitespace-nowrap">
      <Link href="/" className="hover:text-hermes flex items-center gap-1 transition-colors shrink-0">
        <Home size={14} /> 首页
      </Link>
      <ChevronRight size={14} className="shrink-0" />
      <Link href={section.route} className={`transition-colors shrink-0 ${!selectedArticle ? "text-charcoal font-bold" : "hover:text-hermes"}`}>
        {section.breadcrumbsLabel}
      </Link>
      {selectedArticle ? (
        <>
          <ChevronRight size={14} className="shrink-0" />
          <span className="text-charcoal font-bold truncate">{selectedArticle.title}</span>
        </>
      ) : null}
    </nav>
  );
}

function ArticleDetail({
  article,
  section,
}: {
  article: PublicArticle;
  section: PublicArticleSectionConfig;
}) {
  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest">
          <span className="text-hermes px-3 py-1 bg-hermes/5 rounded-md border border-hermes/10">{article.category}</span>
          <span className="text-muted">{article.date}</span>
          <span className="text-muted flex items-center gap-1"><Clock size={12} /> {article.readTime} 阅读</span>
        </div>
        <h1 className="text-4xl lg:text-6xl font-black text-charcoal leading-tight">{article.title}</h1>
        <div className="flex items-center gap-4 py-6 border-y border-line">
          <div className="w-12 h-12 rounded-2xl bg-hermes flex items-center justify-center text-white font-black">{article.author.charAt(0)}</div>
          <div>
            <div className="font-black text-charcoal">{article.author}</div>
            <div className="text-xs text-muted font-bold tracking-widest mt-1">Yuncan Tech Team</div>
          </div>
        </div>
      </div>

      <ArticleHtmlContent html={article.contentHtml} fallback={article.contentText || article.excerpt} />

      <div className="pt-12 border-t border-line">
        <div className="text-sm font-black text-muted uppercase tracking-widest mb-6">相关标签</div>
        <div className="flex flex-wrap gap-3">
          {article.tags.map((tag) => (
            <span key={tag} className="px-4 py-2 bg-mist rounded-xl text-xs font-bold text-charcoal/60 border border-line">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <Link href={section.route} className="inline-flex items-center gap-3 bg-charcoal text-white px-8 py-4 rounded-2xl font-bold hover:bg-hermes transition-all shadow-xl shadow-ink/20">
        <ArrowRight className="rotate-180" size={20} /> 返回列表
      </Link>
    </div>
  );
}

function ArticleList({
  articles,
  searchQuery,
  section,
}: {
  articles: PublicArticle[];
  searchQuery: string;
  section: PublicArticleSectionConfig;
}) {
  return (
    <>
      <div className="mb-12">
        <div className="flex items-baseline gap-4">
          <h1 className="text-4xl md:text-5xl font-black text-charcoal mb-4 tracking-tight">{section.title}</h1>
          <div className="h-1 lg:h-2 w-20 lg:w-32 bg-hermes/30 rounded-full" />
        </div>
        <p className="max-w-3xl text-base md:text-lg leading-8 text-muted">
          {section.description}
        </p>
      </div>

      <div className="sticky top-24 z-30 mb-10 transition-all">
        <div className="bg-white p-2 rounded-3xl border border-line shadow-xl shadow-ink/5">
          <form action={section.route} className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              className="w-full bg-mist/50 border border-transparent rounded-2xl py-3.5 pl-14 pr-6 outline-none transition-all font-medium text-charcoal placeholder:text-muted"
              defaultValue={searchQuery}
              name="q"
              placeholder="按标题、摘要、标签关键词搜索"
              type="search"
            />
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {articles.length > 0 ? (
          articles.map((article, idx) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="block"
              aria-label={article.title}
            >
              <motion.article
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative p-8 rounded-3xl bg-white border border-line hover:border-hermes/30 transition-all duration-300 flex flex-col md:flex-row gap-8 items-start"
              >
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                    <span className="text-hermes px-2 py-1 bg-hermes/5 rounded-md border border-hermes/10">Case Study</span>
                    <span className="text-muted">{article.date}</span>
                  </div>

                  <h3 className="text-2xl font-black text-charcoal group-hover:text-charcoal/80 transition-colors leading-tight">{article.title}</h3>
                  <p className="text-muted/80 leading-relaxed line-clamp-2 text-base md:text-lg">{article.excerpt}</p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {article.tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1.5 text-[10px] font-bold bg-mist text-muted/60 px-3 py-1 rounded-lg border border-line/30 group-hover:bg-ink group-hover:text-white transition-all">
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 w-full md:w-48 lg:w-64 pt-6 md:pt-0 md:border-l md:border-line md:pl-8 flex flex-col justify-between h-full space-y-6">
                  <div>
                    <div className="text-[10px] text-muted font-black uppercase tracking-widest mb-3">Project Specs</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted font-medium">分类</span>
                        <span className="text-[10px] text-charcoal font-black">{article.category}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted font-medium">用时</span>
                        <span className="text-[10px] text-charcoal font-black">{article.readTime}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-black text-hermes uppercase tracking-widest self-end md:self-start bg-hermes/5 w-full justify-between p-3 rounded-xl border border-hermes/10 group-hover:bg-hermes group-hover:text-white transition-all duration-500">
                    查看详情 <ArrowRight size={14} />
                  </div>
                </div>
              </motion.article>
            </Link>
          ))
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-mist rounded-full flex items-center justify-center text-muted mx-auto mb-6">
              <BookOpen size={40} />
            </div>
            <h3 className="text-xl font-bold text-charcoal mb-2">暂无可展示的已发布文章</h3>
            {searchQuery ? <p className="text-muted">当前搜索条件下还没有已发布文章。</p> : null}
          </div>
        )}
      </div>
    </>
  );
}

export default function SolutionsCMS(
  props:
    | {
        mode: "list";
        articles: PublicArticle[];
        searchQuery?: string;
        section: PublicArticleSectionConfig;
      }
    | { mode: "detail"; article: PublicArticle; section: PublicArticleSectionConfig },
) {
  return (
    <div className="pt-32 pb-24 px-6 bg-paper min-h-screen">
      <div className="max-w-6xl mx-auto">
        <Breadcrumbs section={props.section} selectedArticle={props.mode === "detail" ? props.article : undefined} />
        {props.mode === "detail" ? (
          <ArticleDetail article={props.article} section={props.section} />
        ) : (
          <ArticleList
            articles={props.articles}
            searchQuery={props.searchQuery ?? ""}
            section={props.section}
          />
        )}
      </div>
    </div>
  );
}
