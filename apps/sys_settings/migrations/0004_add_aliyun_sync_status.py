from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sys_settings", "0003_add_aliyun_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="aliyun_last_sync_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Aliyun last sync time"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="aliyun_last_sync_status",
            field=models.CharField(blank=True, default="", max_length=32, verbose_name="Aliyun last sync status"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="aliyun_last_sync_message",
            field=models.TextField(blank=True, default="", verbose_name="Aliyun last sync message"),
        ),
    ]
