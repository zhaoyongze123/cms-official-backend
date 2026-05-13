"""AI 审核查询选择器。"""

from django.core.exceptions import ValidationError

from cms_apps.ai_reviews.models import AiPatch, AiReviewRun, AiSuggestion


def get_ai_review_runs_queryset():
    return AiReviewRun.objects.select_related("article")


def get_ai_suggestions_queryset():
    return AiSuggestion.objects.select_related("article", "run").prefetch_related("patches")


def get_ai_patches_queryset():
    return AiPatch.objects.select_related("suggestion", "suggestion__run", "suggestion__article")


def get_ai_suggestion_by_suggestion_id(suggestion_id: str):
    suggestion = (
        AiSuggestion.objects.select_related("article", "run")
        .prefetch_related("patches")
        .filter(suggestion_id=suggestion_id)
        .first()
    )
    if suggestion is None:
        raise ValidationError({"suggestion_id": "AI 建议不存在。"})
    return suggestion
