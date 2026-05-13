from django.db import models


class SiteSetting(models.Model):
    DEFAULT_AI_GENERATE_MODEL = "Qwen/Qwen2.5-72B-Instruct"
    DEFAULT_AI_REVIEW_MODEL = "Qwen/Qwen2.5-72B-Instruct"
    DEFAULT_AI_GENERATE_MODEL_OPTIONS = [
        "Qwen/Qwen2.5-72B-Instruct",
        "deepseek-ai/DeepSeek-V3",
        "Qwen/Qwen2.5-32B-Instruct",
    ]
    DEFAULT_REVIEW_PROMPT = (
        "请基于以下文章内容给出 1-3 条 SEO 编辑建议，输出 JSON 对象，字段必须包含 "
        "`suggestions` 数组。每条 suggestion 必须包含 `type`、`severity`、`title`、`reason`、`patches`。"
        "patch 必须包含 `operation`、`target_block_id`、`new_text`，可选 `old_text`、`reason`。"
        "优先生成 metadata 或 body_replace 建议。"
    )
    DEFAULT_METADATA_PROMPT = (
        "请返回 JSON 对象，字段必须包含 `title`、`description`、`canonical`、`robots`、`og_title`、`og_description`。"
        "输出内容用于 Django SEO Metadata 建议，不要生成额外解释。"
    )
    DEFAULT_FAQ_PROMPT = (
        "请基于文章内容生成 3 组适合 SEO FAQ 的问答，输出 JSON 对象，字段必须包含 `faq` 数组。"
        "每项必须包含 `question` 和 `answer`。"
    )
    DEFAULT_INTERNAL_LINKS_PROMPT = (
        "请基于文章内容和候选文章列表推荐 3-5 个内链，输出 JSON 对象，字段必须包含 `links` 数组。"
        "每项必须包含 `title`、`url`、`reason`。"
    )
    DEFAULT_ALT_PROMPT = (
        "请基于图片与文章上下文生成适合 SEO 和可访问性的图片 alt 文本，输出 JSON 对象。"
        "字段必须包含 `alt_text`。"
    )
    DEFAULT_TITLE_PROMPT = (
        "你是一个标题党大师。请根据文章内容生成 5 个吸引点击的爆款标题。\n"
        "要求：每个标题不超过 30 字，包含核心关键词，有吸引力。\n"
        "输出 JSON 对象，字段为 `titles` 数组，每项包含 `text`（标题）和 `reason`（生成理由）。"
    )
    DEFAULT_SLUG_PROMPT = (
        "你是一个 SEO 专家。请根据文章标题和内容生成 5 个适合 SEO 的 URL slug。\n"
        "要求：全部小写，用连字符分隔，不能有特殊字符，不超过 60 字符。\n"
        "输出 JSON 对象，字段为 `slugs` 数组，每项包含 `text`（slug）和 `reason`（生成理由）。"
    )
    DEFAULT_TAGS_PROMPT = (
        "你是一个内容标签专家。请根据文章内容提取 8-10 个相关标签。\n"
        "要求：标签要有代表性，涵盖主题、领域、关键技术等维度。\n"
        "输出 JSON 对象，字段为 `tags` 数组，每项包含 `name`（标签名）和 `reason`（提取理由）。"
    )
    DEFAULT_DESCRIPTION_PROMPT = (
        "你是一个 SEO 写作专家。请根据文章内容生成 3 个吸引人的 SEO 描述（description）。\n"
        "要求：每个描述 80-160 字，包含核心关键词，有吸引力，能引发用户点击。\n"
        "输出 JSON 对象，字段为 `descriptions` 数组，每项包含 `text`（描述文本）和 `reason`（生成理由）。"
    )

    storage_path = models.CharField("默认文件存储路径", max_length=200, default="/media/uploads/")
    allow_video = models.BooleanField("允许上传视频/音频", default=True)
    max_upload_size = models.IntegerField("单文件最大上传限制（MB）", default=100)

    site_title = models.CharField("网站标题", max_length=255, default="企业内容管理系统")
    site_logo = models.ImageField("网站 Logo", upload_to="settings/branding/", blank=True, null=True)
    favicon = models.ImageField("网站图标", upload_to="settings/branding/", blank=True, null=True)

    seo_keywords = models.CharField("默认 Meta Keywords", max_length=500, blank=True)
    seo_description = models.TextField("默认 Meta Description", blank=True)

    ai_review_model = models.CharField(
        "AI 审核与扩展生成默认模型",
        max_length=200,
        default=DEFAULT_AI_REVIEW_MODEL,
    )
    ai_generate_model = models.CharField(
        "AI 四项生成默认模型",
        max_length=200,
        default=DEFAULT_AI_GENERATE_MODEL,
    )
    ai_alt_model = models.CharField(
        "AI 图片 Alt 生成模型",
        max_length=200,
        default=DEFAULT_AI_GENERATE_MODEL,
    )
    ai_generate_model_options = models.JSONField(
        "AI 四项生成可选模型列表",
        default=list,
        blank=True,
    )
    ai_generate_title_prompt = models.TextField(
        "AI 标题生成 Prompt",
        default=DEFAULT_TITLE_PROMPT,
    )
    ai_generate_slug_prompt = models.TextField(
        "AI Slug 生成 Prompt",
        default=DEFAULT_SLUG_PROMPT,
    )
    ai_generate_tags_prompt = models.TextField(
        "AI 标签生成 Prompt",
        default=DEFAULT_TAGS_PROMPT,
    )
    ai_generate_description_prompt = models.TextField(
        "AI 描述生成 Prompt",
        default=DEFAULT_DESCRIPTION_PROMPT,
    )
    ai_review_prompt = models.TextField(
        "AI 审核 Prompt",
        default=DEFAULT_REVIEW_PROMPT,
    )
    ai_metadata_prompt = models.TextField(
        "AI Metadata Prompt",
        default=DEFAULT_METADATA_PROMPT,
    )
    ai_faq_prompt = models.TextField(
        "AI FAQ Prompt",
        default=DEFAULT_FAQ_PROMPT,
    )
    ai_internal_links_prompt = models.TextField(
        "AI 内链推荐 Prompt",
        default=DEFAULT_INTERNAL_LINKS_PROMPT,
    )
    ai_alt_prompt = models.TextField(
        "AI Alt Prompt",
        default=DEFAULT_ALT_PROMPT,
    )
    siliconflow_api_key = models.CharField(
        "硅基流动 API Key",
        max_length=255,
        blank=True,
        default="",
    )
    site_public_base_url = models.URLField(
        "站点公开 Base URL",
        blank=True,
        default="",
        help_text="用于拼接文章公开 URL，例如 https://www.example.com",
    )
    google_service_account_json = models.TextField(
        "Google Service Account JSON",
        blank=True,
        default="",
        help_text="填入完整的 Service Account JSON，用于访问 GSC 与 GA4 Data API。",
    )
    google_search_console_site_url = models.CharField(
        "Google Search Console Site URL",
        max_length=255,
        blank=True,
        default="",
        help_text="支持 https://domain.com/ 或 sc-domain:example.com。",
    )
    ga4_property_id = models.CharField(
        "GA4 Property ID",
        max_length=64,
        blank=True,
        default="",
    )
    crux_api_key = models.CharField(
        "CrUX / PageSpeed API Key",
        max_length=255,
        blank=True,
        default="",
    )
    crux_origin = models.CharField(
        "CrUX Origin",
        max_length=255,
        blank=True,
        default="",
        help_text="例如 https://www.example.com，用于回退到 origin 级体验数据。",
    )
    google_last_sync_at = models.DateTimeField("Google 监控最近同步时间", blank=True, null=True)
    google_last_sync_status = models.CharField("Google 监控最近同步状态", max_length=32, blank=True, default="")
    google_last_sync_message = models.TextField("Google 监控最近同步信息", blank=True, default="")

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

    def save(self, *args, **kwargs):
        if not self.ai_generate_model_options:
            self.ai_generate_model_options = list(self.DEFAULT_AI_GENERATE_MODEL_OPTIONS)
        if not self.ai_alt_model:
            self.ai_alt_model = self.ai_generate_model or self.DEFAULT_AI_GENERATE_MODEL
        super().save(*args, **kwargs)
