from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sys_settings", "0010_sitesetting_ai_alt_model"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="crux_api_key",
            field=models.CharField(blank=True, default="", max_length=255, verbose_name="CrUX / PageSpeed API Key"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="crux_origin",
            field=models.CharField(blank=True, default="", help_text="例如 https://www.example.com，用于回退到 origin 级体验数据。", max_length=255, verbose_name="CrUX Origin"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="ga4_property_id",
            field=models.CharField(blank=True, default="", max_length=64, verbose_name="GA4 Property ID"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="google_last_sync_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Google 监控最近同步时间"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="google_last_sync_message",
            field=models.TextField(blank=True, default="", verbose_name="Google 监控最近同步信息"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="google_last_sync_status",
            field=models.CharField(blank=True, default="", max_length=32, verbose_name="Google 监控最近同步状态"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="google_search_console_site_url",
            field=models.CharField(blank=True, default="", help_text="支持 https://domain.com/ 或 sc-domain:example.com。", max_length=255, verbose_name="Google Search Console Site URL"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="google_service_account_json",
            field=models.TextField(blank=True, default="", help_text="填入完整的 Service Account JSON，用于访问 GSC 与 GA4 Data API。", verbose_name="Google Service Account JSON"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="site_public_base_url",
            field=models.URLField(blank=True, default="", help_text="用于拼接文章公开 URL，例如 https://www.example.com", verbose_name="站点公开 Base URL"),
        ),
    ]
