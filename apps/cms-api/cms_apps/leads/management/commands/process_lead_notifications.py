from django.core.management.base import BaseCommand

from cms_apps.leads.services import process_pending_deliveries


class Command(BaseCommand):
    help = "发送待处理的官网咨询线索邮件通知。"

    def handle(self, *args, **options):
        count = process_pending_deliveries()
        self.stdout.write(self.style.SUCCESS(f"已发送 {count} 封线索通知邮件。"))
