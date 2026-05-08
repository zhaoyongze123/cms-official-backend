import json
import types
from datetime import timedelta

from django.contrib import admin
from django.db.models import Avg, Count, FloatField, Max, OuterRef, Subquery, Sum
from django.template.response import TemplateResponse
from django.urls import path
from django.utils import timezone

from apps.sys_settings.models import SiteSetting

from .models import DnsDomainStat, EcsInstanceSnapshot, EcsMetricPoint


def _build_labels(points):
    return [point.timestamp.strftime("%m-%d %H:%M") for point in points]


def _build_values(points):
    return [point.value if point.value is not None else 0 for point in points]


def _sample_points(points, target=240):
    if len(points) <= target:
        return points
    step = max(1, len(points) // target)
    return points[::step]


def _to_kbps(value):
    if value is None:
        return None
    try:
        return float(value) / 1024.0
    except (TypeError, ValueError):
        return None


def aliyun_dashboard_view(request):
    setting = SiteSetting.objects.first()
    aliyun_configured = bool(
        setting and setting.aliyun_access_key_id and setting.aliyun_access_key_secret
    )
    now = timezone.now()

    ecs_status = (
        EcsInstanceSnapshot.objects.values("status")
        .annotate(count=Count("id"))
        .order_by()
    )

    domains = list(
        DnsDomainStat.objects.values_list("domain_name", flat=True).distinct()
    )
    selected_domain = request.GET.get("domain") or (domains[0] if domains else "")
    dns_points = DnsDomainStat.objects.filter(
        domain_name=selected_domain,
        timestamp__gte=now - timedelta(days=1),
    ).order_by("timestamp")
    dns_24h_total = (
        DnsDomainStat.objects.filter(timestamp__gte=now - timedelta(days=1))
        .aggregate(total=Sum("request_count"))
        .get("total")
        or 0
    )

    instances = list(
        EcsInstanceSnapshot.objects.values_list("instance_id", "instance_name")
    )
    selected_instance = request.GET.get("instance") or (
        instances[0][0] if instances else ""
    )
    metric_name = "CPUUtilization"
    metric_points = list(
        EcsMetricPoint.objects.filter(
            metric_name=metric_name,
            timestamp__gte=now - timedelta(hours=24),
        ).order_by("timestamp")
    )
    metric_points = _sample_points(metric_points, 240)

    cpu_avg = (
        EcsMetricPoint.objects.filter(
            metric_name="CPUUtilization",
            timestamp__gte=now - timedelta(hours=24),
        )
        .aggregate(avg=Avg("value"))
        .get("avg")
    )
    net_in_avg = (
        EcsMetricPoint.objects.filter(
            metric_name="InternetIn",
            timestamp__gte=now - timedelta(hours=24),
        )
        .aggregate(avg=Avg("value"))
        .get("avg")
    )
    net_out_avg = (
        EcsMetricPoint.objects.filter(
            metric_name="InternetOut",
            timestamp__gte=now - timedelta(hours=24),
        )
        .aggregate(avg=Avg("value"))
        .get("avg")
    )

    latest_cpu = (
        EcsMetricPoint.objects.filter(
            instance_id=OuterRef("instance_id"),
            metric_name="CPUUtilization",
        )
        .order_by("-timestamp")
        .values("value")[:1]
    )
    latest_in = (
        EcsMetricPoint.objects.filter(
            instance_id=OuterRef("instance_id"),
            metric_name="InternetIn",
        )
        .order_by("-timestamp")
        .values("value")[:1]
    )
    latest_out = (
        EcsMetricPoint.objects.filter(
            instance_id=OuterRef("instance_id"),
            metric_name="InternetOut",
        )
        .order_by("-timestamp")
        .values("value")[:1]
    )

    recent_instances = (
        EcsInstanceSnapshot.objects.order_by("expired_time", "instance_name")
        .annotate(
            cpu_latest=Subquery(latest_cpu, output_field=FloatField()),
            net_in_latest=Subquery(latest_in, output_field=FloatField()),
            net_out_latest=Subquery(latest_out, output_field=FloatField()),
        )[:20]
    )

    latest_dns_stats = (
        DnsDomainStat.objects.values("domain_name")
        .annotate(latest_timestamp=Max("timestamp"))
        .order_by("domain_name")
    )
    latest_dns_rows = []
    for item in latest_dns_stats:
        row = DnsDomainStat.objects.filter(
            domain_name=item["domain_name"],
            timestamp=item["latest_timestamp"],
        ).first()
        if row:
            latest_dns_rows.append(row)

    context = {
        "title": "云资源概览",
        "ecs_status_labels": json.dumps([item["status"] or "unknown" for item in ecs_status]),
        "ecs_status_values": json.dumps([item["count"] for item in ecs_status]),
        "dns_domains": domains,
        "selected_domain": selected_domain,
        "dns_labels": json.dumps(_build_labels(dns_points)),
        "dns_values": json.dumps([point.request_count for point in dns_points]),
        "dns_24h_total": dns_24h_total,
        "ecs_instances": instances,
        "selected_instance": selected_instance,
        "metric_name": metric_name,
        "metric_labels": json.dumps(_build_labels(metric_points)),
        "metric_values": json.dumps(_build_values(metric_points)),
        "ecs_total": EcsInstanceSnapshot.objects.count(),
        "ecs_running": EcsInstanceSnapshot.objects.filter(status__iexact="Running").count(),
        "cpu_avg": cpu_avg,
        "net_in_avg": _to_kbps(net_in_avg),
        "net_out_avg": _to_kbps(net_out_avg),
        "recent_instances": recent_instances,
        "latest_dns_rows": latest_dns_rows,
        "aliyun_configured": aliyun_configured,
        "last_sync_at": setting.aliyun_last_sync_at if setting else None,
        "last_sync_status": setting.aliyun_last_sync_status if setting else "",
        "last_sync_message": setting.aliyun_last_sync_message if setting else "",
    }
    context.update(admin.site.each_context(request))
    return TemplateResponse(request, "admin/aliyun_monitor/dashboard.html", context)


_original_get_urls = admin.site.get_urls


def _get_admin_urls(self):
    urls = _original_get_urls()
    custom = [
        path(
            "aliyun-monitor/",
            self.admin_view(aliyun_dashboard_view),
            name="aliyun-monitor",
        ),
    ]
    return custom + urls


admin.site.get_urls = types.MethodType(_get_admin_urls, admin.site)


@admin.register(EcsInstanceSnapshot)
class EcsInstanceSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "instance_name",
        "status",
        "instance_type",
        "ip_summary",
        "region_id",
        "expired_time_display",
    )
    list_filter = ("status", "region_id")
    search_fields = ("instance_id", "instance_name", "public_ip", "private_ip")
    ordering = ("expired_time", "instance_name")
    list_display_links = None
    list_per_page = 100
    actions = None

    def has_module_permission(self, request):
        return bool(request.user and request.user.is_staff)

    def has_view_permission(self, request, obj=None):
        return bool(request.user and request.user.is_staff)

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="IP")
    def ip_summary(self, obj):
        public_ip = obj.public_ip or "-"
        private_ip = obj.private_ip or "-"
        return f"{public_ip} / {private_ip}"

    @admin.display(description="到期时间", ordering="expired_time")
    def expired_time_display(self, obj):
        if not obj.expired_time:
            return "-"
        return timezone.localtime(obj.expired_time).strftime("%Y-%m-%d %H:%M")


@admin.register(DnsDomainStat)
class DnsDomainStatAdmin(admin.ModelAdmin):
    list_display = ("domain_name", "request_count", "timestamp_display")
    search_fields = ("domain_name",)
    ordering = ("domain_name",)
    list_display_links = None
    list_per_page = 100
    actions = None

    def has_module_permission(self, request):
        return bool(request.user and request.user.is_staff)

    def has_view_permission(self, request, obj=None):
        return bool(request.user and request.user.is_staff)

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.order_by("domain_name", "-timestamp").distinct("domain_name")

    @admin.display(description="最近统计时间", ordering="timestamp")
    def timestamp_display(self, obj):
        if not obj.timestamp:
            return "-"
        return timezone.localtime(obj.timestamp).strftime("%Y-%m-%d %H:%M")


@admin.register(EcsMetricPoint)
class EcsMetricPointAdmin(admin.ModelAdmin):
    list_display = ("instance_id", "metric_name", "timestamp", "value", "region_id")
    list_filter = ("metric_name", "region_id")
    search_fields = ("instance_id",)
    date_hierarchy = "timestamp"
    ordering = ("-timestamp",)

    def has_module_permission(self, request):
        return False

    def has_view_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False