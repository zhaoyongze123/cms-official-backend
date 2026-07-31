"use client";

import { useEffect } from "react";
import PublicLayout from "./public-layout";
import SolutionsCMS from "../../components/SolutionsCMS";
import { buildWechatShareImageUrl, type PublicArticle, type PublicArticleSectionConfig } from "../../lib/articles-api";
import { configureWechatShare } from "../../lib/wechat-share";

export default function PublicArticlePage({
  article,
  section,
}: {
  article: PublicArticle;
  section: PublicArticleSectionConfig;
}) {
  useEffect(() => {
    configureWechatShare({
      title: article.seo.ogTitle || article.title,
      desc: article.seo.ogDescription || article.excerpt,
      link: article.seo.canonicalUrl,
      imgUrl: buildWechatShareImageUrl(article),
    }).catch(() => undefined);
  }, [article]);

  return (
    <PublicLayout active={section.key}>
      <SolutionsCMS mode="detail" article={article} section={section} />
    </PublicLayout>
  );
}
