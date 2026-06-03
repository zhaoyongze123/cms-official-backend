from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("simple_cms", "0012_merge_0010_ai_review_models_0011_knowledge_source_knowledge_chunk"),
        ("sys_settings", "0013_sitesetting_homepage_featured_articles"),
    ]

    operations = [
        migrations.CreateModel(
            name="FrontendContentSetting",
            fields=[],
            options={
                "verbose_name": "前台内容",
                "verbose_name_plural": "前台内容",
                "proxy": True,
                "indexes": [],
                "constraints": [],
            },
            bases=("sys_settings.sitesetting",),
        ),
    ]
