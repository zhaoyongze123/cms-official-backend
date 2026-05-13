"""Analytics API 路由。"""

from django.urls import path

from .views import article_analytics_view, dashboard_audit_summary_view, dashboard_seo_summary_view


urlpatterns = [
    path("articles/<int:article_id>/analytics/", article_analytics_view, name="api_article_analytics"),
    path("dashboard/seo-summary/", dashboard_seo_summary_view, name="api_dashboard_seo_summary"),
    path("dashboard/seo-audit/", dashboard_audit_summary_view, name="api_dashboard_seo_audit_summary"),
]
