from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sys_settings", "0008_add_ai_review_and_extended_prompts"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="siliconflow_api_key",
            field=models.CharField(blank=True, default="", max_length=255, verbose_name="硅基流动 API Key"),
        ),
    ]
