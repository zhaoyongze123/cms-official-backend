from django import template
from apps.simple_cms.models import Article, Category
from apps.media_library.models import ImageItem, FileItem
from apps.sys_settings.models import SiteSetting
from apps.aliyun_monitor.models import DnsDomainStat, EcsInstanceSnapshot, EcsMetricPoint
from django.contrib.auth import get_user_model
from django.contrib.admin.models import LogEntry
from django.utils import timezone

register = template.Library()


@register.simple_tag
def get_dashboard_stats():
    User = get_user_model()
    now_tz = timezone.now()
    today = now_tz.replace(hour=0, minute=0, second=0, microsecond=0)

    return {
        "article_count": Article.objects.count(),
        "category_count": Category.objects.count(),
        "media_count": ImageItem.objects.count() + FileItem.objects.count(),
        "user_count": User.objects.count(),
        "log_count": LogEntry.objects.filter(action_time__gte=today).count(),
        "setting_count": SiteSetting.objects.count(),
        "ecs_instance_count": EcsInstanceSnapshot.objects.count(),
        "dns_domain_count": DnsDomainStat.objects.values("domain_name").distinct().count(),
        "ecs_metric_count": EcsMetricPoint.objects.count(),
    }
