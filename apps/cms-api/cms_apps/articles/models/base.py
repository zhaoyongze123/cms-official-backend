from django.db import models
from django.utils import timezone


ARTICLE_STATUS_CHOICES = (
    ("draft", "草稿"),
    ("published", "已发布"),
    ("archived", "已下线/归档"),
)


class ArticleQuerySet(models.QuerySet):
    def published(self):
        now = timezone.now()
        return (
            self.filter(status="published")
            .filter(models.Q(publish_date__isnull=True) | models.Q(publish_date__lte=now))
            .order_by("-is_pinned", "-pinned_at", "-sort_order", "-publish_date", "-created_at")
        )
