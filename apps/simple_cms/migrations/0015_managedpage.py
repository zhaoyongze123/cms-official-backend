from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("simple_cms", "0014_article_preview_token_and_expiry")]

    operations = [
        migrations.CreateModel(
            name="ManagedPage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("path", models.CharField(max_length=255, unique=True, verbose_name="页面 URL")),
                ("title", models.CharField(max_length=255, verbose_name="页面标题")),
                ("template_key", models.CharField(choices=[("default", "标准页面"), ("rich-text", "富文本页面")], default="default", max_length=80, verbose_name="前端模板")),
                ("status", models.CharField(choices=[("draft", "草稿"), ("published", "已发布")], default="draft", max_length=20, verbose_name="状态")),
                ("content_json", models.JSONField(blank=True, default=dict, verbose_name="页面内容 JSON")),
                ("content_html", models.TextField(blank=True, verbose_name="页面内容 HTML")),
                ("meta_description", models.TextField(blank=True, verbose_name="SEO 描述")),
                ("canonical_url", models.URLField(blank=True, verbose_name="Canonical URL")),
                ("robots", models.CharField(default="index,follow", max_length=80, verbose_name="Robots")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["path"], "verbose_name": "页面内容", "verbose_name_plural": "页面内容"},
        ),
    ]
