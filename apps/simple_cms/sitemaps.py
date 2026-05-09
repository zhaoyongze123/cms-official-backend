from django.contrib.sitemaps import Sitemap
from django.urls import reverse

from .models import Article, Category, Tag


class ArticleSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return Article.objects.published()

    def lastmod(self, obj):
        return obj.updated_at


class CategorySitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.5

    def items(self):
        return Category.objects.filter(article__in=Article.objects.published()).distinct().order_by("pk")


class TagSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.4

    def items(self):
        return Tag.objects.filter(articles__in=Article.objects.published()).distinct().order_by("pk")


class StaticViewSitemap(Sitemap):
    changefreq = "daily"
    priority = 1.0

    def items(self):
        return ["simple_cms:article_list"]

    def location(self, item):
        return reverse(item)
