from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("simple_cms", "0012_merge_0010_ai_review_models_0011_knowledge_source_knowledge_chunk"),
    ]

    operations = [
        migrations.CreateModel(
            name="AnalyticsSnapshot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("snapshot_date", models.DateField(verbose_name="快照日期")),
                ("source", models.CharField(default="manual", max_length=32, verbose_name="来源")),
                ("impressions", models.PositiveIntegerField(default=0, verbose_name="曝光量")),
                ("clicks", models.PositiveIntegerField(default=0, verbose_name="点击量")),
                ("average_position", models.DecimalField(decimal_places=2, default=0, max_digits=6, verbose_name="平均排名")),
                ("ctr", models.DecimalField(decimal_places=4, default=0, max_digits=6, verbose_name="点击率")),
                ("sessions", models.PositiveIntegerField(default=0, verbose_name="会话数")),
                ("users", models.PositiveIntegerField(default=0, verbose_name="用户数")),
                ("bounce_rate", models.DecimalField(decimal_places=4, default=0, max_digits=6, verbose_name="跳出率")),
                ("avg_engagement_seconds", models.PositiveIntegerField(default=0, verbose_name="平均参与秒数")),
                ("conversions", models.PositiveIntegerField(default=0, verbose_name="转化数")),
                ("notes", models.TextField(blank=True, verbose_name="备注")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="创建时间")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="更新时间")),
                (
                    "article",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="analytics_snapshots",
                        to="simple_cms.article",
                        verbose_name="文章",
                    ),
                ),
            ],
            options={
                "verbose_name": "分析快照",
                "verbose_name_plural": "分析快照",
                "ordering": ["-snapshot_date", "-id"],
            },
        ),
        migrations.AddIndex(
            model_name="analyticssnapshot",
            index=models.Index(fields=["snapshot_date"], name="analytics_date_idx"),
        ),
        migrations.AddIndex(
            model_name="analyticssnapshot",
            index=models.Index(fields=["article", "snapshot_date"], name="analytics_article_date_idx"),
        ),
        migrations.AddConstraint(
            model_name="analyticssnapshot",
            constraint=models.UniqueConstraint(
                fields=("article", "snapshot_date", "source"),
                name="uniq_analytics_snapshot_article_date_source",
            ),
        ),
    ]
