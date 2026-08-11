from __future__ import annotations

import re
from datetime import time

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from .crypto import decrypt_secret, encrypt_secret


MOBILE_PHONE_PATTERN = r"^1[3-9]\d{9}$"
mobile_phone_validator = RegexValidator(
    regex=MOBILE_PHONE_PATTERN,
    message="请填写正确的 11 位中国大陆手机号。",
)


class ContactLead(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "待跟进"
        CONTACTED = "contacted", "已联系"
        QUALIFIED = "qualified", "有效线索"
        CLOSED = "closed", "已关闭"

    company_name = models.CharField("公司名称", max_length=60)
    contact_name = models.CharField("联系人姓名", max_length=20)
    phone = models.CharField("手机号码", max_length=11, validators=[mobile_phone_validator])
    email = models.EmailField("邮箱地址", max_length=254, blank=True)
    requirement = models.TextField("咨询需求", max_length=1000, blank=True)
    source = models.CharField("线索来源", max_length=80, default="homepage_ai_drive_demo")
    referrer = models.CharField("来源页面", max_length=500, blank=True)
    status = models.CharField("跟进状态", max_length=20, choices=Status.choices, default=Status.NEW)
    follow_up_note = models.TextField("跟进备注", blank=True)
    consent_at = models.DateTimeField("隐私授权时间")
    created_at = models.DateTimeField("提交时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "咨询线索"
        verbose_name_plural = "咨询线索"

    def clean(self) -> None:
        super().clean()
        self.company_name = self.company_name.strip()
        self.contact_name = self.contact_name.strip()
        self.phone = re.sub(r"\s+", "", self.phone)
        self.email = self.email.strip().lower()
        self.requirement = self.requirement.strip()
        self.referrer = self.referrer.strip()
        errors: dict[str, str] = {}
        if not self.company_name:
            errors["company_name"] = "请填写公司名称。"
        if not self.contact_name:
            errors["contact_name"] = "请填写联系人姓名。"
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return f"{self.company_name} - {self.contact_name}"


class LeadNotificationRule(models.Model):
    class Schedule(models.TextChoices):
        IMMEDIATE = "immediate", "即时通知"
        DAILY = "daily", "每日汇总"

    name = models.CharField("规则名称", max_length=80)
    recipient_email = models.EmailField("收件邮箱")
    schedule = models.CharField("发送方式", max_length=20, choices=Schedule.choices, default=Schedule.IMMEDIATE)
    daily_send_at = models.TimeField("每日发送时间", default=time(9, 0), blank=True)
    is_active = models.BooleanField("启用", default=True)
    last_scheduled_for = models.DateField("最近汇总日期", null=True, blank=True, editable=False)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        ordering = ["name", "id"]
        verbose_name = "线索邮件通知规则"
        verbose_name_plural = "线索邮件通知规则"

    def __str__(self) -> str:
        return f"{self.name} ({self.recipient_email})"


class LeadEmailConfiguration(models.Model):
    """官网线索邮件的唯一 SMTP 配置。"""

    host = models.CharField("SMTP 服务器", max_length=255)
    port = models.PositiveIntegerField("SMTP 端口", default=587)
    username = models.CharField("发信账号", max_length=254)
    password_encrypted = models.TextField("加密后的授权密码", blank=True, editable=False)
    from_email = models.EmailField("发件人邮箱", max_length=254)
    use_tls = models.BooleanField("使用 TLS", default=True)
    use_ssl = models.BooleanField("使用 SSL", default=False)
    timeout = models.PositiveSmallIntegerField("连接超时（秒）", default=20)
    test_recipient_email = models.EmailField("测试收件邮箱", max_length=254, blank=True)
    is_active = models.BooleanField("启用此发信配置", default=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "邮件发送配置"
        verbose_name_plural = "邮件发送配置"

    def save(self, *args, **kwargs) -> None:
        if self._state.adding:
            self.pk = 1
        super().save(*args, **kwargs)

    def clean(self) -> None:
        super().clean()
        if self.use_tls and self.use_ssl:
            raise ValidationError("TLS 和 SSL 不能同时启用。")

    def set_password(self, password: str) -> None:
        self.password_encrypted = encrypt_secret(password)

    def get_password(self) -> str:
        return decrypt_secret(self.password_encrypted)

    def __str__(self) -> str:
        return self.from_email or "未配置"


class LeadEmailDelivery(models.Model):
    class Kind(models.TextChoices):
        IMMEDIATE = "immediate", "即时通知"
        DAILY_SUMMARY = "daily_summary", "每日汇总"

    class Status(models.TextChoices):
        PENDING = "pending", "待发送"
        SENDING = "sending", "发送中"
        SENT = "sent", "已发送"
        FAILED = "failed", "发送失败"

    rule = models.ForeignKey(LeadNotificationRule, verbose_name="通知规则", on_delete=models.CASCADE, related_name="deliveries")
    lead = models.ForeignKey(ContactLead, verbose_name="咨询线索", on_delete=models.CASCADE, related_name="email_deliveries", null=True, blank=True)
    kind = models.CharField("通知类型", max_length=20, choices=Kind.choices)
    recipient_email = models.EmailField("收件邮箱")
    scheduled_for = models.DateTimeField("计划发送时间", default=timezone.now)
    payload = models.JSONField("邮件内容快照", default=dict, blank=True)
    status = models.CharField("发送状态", max_length=20, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveSmallIntegerField("尝试次数", default=0)
    last_error = models.TextField("最近错误", blank=True)
    sent_at = models.DateTimeField("发送时间", null=True, blank=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        ordering = ["scheduled_for", "id"]
        constraints = [
            models.UniqueConstraint(fields=["rule", "lead", "kind"], name="cms_leads_unique_rule_lead_delivery")
        ]
        verbose_name = "线索邮件发送记录"
        verbose_name_plural = "线索邮件发送记录"

    def __str__(self) -> str:
        return f"{self.get_kind_display()} - {self.recipient_email} - {self.get_status_display()}"
