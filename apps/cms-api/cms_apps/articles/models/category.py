from django.db import models


class Category(models.Model):
    name = models.CharField("分类名称", max_length=100)
    slug = models.SlugField("URL缩略名", unique=True)
    seo_title = models.CharField("SEO 标题", max_length=255, blank=True)
    seo_keywords = models.CharField("SEO 关键词", max_length=255, blank=True)
    seo_description = models.TextField("SEO 描述", blank=True)
    sort_order = models.PositiveIntegerField("排序权重", default=0)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
        verbose_name="顶级分类",
    )

    class Meta:
        app_label = "simple_cms"
        verbose_name = "栏目分类"
        verbose_name_plural = "栏目分类"

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} -> {self.name}"
        return self.name
