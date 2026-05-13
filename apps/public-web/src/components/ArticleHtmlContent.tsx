import React from 'react';

export default function ArticleHtmlContent({ html, fallback }: { html: string; fallback: string }) {
  if (!html.trim()) {
    return <div className="text-muted leading-loose text-lg whitespace-pre-wrap font-medium">{fallback}</div>;
  }

  return (
    <div
      className="article-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
