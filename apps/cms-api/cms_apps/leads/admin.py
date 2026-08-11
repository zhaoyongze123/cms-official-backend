from datetime import time

from django import forms
from django.contrib import admin, messages
from django.shortcuts import redirect

from .models import ContactLead, LeadEmailConfiguration, LeadEmailDelivery, LeadNotificationRule
from .services import send_test_email


class LeadNotificationRuleAdminForm(forms.ModelForm):
    daily_send_at = forms.TimeField(
        label="每日汇总发送时间",
        required=False,
        input_formats=["%H:%M"],
        widget=forms.TimeInput(
            format="%H:%M",
            attrs={"class": "vTextField", "inputmode": "numeric", "placeholder": "例如 09:00"},
        ),
        help_text="仅在“每日汇总”时使用，按 24 小时制填写。",
    )

    class Meta:
        model = LeadNotificationRule
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()
        if cleaned_data.get("schedule") == LeadNotificationRule.Schedule.DAILY and not cleaned_data.get("daily_send_at"):
            self.add_error("daily_send_at", "请填写每日汇总发送时间。")
        elif not cleaned_data.get("daily_send_at"):
            cleaned_data["daily_send_at"] = self.instance.daily_send_at or time(9, 0)
        return cleaned_data


class LeadEmailConfigurationAdminForm(forms.ModelForm):
    password = forms.CharField(
        label="SMTP 授权密码",
        required=False,
        widget=forms.PasswordInput(render_value=False, attrs={"autocomplete": "new-password"}),
        help_text="保存后不会显示。修改邮箱授权密码时重新填写即可。",
    )

    class Meta:
        model = LeadEmailConfiguration
        fields = (
            "host",
            "port",
            "username",
            "from_email",
            "use_tls",
            "use_ssl",
            "timeout",
            "test_recipient_email",
            "is_active",
        )

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password", "")
        if self.instance._state.adding and not password:
            self.add_error("password", "请填写 SMTP 授权密码。")
        if cleaned_data.get("use_tls") and cleaned_data.get("use_ssl"):
            self.add_error("use_ssl", "TLS 和 SSL 不能同时启用。")
        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        password = self.cleaned_data.get("password")
        if password:
            instance.set_password(password)
        if commit:
            instance.save()
        return instance


@admin.register(ContactLead)
class ContactLeadAdmin(admin.ModelAdmin):
    list_display = ("company_name", "contact_name", "phone", "email", "status", "created_at")
    list_filter = ("status", "source", "created_at")
    search_fields = ("company_name", "contact_name", "phone", "email")
    readonly_fields = ("source", "referrer", "consent_at", "created_at", "updated_at")
    fieldsets = (
        ("联系信息", {"fields": ("company_name", "contact_name", "phone", "email", "requirement")} ),
        ("跟进", {"fields": ("status", "follow_up_note")} ),
        ("提交信息", {"fields": ("source", "referrer", "consent_at", "created_at", "updated_at")} ),
    )


@admin.register(LeadNotificationRule)
class LeadNotificationRuleAdmin(admin.ModelAdmin):
    form = LeadNotificationRuleAdminForm
    list_display = ("name", "recipient_email", "schedule", "daily_send_at", "is_active", "updated_at")
    list_filter = ("schedule", "is_active")
    search_fields = ("name", "recipient_email")

    class Media:
        js = ("cms_leads/lead_notification_rule_form.js",)


@admin.register(LeadEmailConfiguration)
class LeadEmailConfigurationAdmin(admin.ModelAdmin):
    form = LeadEmailConfigurationAdminForm
    list_display = ("from_email", "host", "port", "is_active", "updated_at")
    readonly_fields = ("updated_at",)
    fieldsets = (
        ("SMTP 服务器", {"fields": ("host", "port", "username", "password", "from_email")} ),
        ("安全与连接", {"fields": ("use_tls", "use_ssl", "timeout", "is_active")} ),
        ("测试", {"fields": ("test_recipient_email",)}),
        ("记录", {"fields": ("updated_at",)}),
    )
    actions = ("send_test_message",)

    @admin.action(description="向测试收件邮箱发送测试邮件")
    def send_test_message(self, request, queryset):
        configuration = queryset.first()
        if configuration is None:
            self.message_user(request, "请选择邮件发送配置。", level=messages.ERROR)
            return
        try:
            send_test_email(configuration)
        except Exception as exc:
            self.message_user(request, f"测试邮件发送失败：{exc}", level=messages.ERROR)
            return
        self.message_user(request, "测试邮件已提交发送。", level=messages.SUCCESS)

    def has_add_permission(self, request):
        return not LeadEmailConfiguration.objects.exists()

    def response_add(self, request, obj, post_url_continue=None):
        return redirect("admin:cms_leads_leademailconfiguration_changelist")


@admin.register(LeadEmailDelivery)
class LeadEmailDeliveryAdmin(admin.ModelAdmin):
    list_display = ("kind", "recipient_email", "status", "attempts", "scheduled_for", "sent_at")
    list_filter = ("kind", "status", "scheduled_for")
    search_fields = ("recipient_email", "lead__company_name", "lead__contact_name")
    readonly_fields = ("rule", "lead", "kind", "recipient_email", "scheduled_for", "payload", "status", "attempts", "last_error", "sent_at", "created_at", "updated_at")
