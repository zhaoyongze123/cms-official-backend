"""公开 SEO 真相源服务。"""

from __future__ import annotations

from typing import Any

from cms_apps.faq.models import FaqItem


def build_public_base_url(request) -> str:
    return request.build_absolute_uri("/").rstrip("/")


def build_article_canonical_url(request, article, seo_metadata=None) -> str:
    if seo_metadata is not None and seo_metadata.canonical_url:
        return seo_metadata.canonical_url
    return request.build_absolute_uri(f"/articles/{article.slug}/")


def build_article_breadcrumb_json_ld(request, article) -> dict[str, Any]:
    site_url = build_public_base_url(request)
    solutions_url = request.build_absolute_uri("/solutions")
    article_url = request.build_absolute_uri(f"/articles/{article.slug}/")
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "首页",
                "item": site_url,
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "解决方案",
                "item": solutions_url,
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": article.title,
                "item": article_url,
            },
        ],
    }


def build_article_faq_json_ld(article) -> dict[str, Any] | None:
    faq_items = list(article.faq_items.all().order_by("sort_order", "id"))
    if not faq_items:
        return None
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.answer,
                },
            }
            for item in faq_items
        ],
    }


def serialize_faq_items(article) -> list[dict[str, Any]]:
    return [
        {
            "question": item.question,
            "answer": item.answer,
            "sort_order": item.sort_order,
        }
        for item in article.faq_items.all().order_by("sort_order", "id")
    ]
