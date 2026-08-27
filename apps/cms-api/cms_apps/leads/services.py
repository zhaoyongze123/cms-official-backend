from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import Iterable

from django.core.mail import get_connection, send_mail
from django.db import transaction
from django.utils import timezone

from .models import ContactLead, LeadEmailConfiguration, LeadEmailDelivery, LeadNotificationRule


def queue_immediate_notifications(lead: ContactLead) -> None:
    """为新线索生成即时通知记录，实际发送由独立任务处理。"""
    rules = LeadNotificationRule.objects.filter(
        is_active=True,
        schedule=LeadNotificationRule.Schedule.IMMEDIATE,
    )
    for rule in rules:
        LeadEmailDelivery.objects.get_or_create(
            rule=rule,
            lead=lead,
            kind=LeadEmailDelivery.Kind.IMMEDIATE,
            defaults={"recipient_email": rule.recipient_email, "payload": {"lead_id": lead.pk}},
        )


def queue_due_daily_summaries(now: datetime | None = None) -> int:
    now = now or timezone.now()
    local_now = timezone.localtime(now)
    created = 0
    rules = LeadNotificationRule.objects.filter(
        is_active=True,
        schedule=LeadNotificationRule.Schedule.DAILY,
    )
    for rule in rules:
        scheduled_at = timezone.make_aware(datetime.combine(local_now.date(), rule.daily_send_at))
        if local_now < scheduled_at or rule.last_scheduled_for == local_now.date():
            continue

        since = scheduled_at - timedelta(days=1)
        if rule.last_scheduled_for:
            since = timezone.make_aware(datetime.combine(rule.last_scheduled_for, time.min))
        lead_ids = list(
            ContactLead.objects.filter(created_at__gte=since, created_at__lt=scheduled_at).values_list("id", flat=True)
        )
        LeadEmailDelivery.objects.get_or_create(
            rule=rule,
            lead=None,
            kind=LeadEmailDelivery.Kind.DAILY_SUMMARY,
            scheduled_for=scheduled_at,
            defaults={
                "recipient_email": rule.recipient_email,
                "payload": {"lead_ids": lead_ids, "summary_date": local_now.date().isoformat()},
            },
        )
        rule.last_scheduled_for = local_now.date()
        rule.save(update_fields=["last_scheduled_for", "updated_at"])
        created += 1
    return created


def _lead_lines(leads: Iterable[ContactLead]) -> list[str]:
    return [
        (
            f"公司：{lead.company_name}\n联系人：{lead.contact_name}\n手机：{lead.phone}\n"
            f"邮箱：{lead.email or '未填写'}\n意向产品：{lead.product_name or '未选择'}\n"
            f"需求：{lead.requirement or '未填写'}\n"
            f"提交时间：{timezone.localtime(lead.created_at):%Y-%m-%d %H:%M}"
        )
        for lead in leads
    ]


def _render_delivery(delivery: LeadEmailDelivery) -> tuple[str, str]:
    if delivery.kind == LeadEmailDelivery.Kind.IMMEDIATE:
        assert delivery.lead_id is not None
        return "云璨官网收到新的咨询线索", "\n\n".join(_lead_lines([delivery.lead]))

    lead_ids = delivery.payload.get("lead_ids", [])
    leads = list(ContactLead.objects.filter(id__in=lead_ids).order_by("created_at"))
    subject = f"云璨官网咨询线索日报（{delivery.payload.get('summary_date', '')}）"
    return subject, "\n\n".join(_lead_lines(leads)) or "本时段没有新增咨询线索。"


def _connection_for_configuration(configuration: LeadEmailConfiguration) -> tuple[object, str]:
    """从指定的后台 SMTP 配置创建邮件连接。"""
    return (
        get_connection(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host=configuration.host,
            port=configuration.port,
            username=configuration.username,
            password=configuration.get_password(),
            use_tls=configuration.use_tls,
            use_ssl=configuration.use_ssl,
            timeout=configuration.timeout,
        ),
        configuration.from_email,
    )


def _email_connection_and_sender() -> tuple[object, str | None]:
    """优先从后台配置创建 SMTP 连接，未配置时兼容环境变量方案。"""
    configuration = LeadEmailConfiguration.objects.filter(is_active=True).first()
    if configuration is None:
        return get_connection(), None
    return _connection_for_configuration(configuration)


def send_test_email(configuration: LeadEmailConfiguration) -> None:
    """使用当前配置向后台设置的测试收件人发送验证邮件。"""
    if not configuration.is_active:
        raise ValueError("请先启用此邮件发送配置。")
    if not configuration.test_recipient_email:
        raise ValueError("请先填写测试收件邮箱。")
    connection, sender = _connection_for_configuration(configuration)
    send_mail(
        "云璨官网邮件发送测试",
        "这是一封来自云璨官网后台的测试邮件。收到此邮件表示 SMTP 配置可用。",
        sender,
        [configuration.test_recipient_email],
        connection=connection,
        fail_silently=False,
    )


def process_pending_deliveries(now: datetime | None = None, limit: int = 50) -> int:
    """发送待处理邮件。失败记录会保留，供下一轮重试与后台排查。"""
    now = now or timezone.now()
    queue_due_daily_summaries(now)
    delivery_ids = list(
        LeadEmailDelivery.objects.filter(
            status__in=[LeadEmailDelivery.Status.PENDING, LeadEmailDelivery.Status.FAILED],
            scheduled_for__lte=now,
        ).values_list("id", flat=True)[:limit]
    )
    sent = 0
    for delivery_id in delivery_ids:
        with transaction.atomic():
            delivery = (
                LeadEmailDelivery.objects.select_for_update(of=("self",))
                .select_related("lead")
                .filter(pk=delivery_id)
                .first()
            )
            if delivery is None or delivery.status == LeadEmailDelivery.Status.SENT:
                continue
            delivery.status = LeadEmailDelivery.Status.SENDING
            delivery.attempts += 1
            delivery.save(update_fields=["status", "attempts", "updated_at"])
        try:
            subject, body = _render_delivery(delivery)
            connection, sender = _email_connection_and_sender()
            send_mail(subject, body, sender, [delivery.recipient_email], connection=connection, fail_silently=False)
        except Exception as exc:  # pragma: no cover - 真实邮件服务故障仅在集成环境发生
            LeadEmailDelivery.objects.filter(pk=delivery_id).update(
                status=LeadEmailDelivery.Status.FAILED,
                last_error=str(exc)[:2000],
                updated_at=timezone.now(),
            )
            continue
        LeadEmailDelivery.objects.filter(pk=delivery_id).update(
            status=LeadEmailDelivery.Status.SENT,
            sent_at=timezone.now(),
            last_error="",
            updated_at=timezone.now(),
        )
        sent += 1
    return sent
