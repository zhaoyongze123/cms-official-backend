from django.contrib import admin
from django.contrib.admin.models import ADDITION, CHANGE, DELETION
from django.contrib.auth.admin import GroupAdmin, UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group

from .models import AuditLog, ProxyGroup, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "phone", "is_staff", "is_active")
    list_filter = ("is_staff", "is_active", "groups")
    search_fields = ("username", "email", "phone")

    fieldsets = BaseUserAdmin.fieldsets + (("扩展信息", {"fields": ("phone", "avatar")}),)
    add_fieldsets = BaseUserAdmin.add_fieldsets + (("扩展信息", {"fields": ("phone", "avatar")}),)


if admin.site.is_registered(Group):
    admin.site.unregister(Group)


@admin.register(ProxyGroup)
class ProxyGroupAdmin(GroupAdmin):
    search_fields = ("name",)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "action_time",
        "user",
        "action_type",
        "content_type",
        "object_repr",
        "change_message",
    )
    list_filter = ("action_time", "user", "action_flag", "content_type")
    search_fields = ("object_repr", "change_message", "user__username")
    date_hierarchy = "action_time"

    @admin.display(description="动作类型", ordering="action_flag")
    def action_type(self, obj):
        mapping = {
            ADDITION: "新增",
            CHANGE: "修改",
            DELETION: "删除",
        }
        return mapping.get(obj.action_flag, str(obj.action_flag))

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
