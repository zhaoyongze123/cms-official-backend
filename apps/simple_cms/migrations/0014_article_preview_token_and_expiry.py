from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("simple_cms", "0013_frontendcontentsetting"),
    ]

    operations = [
        migrations.AddField(
            model_name="article",
            name="preview_expires_at",
            field=models.DateTimeField(blank=True, editable=False, null=True, verbose_name="草稿预览到期时间"),
        ),
        migrations.AddField(
            model_name="article",
            name="preview_token",
            field=models.CharField(blank=True, editable=False, max_length=64, null=True, unique=True, verbose_name="草稿预览令牌"),
        ),
    ]
