import re

from django.db.models import Count, Q
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.views.generic import DetailView, ListView

from .models import Article, ArticleSlugHistory, Category, Tag
from .services.seo import build_seo_context, build_toc


def get_category_queryset():
    now = timezone.now()
    return Category.objects.annotate(
        article_count=Count(
            "article",
            filter=Q(article__status="published")
            & (Q(article__publish_date__isnull=True) | Q(article__publish_date__lte=now)),
            distinct=True,
        )
    ).order_by("-sort_order", "name")


class ArticleListView(ListView):
    model = Article
    template_name = "simple_cms/article_list.html"
    context_object_name = "articles"
    paginate_by = 10

    def get_queryset(self):
        return Article.objects.published()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["categories"] = get_category_queryset()
        context["published_total"] = Article.objects.published().count()
        context["search_query"] = ""
        return context


class SearchArticleListView(ListView):
    template_name = "simple_cms/article_list.html"
    context_object_name = "articles"
    paginate_by = 10

    def get_queryset(self):
        query = self.request.GET.get("q", "").strip()
        qs = Article.objects.published()
        if not query:
            return qs
        return qs.filter(
            Q(title__icontains=query)
            | Q(body__icontains=query)
            | Q(category__name__icontains=query)
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["categories"] = get_category_queryset()
        context["published_total"] = Article.objects.published().count()
        context["search_query"] = self.request.GET.get("q", "").strip()
        return context


class TagArticleListView(ListView):
    template_name = "simple_cms/article_list.html"
    context_object_name = "articles"
    paginate_by = 10

    def get_queryset(self):
        self.tag = get_object_or_404(Tag, slug=self.kwargs["slug"])
        return Article.objects.published().filter(tags=self.tag)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["tag"] = self.tag
        context["categories"] = get_category_queryset()
        context["published_total"] = Article.objects.published().count()
        context["search_query"] = ""
        return context


class CategoryArticleListView(ListView):
    template_name = "simple_cms/article_list.html"
    context_object_name = "articles"
    paginate_by = 10

    def get_queryset(self):
        self.category = get_object_or_404(Category, slug=self.kwargs["slug"])
        return Article.objects.published().filter(category=self.category)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["category"] = self.category
        context["categories"] = get_category_queryset()
        context["published_total"] = Article.objects.published().count()
        context["search_query"] = ""
        return context


class ArticleDetailView(DetailView):
    model = Article
    template_name = "simple_cms/article_detail.html"
    context_object_name = "article"
    slug_field = "slug"
    slug_url_kwarg = "slug"

    def get_queryset(self):
        return Article.objects.published()

    def get(self, request, *args, **kwargs):
        try:
            return super().get(request, *args, **kwargs)
        except Http404:
            old_slug = kwargs.get(self.slug_url_kwarg)
            if not old_slug:
                raise

            history = ArticleSlugHistory.objects.select_related("article").filter(slug=old_slug).first()
            if not history:
                raise

            if Article.objects.published().filter(pk=history.article_id).exists():
                return redirect(
                    "simple_cms:article_detail",
                    slug=history.article.slug,
                    permanent=True,
                )
            raise

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        qs = Article.objects.published().order_by("-created_at")
        current = self.object
        context["prev_article"] = qs.filter(created_at__gt=current.created_at).order_by("created_at").first()
        context["next_article"] = qs.filter(created_at__lt=current.created_at).first()
        seo_context = build_seo_context(current, request=self.request)
        toc_items = build_toc(current)
        rendered_body = current.content_html or current.body
        for item in toc_items:
            escaped_title = re.escape(item["title"])
            rendered_body = re.sub(
                rf"(<h{item['level']}[^>]*>)({escaped_title})(</h{item['level']}>)",
                rf'\1<a id="{item["anchor"]}"></a>\2\3',
                rendered_body,
                count=1,
            )
        context["seo_context"] = seo_context
        context["toc_items"] = toc_items
        context["rendered_body"] = rendered_body
        context["faq_items"] = list(current.faq_items.all())
        return context


class ArticleDetailByIdView(ArticleDetailView):
    pk_url_kwarg = "pk"
