from django.contrib import admin

from .models import ContactLead, LeadEmailDelivery, LeadNotificationRule


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
    list_display = ("name", "recipient_email", "schedule", "daily_send_at", "is_active", "updated_at")
    list_filter = ("schedule", "is_active")
    search_fields = ("name", "recipient_email")


@admin.register(LeadEmailDelivery)
class LeadEmailDeliveryAdmin(admin.ModelAdmin):
    list_display = ("kind", "recipient_email", "status", "attempts", "scheduled_for", "sent_at")
    list_filter = ("kind", "status", "scheduled_for")
    search_fields = ("recipient_email", "lead__company_name", "lead__contact_name")
    readonly_fields = ("rule", "lead", "kind", "recipient_email", "scheduled_for", "payload", "status", "attempts", "last_error", "sent_at", "created_at", "updated_at")
