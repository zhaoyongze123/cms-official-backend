from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    # ... fields
    phone = models.CharField(max_length=20, blank=True, verbose_name="手机号")
    avatar = models.ImageField(upload_to="avatars/", blank=True, verbose_name="头像")

    class Meta:
        verbose_name = "用户"
        verbose_name_plural = "用户"

    def __str__(self):
        return self.get_full_name() or self.username

from django.contrib.auth.models import Group
from django.contrib.admin.models import LogEntry

class ProxyGroup(Group):
    class Meta:
        proxy = True
        verbose_name = '策略组'
        verbose_name_plural = '策略组'

class AuditLog(LogEntry):
    class Meta:
        proxy = True
        verbose_name = '操作审计日志'
        verbose_name_plural = '操作审计日志'
