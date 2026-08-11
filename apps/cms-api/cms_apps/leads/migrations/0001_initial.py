from datetime import time

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="ContactLead",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("company_name", models.CharField(max_length=60, verbose_name="公司名称")),
                ("contact_name", models.CharField(max_length=20, verbose_name="联系人姓名")),
                ("phone", models.CharField(max_length=11, validators=[django.core.validators.RegexValidator(message="请填写正确的 11 位中国大陆手机号。", regex="^1[3-9]\\d{9}$")], verbose_name="手机号码")),
                ("email", models.EmailField(blank=True, max_length=254, verbose_name="邮箱地址")),
                ("requirement", models.TextField(blank=True, max_length=1000, verbose_name="咨询需求")),
                ("source", models.CharField(default="homepage_ai_drive_demo", max_length=80, verbose_name="线索来源")),
                ("referrer", models.CharField(blank=True, max_length=500, verbose_name="来源页面")),
                ("status", models.CharField(choices=[("new", "待跟进"), ("contacted", "已联系"), ("qualified", "有效线索"), ("closed", "已关闭")], default="new", max_length=20, verbose_name="跟进状态")),
                ("follow_up_note", models.TextField(blank=True, verbose_name="跟进备注")),
                ("consent_at", models.DateTimeField(verbose_name="隐私授权时间")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="提交时间")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="更新时间")),
            ],
            options={"verbose_name": "咨询线索", "verbose_name_plural": "咨询线索", "ordering": ["-created_at", "-id"]},
        ),
        migrations.CreateModel(
            name="LeadNotificationRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=80, verbose_name="规则名称")),
                ("recipient_email", models.EmailField(max_length=254, verbose_name="收件邮箱")),
                ("schedule", models.CharField(choices=[("immediate", "即时通知"), ("daily", "每日汇总")], default="immediate", max_length=20, verbose_name="发送方式")),
                ("daily_send_at", models.TimeField(blank=True, default=time(9, 0), verbose_name="每日发送时间")),
                ("is_active", models.BooleanField(default=True, verbose_name="启用")),
                ("last_scheduled_for", models.DateField(blank=True, editable=False, null=True, verbose_name="最近汇总日期")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="创建时间")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="更新时间")),
            ],
            options={"verbose_name": "线索邮件通知规则", "verbose_name_plural": "线索邮件通知规则", "ordering": ["name", "id"]},
        ),
        migrations.CreateModel(
            name="LeadEmailDelivery",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(choices=[("immediate", "即时通知"), ("daily_summary", "每日汇总")], max_length=20, verbose_name="通知类型")),
                ("recipient_email", models.EmailField(max_length=254, verbose_name="收件邮箱")),
                ("scheduled_for", models.DateTimeField(default=timezone.now, verbose_name="计划发送时间")),
                ("payload", models.JSONField(blank=True, default=dict, verbose_name="邮件内容快照")),
                ("status", models.CharField(choices=[("pending", "待发送"), ("sending", "发送中"), ("sent", "已发送"), ("failed", "发送失败")], default="pending", max_length=20, verbose_name="发送状态")),
                ("attempts", models.PositiveSmallIntegerField(default=0, verbose_name="尝试次数")),
                ("last_error", models.TextField(blank=True, verbose_name="最近错误")),
                ("sent_at", models.DateTimeField(blank=True, null=True, verbose_name="发送时间")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="创建时间")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="更新时间")),
                ("lead", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="email_deliveries", to="cms_leads.contactlead", verbose_name="咨询线索")),
                ("rule", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="deliveries", to="cms_leads.leadnotificationrule", verbose_name="通知规则")),
            ],
            options={"verbose_name": "线索邮件发送记录", "verbose_name_plural": "线索邮件发送记录", "ordering": ["scheduled_for", "id"]},
        ),
        migrations.AddConstraint(
            model_name="leademaildelivery",
            constraint=models.UniqueConstraint(fields=("rule", "lead", "kind"), name="cms_leads_unique_rule_lead_delivery"),
        ),
    ]
