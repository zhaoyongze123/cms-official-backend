"""AI 审核 API 路由。"""

from django.urls import path

from .config_views import ai_generation_config_view
from .generation_views import (
    ai_generate_alt_view,
    ai_generate_description_view,
    ai_generate_metadata_view,
    ai_generate_slug_view,
    ai_generate_tags_view,
    ai_generate_title_view,
)
from .views import (
    ai_review_run_suggestions_view,
    ai_review_runs_view,
    ai_review_view,
    ai_suggestion_accept_view,
    ai_suggestion_reject_view,
)


urlpatterns = [
    path("ai/settings/generation/", ai_generation_config_view, name="api_ai_generation_config"),
    path("articles/<int:article_id>/ai-review/", ai_review_view, name="api_article_ai_review"),
    path("articles/<int:article_id>/ai-review-runs/", ai_review_runs_view, name="api_article_ai_review_runs"),
    path("articles/<int:article_id>/ai-generate-metadata/", ai_generate_metadata_view, name="api_article_ai_generate_metadata"),
    path("articles/<int:article_id>/ai-generate-title/", ai_generate_title_view, name="api_article_ai_generate_title"),
    path("articles/<int:article_id>/ai-generate-slug/", ai_generate_slug_view, name="api_article_ai_generate_slug"),
    path("articles/<int:article_id>/ai-generate-tags/", ai_generate_tags_view, name="api_article_ai_generate_tags"),
    path("articles/<int:article_id>/ai-generate-description/", ai_generate_description_view, name="api_article_ai_generate_description"),
    path("articles/<int:article_id>/ai-generate-alt/", ai_generate_alt_view, name="api_article_ai_generate_alt"),
    path("ai-review-runs/<str:run_id>/suggestions/", ai_review_run_suggestions_view, name="api_ai_review_run_suggestions"),
    path("ai-suggestions/<str:suggestion_id>/accept/", ai_suggestion_accept_view, name="api_ai_suggestion_accept"),
    path("ai-suggestions/<str:suggestion_id>/reject/", ai_suggestion_reject_view, name="api_ai_suggestion_reject"),
]
