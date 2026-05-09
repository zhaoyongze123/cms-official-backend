from django.urls import path

from . import api_views

app_name = "simple_cms_api"

urlpatterns = [
    path("articles/", api_views.article_list_api, name="article_list"),
    path("articles/<int:article_id>/", api_views.article_detail_api, name="article_detail"),
    path("articles/<int:article_id>/ai-review/", api_views.article_ai_review_api, name="article_ai_review"),
    path("articles/<int:article_id>/ai-review-runs/", api_views.article_ai_review_runs_api, name="article_ai_review_runs"),
    path("articles/<int:article_id>/seo-check/", api_views.article_seo_check_api, name="article_seo_check"),
    path("articles/<int:article_id>/publish/", api_views.article_publish_api, name="article_publish"),
    path("articles/<int:article_id>/analytics/", api_views.article_analytics_api, name="article_analytics"),
    path("ai-review-runs/<str:run_id>/suggestions/", api_views.ai_review_run_suggestions_api, name="ai_review_run_suggestions"),
    path("ai-suggestions/<str:suggestion_id>/accept/", api_views.ai_suggestion_accept_api, name="ai_suggestion_accept"),
    path("ai-suggestions/<str:suggestion_id>/reject/", api_views.ai_suggestion_reject_api, name="ai_suggestion_reject"),
    path("dashboard/seo-summary/", api_views.dashboard_seo_summary_api, name="dashboard_seo_summary"),
]
