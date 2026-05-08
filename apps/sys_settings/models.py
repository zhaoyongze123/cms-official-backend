from django.db import models


class SiteSetting(models.Model):
    storage_path = models.CharField("默认文件存储路径", max_length=200, default="/media/uploads/")
    allow_video = models.BooleanField("允许上传视频/音频", default=True)
    max_upload_size = models.IntegerField("单文件最大上传限制（MB）", default=100)

    site_title = models.CharField("网站标题", max_length=255, default="企业内容管理系统")
    site_logo = models.ImageField("网站 Logo", upload_to="settings/branding/", blank=True, null=True)
    favicon = models.ImageField("网站图标", upload_to="settings/branding/", blank=True, null=True)

    seo_keywords = models.CharField("默认 Meta Keywords", max_length=500, blank=True)
    seo_description = models.TextField("默认 Meta Description", blank=True)

    aliyun_access_key_id = models.CharField("阿里云 AccessKey ID", max_length=128, blank=True, default="")
    aliyun_access_key_secret = models.CharField("阿里云 AccessKey Secret", max_length=128, blank=True, default="")
    aliyun_region = models.CharField("阿里云 Region", max_length=32, blank=True, default="cn-hangzhou")
    aliyun_dns_region = models.CharField("阿里云 DNS Region", max_length=32, blank=True, default="cn-hangzhou")
    aliyun_dns_domains = models.CharField("阿里云 DNS 域名（逗号分隔）", max_length=500, blank=True, default="")
    aliyun_cms_namespace = models.CharField("阿里云 CMS Namespace", max_length=64, blank=True, default="acs_ecs_dashboard")
    aliyun_cms_metrics = models.CharField(
        "阿里云 CMS 指标（逗号分隔）",
        max_length=500,
        blank=True,
        default="CPUUtilization,InternetIn,InternetOut",
    )

    aliyun_last_sync_at = models.DateTimeField("阿里云最近同步时间", blank=True, null=True)
    aliyun_last_sync_status = models.CharField("阿里云最近同步状态", max_length=32, blank=True, default="")
    aliyun_last_sync_message = models.TextField("阿里云最近同步信息", blank=True, default="")

    class Meta:
        verbose_name = "全局运转设置"
        verbose_name_plural = "全局运转设置"

    def __str__(self):
        return "全局运转设置"
