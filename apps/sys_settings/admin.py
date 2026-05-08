from django import forms
from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import SiteSetting


class SiteSettingForm(forms.ModelForm):
    class Meta:
        model = SiteSetting
        fields = "__all__"

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


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    form = SiteSettingForm
    list_display = ("site_title", "storage_path", "allow_video", "max_upload_size")
    readonly_fields = ("aliyun_last_sync_at", "aliyun_last_sync_status", "aliyun_last_sync_message")

    fieldsets = (
        (None, {
            "fields": (
                "site_title", "site_logo", "favicon",
                "seo_keywords", "seo_description",
                "storage_path", "allow_video", "max_upload_size",
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

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        obj, _ = self.model.objects.get_or_create(id=1)
        url = reverse("admin:sys_settings_sitesetting_change", args=[obj.id])
        return HttpResponseRedirect(url)
