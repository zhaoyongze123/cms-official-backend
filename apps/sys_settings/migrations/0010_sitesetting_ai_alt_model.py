from django.db import migrations, models


def copy_ai_generate_model_to_alt_model(apps, schema_editor):
    SiteSetting = apps.get_model("sys_settings", "SiteSetting")
    for setting in SiteSetting.objects.all():
        if not getattr(setting, "ai_alt_model", ""):
            setting.ai_alt_model = setting.ai_generate_model
            setting.save(update_fields=["ai_alt_model"])


class Migration(migrations.Migration):

    dependencies = [
        ("sys_settings", "0009_sitesetting_siliconflow_api_key"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="ai_alt_model",
            field=models.CharField(
                default="Qwen/Qwen2.5-72B-Instruct",
                max_length=200,
                verbose_name="AI 图片 Alt 生成模型",
            ),
        ),
        migrations.RunPython(
            code=copy_ai_generate_model_to_alt_model,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
