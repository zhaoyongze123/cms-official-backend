from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cms_analytics", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="GoogleSearchConsoleSnapshot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("snapshot_date", models.DateField(verbose_name="快照日期")),
                ("page_url", models.URLField(verbose_name="页面 URL")),
                ("clicks", models.PositiveIntegerField(default=0, verbose_name="点击量")),
                ("impressions", models.PositiveIntegerField(default=0, verbose_name="曝光量")),
                ("ctr", models.DecimalField(decimal_places=4, default=0, max_digits=8, verbose_name="点击率")),
                ("average_position", models.DecimalField(decimal_places=2, default=0, max_digits=8, verbose_name="平均排名")),
                ("source", models.CharField(default="google_search_console", max_length=64, verbose_name="来源")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="创建时间")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="更新时间")),
                ("article", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="gsc_snapshots", to="simple_cms.article", verbose_name="文章")),
            ],
            options={
                "verbose_name": "GSC 页面快照",
                "verbose_name_plural": "GSC 页面快照",
                "ordering": ["-snapshot_date", "-id"],
            },
        ),
        migrations.CreateModel(
            name="Ga4PageSnapshot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("snapshot_date", models.DateField(verbose_name="快照日期")),
                ("page_path", models.CharField(max_length=255, verbose_name="页面路径")),
                ("sessions", models.PositiveIntegerField(default=0, verbose_name="会话数")),
                ("users", models.PositiveIntegerField(default=0, verbose_name="用户数")),
                ("bounce_rate", models.DecimalField(decimal_places=4, default=0, max_digits=8, verbose_name="跳出率")),
                ("avg_engagement_seconds", models.PositiveIntegerField(default=0, verbose_name="平均参与秒数")),
                ("conversions", models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name="转化数")),
                ("source", models.CharField(default="ga4_data_api", max_length=64, verbose_name="来源")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="创建时间")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="更新时间")),
                ("article", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="ga4_snapshots", to="simple_cms.article", verbose_name="文章")),
            ],
            options={
                "verbose_name": "GA4 页面快照",
                "verbose_name_plural": "GA4 页面快照",
                "ordering": ["-snapshot_date", "-id"],
            },
        ),
        migrations.CreateModel(
            name="CruxPageSnapshot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("snapshot_date", models.DateField(verbose_name="快照日期")),
                ("page_url", models.URLField(verbose_name="页面 URL")),
                ("form_factor", models.CharField(default="ALL", max_length=32, verbose_name="设备形态")),
                ("record_scope", models.CharField(default="url", max_length=16, verbose_name="记录粒度")),
                ("lcp_ms", models.PositiveIntegerField(blank=True, null=True, verbose_name="LCP 毫秒")),
                ("inp_ms", models.PositiveIntegerField(blank=True, null=True, verbose_name="INP 毫秒")),
                ("cls_score", models.DecimalField(blank=True, decimal_places=4, max_digits=8, null=True, verbose_name="CLS 分数")),
                ("source", models.CharField(default="chrome_ux_report", max_length=64, verbose_name="来源")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="创建时间")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="更新时间")),
                ("article", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="crux_snapshots", to="simple_cms.article", verbose_name="文章")),
            ],
            options={
                "verbose_name": "CrUX 页面快照",
                "verbose_name_plural": "CrUX 页面快照",
                "ordering": ["-snapshot_date", "-id"],
            },
        ),
        migrations.AddConstraint(
            model_name="googlesearchconsolesnapshot",
            constraint=models.UniqueConstraint(fields=("article", "snapshot_date"), name="uniq_gsc_snapshot_article_date"),
        ),
        migrations.AddConstraint(
            model_name="ga4pagesnapshot",
            constraint=models.UniqueConstraint(fields=("article", "snapshot_date"), name="uniq_ga4_snapshot_article_date"),
        ),
        migrations.AddConstraint(
            model_name="cruxpagesnapshot",
            constraint=models.UniqueConstraint(fields=("article", "snapshot_date"), name="uniq_crux_snapshot_article_date"),
        ),
    ]
