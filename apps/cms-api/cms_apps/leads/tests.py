from datetime import datetime, time, timedelta
from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from .admin import LeadNotificationRuleAdminForm
from .models import ContactLead, LeadEmailConfiguration, LeadEmailDelivery, LeadNotificationRule
from .services import _email_connection_and_sender, process_pending_deliveries


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class ContactLeadApiTests(TestCase):
    def test_public_endpoint_validates_and_creates_lead(self):
        response = self.client.post(
            "/api/public/leads/",
            data={
                "company_name": "云璨测试企业",
                "contact_name": "张三",
                "phone": "13800138000",
                "email": "sales@example.com",
                "privacy_consent": True,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ContactLead.objects.count(), 1)

    def test_public_endpoint_rejects_invalid_phone_and_email(self):
        response = self.client.post(
            "/api/public/leads/",
            data={
                "company_name": "云璨测试企业",
                "contact_name": "张三",
                "phone": "123",
                "email": "not-an-email",
                "privacy_consent": True,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.json()["error"]["details"])
        self.assertIn("email", response.json()["error"]["details"])

    def test_immediate_notification_is_delivered_from_outbox(self):
        LeadNotificationRule.objects.create(
            name="销售即时通知",
            recipient_email="sales@example.com",
            schedule=LeadNotificationRule.Schedule.IMMEDIATE,
        )
        response = self.client.post(
            "/api/public/leads/",
            data={
                "company_name": "云璨测试企业",
                "contact_name": "张三",
                "phone": "13800138000",
                "privacy_consent": True,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(LeadEmailDelivery.objects.count(), 1)
        self.assertEqual(process_pending_deliveries(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(LeadEmailDelivery.objects.get().status, LeadEmailDelivery.Status.SENT)

    def test_daily_notification_is_delivered_at_configured_time(self):
        rule = LeadNotificationRule.objects.create(
            name="销售日报",
            recipient_email="sales@example.com",
            schedule=LeadNotificationRule.Schedule.DAILY,
            daily_send_at=time(9, 0),
        )
        scheduled_at = timezone.make_aware(datetime(2026, 8, 11, 9, 0))
        lead = ContactLead.objects.create(
            company_name="云璨测试企业",
            contact_name="张三",
            phone="13800138000",
            consent_at=scheduled_at,
        )
        ContactLead.objects.filter(pk=lead.pk).update(created_at=scheduled_at - timedelta(minutes=30))

        sent = process_pending_deliveries(now=scheduled_at + timedelta(minutes=5))

        self.assertEqual(sent, 1)
        self.assertEqual(len(mail.outbox), 1)
        delivery = LeadEmailDelivery.objects.get()
        self.assertEqual(delivery.kind, LeadEmailDelivery.Kind.DAILY_SUMMARY)
        self.assertEqual(delivery.status, LeadEmailDelivery.Status.SENT)
        rule.refresh_from_db()
        self.assertEqual(rule.last_scheduled_for, scheduled_at.date())

    def test_immediate_rule_does_not_require_daily_time(self):
        form = LeadNotificationRuleAdminForm(
            data={
                "name": "销售即时通知",
                "recipient_email": "sales@example.com",
                "schedule": LeadNotificationRule.Schedule.IMMEDIATE,
                "is_active": "on",
            }
        )

        self.assertTrue(form.is_valid(), form.errors)
        rule = form.save()
        self.assertEqual(rule.daily_send_at, time(9, 0))

    @patch("cms_apps.leads.services.get_connection")
    def test_admin_smtp_configuration_is_encrypted_and_used(self, get_connection):
        configuration = LeadEmailConfiguration(
            host="smtp.example.com",
            port=465,
            username="mailer@example.com",
            from_email="mailer@example.com",
            use_tls=False,
            use_ssl=True,
        )
        configuration.set_password("app-password")
        configuration.save()

        self.assertNotIn("app-password", configuration.password_encrypted)
        self.assertEqual(configuration.get_password(), "app-password")
        _email_connection_and_sender()
        get_connection.assert_called_once_with(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host="smtp.example.com",
            port=465,
            username="mailer@example.com",
            password="app-password",
            use_tls=False,
            use_ssl=True,
            timeout=20,
        )
