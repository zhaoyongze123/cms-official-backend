from django import forms
from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse

from cms_apps.ai_reviews.services import fetch_siliconflow_models
from cms_apps.ai_reviews.services.configuration import mask_api_key

from .models import SiteSetting


class SiteSettingForm(forms.ModelForm):
    siliconflow_api_key = forms.CharField(
        label="硅基流动 API Key",
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text="留空表示保留当前 Key，输入新值后覆盖旧值。",
    )
    ai_review_model = forms.ChoiceField(label="AI 审核与扩展生成默认模型")
    ai_generate_model = forms.ChoiceField(label="AI 四项生成默认模型")
    ai_alt_model = forms.ChoiceField(label="AI 图片 Alt 生成模型")
    ai_generate_model_options = forms.MultipleChoiceField(
        label="AI 四项生成可选模型列表",
        required=False,
        widget=forms.SelectMultiple(attrs={"size": 12}),
        help_text="按住 Command/Ctrl 可多选。默认模型必须包含在这里。",
    )
    google_service_account_json = forms.CharField(
        label="Google Service Account JSON",
        required=False,
        widget=forms.Textarea(attrs={"rows": 12, "spellcheck": "false"}),
        help_text="粘贴完整 JSON。留空表示当前未接入 GSC / GA4 真实同步。",
    )
    crux_api_key = forms.CharField(
        label="CrUX / PageSpeed API Key",
        required=False,
        widget=forms.PasswordInput(render_value=True),
    )

    class Meta:
        model = SiteSetting
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and self.instance.siliconflow_api_key:
            masked = mask_api_key(self.instance.siliconflow_api_key)
            self.fields["siliconflow_api_key"].help_text = (
                f"当前已保存：{masked}。留空表示保留当前 Key，输入新值后覆盖旧值。"
            )
        model_options, options_error = self._load_model_options()
        choices = [(item, item) for item in model_options]
        if self.instance and self.instance.pk:
            for current_value in [self.instance.ai_review_model, self.instance.ai_generate_model, self.instance.ai_alt_model]:
                if current_value and current_value not in model_options:
                    choices.append((current_value, current_value))
                    model_options.append(current_value)

        self.fields["ai_review_model"].choices = choices
        self.fields["ai_generate_model"].choices = choices
        self.fields["ai_alt_model"].choices = choices
        self.fields["ai_generate_model_options"].choices = choices
        self.fields["ai_generate_model_options"].initial = self.instance.ai_generate_model_options or model_options

        if options_error:
            fallback_note = f"硅基流动模型列表读取失败，当前使用回退选项：{options_error}"
            self.fields["ai_review_model"].help_text = fallback_note
            self.fields["ai_generate_model"].help_text = fallback_note
            self.fields["ai_alt_model"].help_text = fallback_note
            self.fields["ai_generate_model_options"].help_text = (
                f"{self.fields['ai_generate_model_options'].help_text} {fallback_note}"
            )

    @staticmethod
    def _load_model_options():
        try:
            models = fetch_siliconflow_models()
            if models:
                return list(models), None
        except Exception as error:
            return list(SiteSetting.DEFAULT_AI_GENERATE_MODEL_OPTIONS), str(error)
        return list(SiteSetting.DEFAULT_AI_GENERATE_MODEL_OPTIONS), "硅基流动返回空模型列表"

    def clean_aliyun_cms_metrics(self):
        raw = self.cleaned_data.get("aliyun_cms_metrics", "") or ""
        items = [item.strip() for item in raw.split(",") if item.strip()]
        allowed = {"CPUUtilization", "InternetIn", "InternetOut", "MemoryUtilization"}
        filtered = [item for item in items if item in allowed]
        seen = set()
        result = []
        for item in filtered:
            if item not in seen:
                seen.add(item)
                result.append(item)
        return ",".join(result)

    def clean_siliconflow_api_key(self):
        value = str(self.cleaned_data.get("siliconflow_api_key") or "").strip()
        if value:
            return value
        if self.instance and self.instance.pk:
            return self.instance.siliconflow_api_key
        return ""

    def clean_ai_generate_model_options(self):
        value = self.cleaned_data.get("ai_generate_model_options") or []
        normalized = []
        for item in value:
            text = str(item).strip()
            if text and text not in normalized:
                normalized.append(text)
        if not normalized:
            normalized = list(SiteSetting.DEFAULT_AI_GENERATE_MODEL_OPTIONS)
        return normalized

    def clean_google_service_account_json(self):
        value = str(self.cleaned_data.get("google_service_account_json") or "").strip()
        if not value:
            return ""
        try:
            forms.JSONField().clean(value)
        except forms.ValidationError as error:
            raise forms.ValidationError("Google Service Account JSON 不是合法 JSON。") from error
        return value

    def clean(self):
        cleaned_data = super().clean()
        selected_options = cleaned_data.get("ai_generate_model_options") or []
        for field_name in ["ai_review_model", "ai_generate_model", "ai_alt_model"]:
            current_value = str(cleaned_data.get(field_name) or "").strip()
            if current_value and current_value not in selected_options:
                selected_options.append(current_value)
        cleaned_data["ai_generate_model_options"] = selected_options
        return cleaned_data


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    form = SiteSettingForm
    list_display = ("site_title", "storage_path", "allow_video", "max_upload_size")
    readonly_fields = (
        "google_last_sync_at",
        "google_last_sync_status",
        "google_last_sync_message",
        "aliyun_last_sync_at",
        "aliyun_last_sync_status",
        "aliyun_last_sync_message",
    )

    fieldsets = (
        (None, {
            "fields": (
                "site_title", "site_logo", "favicon",
                "seo_keywords", "seo_description",
                "third_party_head_scripts",
                "third_party_body_end_scripts",
                "storage_path", "allow_video", "max_upload_size",
            )
        }),
        ("前台内容", {
            "fields": (
                "homepage_featured_article_primary",
                "homepage_featured_article_secondary",
                "homepage_featured_article_tertiary",
                "homepage_solution_article_1",
                "homepage_solution_article_2",
                "homepage_solution_article_3",
                "homepage_solution_article_4",
                "homepage_case_logo_wall_image",
            )
        }),
        ("AI 模型与 Prompt", {
            "fields": (
                "siliconflow_api_key",
                "ai_review_model",
                "ai_generate_model",
                "ai_alt_model",
                "ai_generate_model_options",
                "ai_review_prompt",
                "ai_metadata_prompt",
                "ai_faq_prompt",
                "ai_internal_links_prompt",
                "ai_alt_prompt",
                "ai_generate_title_prompt",
                "ai_generate_slug_prompt",
                "ai_generate_tags_prompt",
                "ai_generate_description_prompt",
            )
        }),
        ("Google 监控", {
            "fields": (
                "site_public_base_url",
                "google_service_account_json",
                "google_search_console_site_url",
                "ga4_property_id",
                "crux_api_key",
                "crux_origin",
            )
        }),
        ("Google 同步状态", {
            "classes": ("collapse",),
            "fields": (
                "google_last_sync_at",
                "google_last_sync_status",
                "google_last_sync_message",
            )
        }),
        ("阿里云账号", {
            "fields": (
                "aliyun_access_key_id",
                "aliyun_access_key_secret",
            )
        }),
        ("阿里云高级配置", {
            "classes": ("collapse",),
            "fields": (
                "aliyun_region",
                "aliyun_dns_region",
                "aliyun_dns_domains",
                "aliyun_cms_namespace",
                "aliyun_cms_metrics",
            )
        }),
        ("阿里云同步状态", {
            "classes": ("collapse",),
            "fields": (
                "aliyun_last_sync_at",
                "aliyun_last_sync_status",
                "aliyun_last_sync_message",
            )
        }),
    )

    def formfield_for_dbfield(self, db_field, **kwargs):
        if db_field.name == "aliyun_access_key_secret":
            kwargs["widget"] = forms.PasswordInput(render_value=True)
        return super().formfield_for_dbfield(db_field, **kwargs)

    autocomplete_fields = (
        "homepage_featured_article_primary",
        "homepage_featured_article_secondary",
        "homepage_featured_article_tertiary",
        "homepage_solution_article_1",
        "homepage_solution_article_2",
        "homepage_solution_article_3",
        "homepage_solution_article_4",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        obj, _ = self.model.objects.get_or_create(id=1)
        url = reverse("admin:sys_settings_sitesetting_change", args=[obj.id])
        return HttpResponseRedirect(url)
