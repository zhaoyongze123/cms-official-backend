from django.db import models


class EcsInstanceSnapshot(models.Model):
    instance_id = models.CharField("实例 ID", max_length=64, unique=True)
    instance_name = models.CharField("实例名称", max_length=128, blank=True)
    status = models.CharField("状态", max_length=32, blank=True)
    instance_type = models.CharField("规格", max_length=64, blank=True)
    cpu = models.PositiveIntegerField("CPU", null=True, blank=True)
    memory = models.PositiveIntegerField("内存(MB)", null=True, blank=True)
    public_ip = models.CharField("公网 IP", max_length=128, blank=True)
    private_ip = models.CharField("私网 IP", max_length=128, blank=True)
    region_id = models.CharField("区域", max_length=32, blank=True)
    zone_id = models.CharField("可用区", max_length=32, blank=True)
    os_name = models.CharField("系统", max_length=128, blank=True)
    expired_time = models.DateTimeField("到期时间", null=True, blank=True)
    captured_at = models.DateTimeField("采集时间", auto_now=True)

    class Meta:
        verbose_name = "ECS 实例"
        verbose_name_plural = "ECS 实例"
        ordering = ["expired_time", "instance_name"]

    def __str__(self):
        return self.instance_name or self.instance_id


class DnsDomainStat(models.Model):
    domain_name = models.CharField("域名", max_length=128)
    timestamp = models.DateTimeField("统计时间")
    request_count = models.PositiveIntegerField("请求量", default=0)
    captured_at = models.DateTimeField("采集时间", auto_now_add=True)

    class Meta:
        verbose_name = "DNS 域名"
        verbose_name_plural = "DNS 域名"
        ordering = ["-timestamp"]
        unique_together = ("domain_name", "timestamp")

    def __str__(self):
        return f"{self.domain_name} @ {self.timestamp}"


class EcsMetricPoint(models.Model):
    instance_id = models.CharField("实例 ID", max_length=64)
    metric_name = models.CharField("指标", max_length=64)
    timestamp = models.DateTimeField("时间点")
    value = models.FloatField("值", null=True, blank=True)
    period = models.PositiveIntegerField("周期", default=60)
    namespace = models.CharField("命名空间", max_length=64, default="acs_ecs_dashboard")
    region_id = models.CharField("区域", max_length=32, blank=True)
    captured_at = models.DateTimeField("采集时间", auto_now_add=True)

    class Meta:
        verbose_name = "ECS 指标"
        verbose_name_plural = "ECS 指标"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["instance_id", "metric_name", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.instance_id} {self.metric_name} @ {self.timestamp}"