from django.db import models


class Tag(models.Model):
    name = models.CharField("标签名称", max_length=100, unique=True)
    slug = models.SlugField("标签缩略名", max_length=120, unique=True, allow_unicode=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)

    class Meta:
        app_label = "simple_cms"
        verbose_name = "文章标签"
        verbose_name_plural = "文章标签"
        ordering = ["name"]

    def __str__(self):
        return self.name
