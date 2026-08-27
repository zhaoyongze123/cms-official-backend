from django.core.validators import FileExtensionValidator, RegexValidator
from django.db import models, transaction

from cms_apps.common.services.public_cache import invalidate_public_web_cache


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
    third_party_head_scripts = models.TextField(
        "第三方 Head 统计代码",
        blank=True,
        default="",
        help_text="粘贴需要注入到官网 <head> 的统计或验证脚本代码。",
    )
    third_party_body_end_scripts = models.TextField(
        "第三方 Body 底部统计代码",
        blank=True,
        default="",
        help_text="粘贴需要注入到官网 </body> 前的统计或营销脚本代码。",
    )
    homepage_featured_article_primary = models.ForeignKey(
        "simple_cms.Article",
        verbose_name="首页卡片一文章",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        limit_choices_to={"status": "published"},
        help_text="用于首页第一张轮播卡片，前台会读取文章标题、摘要和 OG 图片。",
    )
    homepage_featured_article_secondary = models.ForeignKey(
        "simple_cms.Article",
        verbose_name="首页卡片二文章",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        limit_choices_to={"status": "published"},
        help_text="用于首页第二张轮播卡片，前台会读取文章标题、摘要和 OG 图片。",
    )
    homepage_featured_article_tertiary = models.ForeignKey(
        "simple_cms.Article",
        verbose_name="首页卡片三文章",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        limit_choices_to={"status": "published"},
        help_text="用于首页第三张轮播卡片，前台会读取文章标题、摘要和 OG 图片。",
    )
    homepage_solution_article_1 = models.ForeignKey(
        "simple_cms.Article",
        verbose_name="首页解决方案一文章",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        limit_choices_to={"status": "published"},
        help_text="用于首页解决方案区第一条，前台会读取文章分类、标题和摘要。",
    )
    homepage_solution_article_2 = models.ForeignKey(
        "simple_cms.Article",
        verbose_name="首页解决方案二文章",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        limit_choices_to={"status": "published"},
        help_text="用于首页解决方案区第二条，前台会读取文章分类、标题和摘要。",
    )
    homepage_solution_article_3 = models.ForeignKey(
        "simple_cms.Article",
        verbose_name="首页解决方案三文章",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        limit_choices_to={"status": "published"},
        help_text="用于首页解决方案区第三条，前台会读取文章分类、标题和摘要。",
    )
    homepage_solution_article_4 = models.ForeignKey(
        "simple_cms.Article",
        verbose_name="首页解决方案四文章",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        limit_choices_to={"status": "published"},
        help_text="用于首页解决方案区第四条，前台会读取文章分类、标题和摘要。",
    )
    homepage_case_logo_wall_image = models.ImageField(
        "首页客户案例 LOGO 墙图片",
        upload_to="settings/homepage/",
        blank=True,
        null=True,
        help_text="用于官网首页底部展示客户案例 LOGO 墙，建议上传横向大图。",
    )
    homepage_ai_drive_demo_video_1 = models.FileField(
        "AI 网盘演示视频一",
        upload_to="settings/homepage/ai-drive/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=["mp4", "webm", "ogv"])],
        help_text="上传后替换官网演示场景一。支持 MP4、WebM、Ogv，建议使用无音轨 H.264 MP4。",
    )
    homepage_ai_drive_demo_title_1 = models.CharField(
        "场景一遮罩标题", max_length=80, default="右键制度文件，直接开始提问"
    )
    homepage_ai_drive_demo_description_1 = models.CharField(
        "场景一遮罩说明",
        max_length=240,
        default="在 AI 测试资料中选中制度文件，从右键菜单进入 AI 助手，问题和资料上下文同步带入。",
    )
    homepage_ai_drive_demo_highlights_1 = models.CharField(
        "场景一遮罩卖点", max_length=160, default="员工考勤管理制度\n答案引用当前资料", blank=True,
        help_text="每行一条卖点，留空则不展示卖点。",
    )
    homepage_ai_drive_demo_video_2 = models.FileField(
        "AI 网盘演示视频二",
        upload_to="settings/homepage/ai-drive/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=["mp4", "webm", "ogv"])],
        help_text="上传后替换官网演示场景二。支持 MP4、WebM、Ogv，建议使用无音轨 H.264 MP4。",
    )
    homepage_ai_drive_demo_title_2 = models.CharField(
        "场景二遮罩标题", max_length=80, default="配置智能体，关联 AI 解决方案知识库"
    )
    homepage_ai_drive_demo_description_2 = models.CharField(
        "场景二遮罩说明",
        max_length=240,
        default="新建智能体后直接选择 AI 解决方案文档作为知识库，再围绕企业资料进行问答。",
    )
    homepage_ai_drive_demo_highlights_2 = models.CharField(
        "场景二遮罩卖点", max_length=160, default="", blank=True,
        help_text="每行一条卖点，留空则不展示卖点。",
    )
    homepage_ai_drive_demo_video_3 = models.FileField(
        "AI 网盘演示视频三",
        upload_to="settings/homepage/ai-drive/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=["mp4", "webm", "ogv"])],
        help_text="上传后替换官网演示场景三。支持 MP4、WebM、Ogv，建议使用无音轨 H.264 MP4。",
    )
    homepage_ai_drive_demo_title_3 = models.CharField(
        "场景三遮罩标题", max_length=80, default="后台统一管理模型服务与参数"
    )
    homepage_ai_drive_demo_description_3 = models.CharField(
        "场景三遮罩说明",
        max_length=240,
        default="在 AI 助手管理后台查看模型服务、模型选择和调用参数，按企业环境配置。",
    )
    homepage_ai_drive_demo_highlights_3 = models.CharField(
        "场景三遮罩卖点", max_length=160, default="", blank=True,
        help_text="每行一条卖点，留空则不展示卖点。",
    )
    homepage_ai_drive_demo_video_4 = models.FileField(
        "AI 网盘演示视频四",
        upload_to="settings/homepage/ai-drive/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=["mp4", "webm", "ogv"])],
        help_text="上传后替换官网演示场景四。支持 MP4、WebM、Ogv，建议使用无音轨 H.264 MP4。",
    )
    homepage_ai_drive_demo_title_4 = models.CharField(
        "场景四遮罩标题", max_length=80, default="上传资料，完成解析并用于 RAG 检索"
    )
    homepage_ai_drive_demo_description_4 = models.CharField(
        "场景四遮罩说明",
        max_length=240,
        default="上传 Word 或 TXT 后查看解析状态，并在 RAG 检索增强中确认资料可被召回。",
    )
    homepage_ai_drive_demo_highlights_4 = models.CharField(
        "场景四遮罩卖点", max_length=160, default="", blank=True,
        help_text="每行一条卖点，留空则不展示卖点。",
    )

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
        # 官网会缓存站点设置，后台保存后主动通知前端刷新配置。
        transaction.on_commit(invalidate_public_web_cache)


class ContactProductOption(models.Model):
    """官网咨询表单可选产品，参数值同时用于 /contact?product=xxx。"""

    site_setting = models.ForeignKey(
        SiteSetting,
        verbose_name="所属站点设置",
        on_delete=models.CASCADE,
        related_name="contact_product_options",
        editable=False,
    )
    product_key = models.CharField(
        "URL 参数值",
        max_length=64,
        unique=True,
        validators=[
            RegexValidator(
                regex=r"^[a-z0-9][a-z0-9-]{0,63}$",
                message="仅支持小写字母、数字和连字符，且必须以字母或数字开头。",
            )
        ],
        help_text="例如 kodbox。对应访问地址 /contact?product=kodbox。",
    )
    name = models.CharField("产品显示名称", max_length=80)
    is_active = models.BooleanField("在官网表单中启用", default=True)
    sort_order = models.PositiveIntegerField("排序", default=0)

    class Meta:
        ordering = ["sort_order", "id"]
        verbose_name = "咨询表单产品选项"
        verbose_name_plural = "咨询表单产品选项"

    def clean(self):
        super().clean()
        self.product_key = self.product_key.strip().lower()
        self.name = self.name.strip()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        # 产品配置变化后，联系页下拉框和 URL 预选需立即同步。
        transaction.on_commit(invalidate_public_web_cache)

    def delete(self, *args, **kwargs):
        result = super().delete(*args, **kwargs)
        transaction.on_commit(invalidate_public_web_cache)
        return result

    def __str__(self):
        return self.name
