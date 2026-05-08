from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sys_settings", "0002_alter_sitesetting_options_sitesetting_favicon_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="aliyun_access_key_id",
            field=models.CharField(blank=True, default="", max_length=128, verbose_name="\u963f\u91cc\u4e91 AccessKey ID"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="aliyun_access_key_secret",
            field=models.CharField(blank=True, default="", max_length=128, verbose_name="\u963f\u91cc\u4e91 AccessKey Secret"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="aliyun_region",
            field=models.CharField(blank=True, default="cn-hangzhou", max_length=32, verbose_name="\u963f\u91cc\u4e91 Region"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="aliyun_dns_region",
            field=models.CharField(blank=True, default="cn-hangzhou", max_length=32, verbose_name="\u963f\u91cc\u4e91 DNS Region"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="aliyun_dns_domains",
            field=models.CharField(blank=True, default="", max_length=500, verbose_name="\u963f\u91cc\u4e91 DNS \u57df\u540d(\u9017\u53f7\u5206\u9694)"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="aliyun_cms_namespace",
            field=models.CharField(blank=True, default="acs_ecs_dashboard", max_length=64, verbose_name="\u963f\u91cc\u4e91 CMS \u547d\u540d\u7a7a\u95f4"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="aliyun_cms_metrics",
            field=models.CharField(blank=True, default="CPUUtilization,MemoryUtilization,InternetIn,InternetOut", max_length=500, verbose_name="\u963f\u91cc\u4e91 CMS \u6307\u6807(\u9017\u53f7\u5206\u9694)"),
        ),
    ]
