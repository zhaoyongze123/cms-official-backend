from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("simple_cms", "0012_merge_0010_ai_review_models_0011_knowledge_source_knowledge_chunk"),
        ("sys_settings", "0012_sitesetting_third_party_scripts"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="homepage_featured_article_primary",
            field=models.ForeignKey(
                blank=True,
                help_text="用于首页第一张轮播卡片，前台会读取文章标题、摘要和 OG 图片。",
                limit_choices_to={"status": "published"},
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="+",
                to="simple_cms.article",
                verbose_name="首页卡片一文章",
            ),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="homepage_featured_article_secondary",
            field=models.ForeignKey(
                blank=True,
                help_text="用于首页第二张轮播卡片，前台会读取文章标题、摘要和 OG 图片。",
                limit_choices_to={"status": "published"},
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="+",
                to="simple_cms.article",
                verbose_name="首页卡片二文章",
            ),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="homepage_featured_article_tertiary",
            field=models.ForeignKey(
                blank=True,
                help_text="用于首页第三张轮播卡片，前台会读取文章标题、摘要和 OG 图片。",
                limit_choices_to={"status": "published"},
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="+",
                to="simple_cms.article",
                verbose_name="首页卡片三文章",
            ),
        ),
    ]
