"""写入产品中心的原厂产品介绍文章。"""

from __future__ import annotations

from html import escape

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from cms_apps.articles.models import Article, Category, Tag
from cms_apps.faq.models import FaqItem
from cms_apps.seo.models import SeoMetadata


PRODUCT_CATEGORY = {
    "name": "产品中心",
    "slug": "products",
    "seo_title": "产品中心 - 企业邮件、邮件安全与协同办公产品 | 云璨信息",
    "seo_keywords": "MDaemon,SecurityGateway,MailStore,Zimbra,企业邮件,邮件安全,邮件归档,协同办公",
    "seo_description": "云璨信息提供企业邮件、邮件安全、邮件归档及协同办公产品的选型、部署与运维支持。",
}


PRODUCTS = (
    {
        "title": "MDaemon 企业邮件服务器",
        "slug": "mdaemon-email-server",
        "summary": "适合希望掌握邮件系统部署与运维节奏的企业。MDaemon 可作为自建邮件平台的核心，覆盖收发信、Webmail、移动访问及常见的邮件管理需求。",
        "tags": ("企业邮件", "邮件服务器", "MDaemon", "私有化部署"),
        "image_url": "https://cdn.shopify.com/s/files/1/0103/2673/6932/files/ProductTile_MD_2be325d5-7b07-4d0a-a215-e2536a68467d.png?v=1742313901",
        "image_alt": "MDaemon Email Server 原厂产品图",
        "image_caption": "MDaemon Email Server 原厂产品图",
        "source_url": "https://mdaemon.com/pages/mdaemon-email-server",
        "intro": (
            "很多企业在邮件系统选型时，关心的并不只是有没有邮箱，而是域名、账号、收发信策略和日常运维能不能握在自己手里。MDaemon 是面向 Windows 环境的企业邮件服务器，适合希望自行部署和管理邮件服务的团队。",
            "它可承担企业邮件的基础收发与账号管理，并提供 Webmail 等访问方式。移动同步、Outlook 连接、反垃圾与反病毒等能力需要结合所选版本和组件确认，实际方案通常还要看现有目录服务、终端环境和邮件量。",
        ),
        "capabilities": (
            "在自有服务器或云主机上部署企业邮箱，邮件域名和账号策略由企业自行管理。",
            "支持常见邮件访问协议与 Webmail，方便桌面端、浏览器和移动端按需接入。",
            "可结合反垃圾、反病毒、移动同步和 Outlook 连接等组件，按实际需要配置。",
            "保留邮件系统迁移、备份、日志留存和权限划分的操作空间，便于长期运维。",
        ),
        "scenarios": (
            "企业希望将邮件服务部署在本地机房、专有云或指定云主机上。",
            "已有域名和邮件账号体系，需要替换旧邮件服务器或完成平稳迁移。",
            "对邮件账号、管理员权限、备份策略和日志排查有明确管理要求。",
        ),
        "delivery": "实施前会先核对域名解析、证书、网络出口、存储、备份和客户端使用情况。对正在使用的邮件系统，建议先做账号、历史邮件和收发信策略盘点，再确定迁移窗口与回退方案。",
        "faqs": (
            ("MDaemon 是否只能部署在本地机房？", "不一定。它可部署在企业自有服务器或满足条件的云主机上，关键是提前评估网络、域名解析、备份和安全策略。"),
            ("已有邮箱可以迁到 MDaemon 吗？", "通常可以，但迁移方式取决于原邮件系统、历史邮件规模和客户端使用情况。上线前应先做账号、邮件数据和收发信策略的盘点。"),
            ("移动同步和 Outlook 连接是否默认具备？", "这类能力与所选版本、组件及客户端环境有关。选型时需要按实际终端和协同方式确认。"),
        ),
    },
    {
        "title": "SecurityGateway 邮件安全网关",
        "slug": "securitygateway-email-security",
        "summary": "部署在邮件系统前方的安全网关，用于集中处理垃圾邮件、恶意邮件和邮件策略，减少风险邮件直接进入企业邮箱。",
        "tags": ("邮件安全", "反垃圾邮件", "安全网关", "SecurityGateway"),
        "image_url": "https://cdn.shopify.com/s/files/1/0103/2673/6932/files/ProductTile_SG_adf94277-0a29-425e-9c47-b04a023f76c5.png?v=1721223619",
        "image_alt": "SecurityGateway for Email 原厂产品图",
        "image_caption": "SecurityGateway for Email 原厂产品图",
        "source_url": "https://mdaemon.com/pages/security-gateway",
        "intro": (
            "邮件安全不是装完就结束的事。垃圾邮件、钓鱼邮件和异常附件会持续变化，单靠用户在客户端里逐封判断，成本很高。SecurityGateway 是部署在邮件服务器前方的邮件安全网关，可在邮件进入邮箱前先做过滤和策略处理。",
            "它不要求替换现有邮件系统，因此更适合已在运行 Exchange、Microsoft 365 或其他邮件平台的企业。网关负责把入口收紧，原有邮箱继续承担收发和协同。",
        ),
        "capabilities": (
            "在邮件进入企业邮箱前进行反垃圾、反病毒和规则过滤。",
            "集中管理隔离邮件与邮件策略，减少管理员在多个邮箱系统间反复处理。",
            "可按发件人、收件人、域名和邮件特征配置策略，适配不同部门的收发信要求。",
            "作为独立网关与现有邮件平台配合，减少改造核心邮件系统的范围。",
        ),
        "scenarios": (
            "企业邮箱已经在用，需要先补齐入站和出站邮件的安全控制。",
            "前台、财务、采购等岗位常收到外部邮件，需要降低钓鱼和恶意附件的暴露面。",
            "管理员希望将隔离邮件、白名单和策略处理集中到一处。",
        ),
        "delivery": "部署会围绕 MX 解析、邮件路由、TLS 证书、白名单、隔离策略和异常邮件处置流程展开。为了避免影响正常业务，通常先以审计和观察方式运行，再逐步收紧拦截规则。",
        "faqs": (
            ("SecurityGateway 是否必须配合 MDaemon 使用？", "不必须。它可作为独立邮件安全网关部署在现有邮件服务器前方，是否适配需根据当前邮件平台和路由方式确认。"),
            ("会不会把正常邮件误判为垃圾邮件？", "任何过滤策略都需要结合企业实际邮件特征调优。上线初期建议保留隔离检查和白名单处理流程，再逐步调整规则。"),
            ("部署时需要改 MX 记录吗？", "多数方案需要调整邮件流向，是否修改 MX 记录取决于现有架构。实施前会先确认现网邮件路由与回退方案。"),
        ),
    },
    {
        "title": "MailStore Server 邮件归档",
        "slug": "mailstore-server",
        "summary": "将企业邮件集中归档并建立可检索的历史邮件库，适合需要保留、查找和导出邮件记录的团队。",
        "tags": ("邮件归档", "邮件检索", "数据留存", "MailStore"),
        "image_url": "https://www.mailstore.com/en/wp-content/uploads/sites/3/2016/12/webaccess.png",
        "image_alt": "MailStore Server Web Access 原厂界面截图",
        "image_caption": "MailStore Server Web Access 原厂界面截图",
        "source_url": "https://www.mailstore.com/en/products/mailstore-server/",
        "intro": (
            "邮件归档解决的不是“邮箱满了”这么简单。离职交接、项目追溯、合同往来、审计取证，往往都需要在大量历史邮件里快速找到一封可信的原件。MailStore Server 用于集中归档企业邮件，并为管理员和授权用户提供检索、查看与导出入口。",
            "归档系统与在线邮箱承担的职责不同。在线邮箱服务日常收发，归档库负责长期保留与检索。两者配合后，企业不必把所有历史邮件都压在生产邮箱里。",
        ),
        "capabilities": (
            "从常见邮件系统或邮箱采集邮件，集中形成归档库。",
            "通过全文检索和条件筛选定位历史邮件，减少翻找 PST 或旧邮箱的时间。",
            "按权限向管理员和用户提供访问入口，支持在需要时查看或导出邮件。",
            "可将归档策略与备份、存储和账号生命周期一起规划，降低历史邮件管理的碎片化程度。",
        ),
        "scenarios": (
            "企业希望将多年历史邮件从生产邮箱中分离出来，仍能按需检索。",
            "销售、法务、财务和项目团队需要追溯往来邮件与附件。",
            "组织需要建立离职员工邮件交接和历史邮件访问的规范流程。",
        ),
        "delivery": "归档项目的关键不是只把数据导进去，还要先确定归档范围、保留周期、用户权限、存储位置和恢复方式。对于 Microsoft 365、Exchange 或混合环境，还需先核对采集账号和网络访问条件。",
        "faqs": (
            ("MailStore Server 能替代备份吗？", "不能简单等同。归档侧重于邮件长期留存和检索，备份侧重于系统或数据的恢复。实际环境通常需要同时规划归档和备份。"),
            ("归档后用户还能找回自己的历史邮件吗？", "可以按权限开放 Web Access、客户端集成等访问方式，具体开放范围由企业的账号和权限策略决定。"),
            ("Microsoft 365 或 Exchange 的邮件可以归档吗？", "MailStore Server 支持对多种邮件系统进行归档。接入方式和权限配置需按当前环境与版本确认。"),
        ),
    },
    {
        "title": "Zimbra 协同办公平台",
        "slug": "zimbra-collaboration-suite",
        "summary": "将邮件、日历、联系人和任务等工作信息放进统一协作环境，适合需要自主管理协同平台的组织。",
        "tags": ("协同办公", "企业邮箱", "日历协作", "Zimbra"),
        "image_url": "https://www.zimbra.com/wp-content/uploads/2023/07/product_daffodil.png",
        "image_alt": "Zimbra Daffodil 原厂产品资料图",
        "image_caption": "Zimbra Daffodil 原厂产品资料图",
        "source_url": "https://www.zimbra.com/product/",
        "intro": (
            "对很多团队来说，邮件、会议安排、联系人和待办事项本来就是同一条工作链路。Zimbra 将这些常用协作能力放在统一平台中，适合希望自主掌握账号、数据和协作方式的组织。",
            "它既可以作为企业邮件与日历协同平台使用，也适合在统一账号体系下管理不同部门的访问权限。具体功能和部署模式要结合所选版本、终端环境与现有系统集成需求确认。",
        ),
        "capabilities": (
            "在统一界面中处理邮件、日历、联系人、任务等日常协作信息。",
            "支持基于组织与账号体系进行权限管理，适合多部门或多组织单位的协作场景。",
            "可根据部署方案接入浏览器、桌面客户端和移动端，兼顾不同办公习惯。",
            "为邮件、安全、备份和归档等配套能力预留集成空间，便于形成完整协作体系。",
        ),
        "scenarios": (
            "组织希望将邮箱和日历协作整合到一套可自主管理的平台中。",
            "多部门需要共享日程、联系人或会议安排，并保留统一的权限边界。",
            "现有协同工具分散，希望梳理账号、迁移历史数据并重新规划访问方式。",
        ),
        "delivery": "Zimbra 的实施通常会先评估用户规模、域名与账号体系、历史邮件、日历迁移、移动端接入及高可用要求。对生产环境，建议先完成试点和迁移演练，再分批切换用户。",
        "faqs": (
            ("Zimbra 只适合做企业邮箱吗？", "不止于此。它还覆盖日历、联系人、任务等协作信息，适合把邮件与日常协同放在一个统一环境中管理。"),
            ("可以从现有邮件系统迁移到 Zimbra 吗？", "通常可以，但涉及账号、邮件、联系人、日历和客户端配置。建议先评估数据范围并安排试点迁移。"),
            ("是否可以与邮件安全和归档系统配合？", "可以按架构与产品兼容性进行组合。常见做法是将邮件安全网关、归档和备份作为协同平台的配套能力一并规划。"),
        ),
    },
)


def _text_node(text: str) -> dict[str, object]:
    return {"type": "text", "text": text}


def _paragraph(text: str, block_id: str) -> dict[str, object]:
    return {"type": "paragraph", "attrs": {"blockId": block_id}, "content": [_text_node(text)]}


def _heading(text: str, level: int, block_id: str) -> dict[str, object]:
    return {"type": "heading", "attrs": {"level": level, "blockId": block_id}, "content": [_text_node(text)]}


def _bullet_list(items: tuple[str, ...], block_id: str) -> dict[str, object]:
    return {
        "type": "bulletList",
        "attrs": {"blockId": block_id},
        "content": [
            {
                "type": "listItem",
                "attrs": {"blockId": f"{block_id}-{index}"},
                "content": [_paragraph(item, f"{block_id}-{index}-p")],
            }
            for index, item in enumerate(items, start=1)
        ],
    }


def _image(src: str, alt: str, caption: str, block_id: str) -> dict[str, object]:
    return {
        "type": "image",
        "attrs": {
            "blockId": block_id,
            "src": src,
            "alt": alt,
            "title": caption,
            "width": None,
            "align": "center",
        },
    }


def _render_html(product: dict[str, object]) -> str:
    def paragraphs(items: tuple[str, ...]) -> str:
        return "".join(f"<p>{escape(item)}</p>" for item in items)

    def bullets(items: tuple[str, ...]) -> str:
        return "<ul>" + "".join(f"<li>{escape(item)}</li>" for item in items) + "</ul>"

    faq_html = "".join(
        f"<h3>{escape(question)}</h3><p>{escape(answer)}</p>"
        for question, answer in product["faqs"]
    )
    return "".join(
        (
            paragraphs(product["intro"]),
            "<h2>产品界面与原厂资料</h2>",
            f'<figure data-align="center"><img src="{escape(product["image_url"], quote=True)}" alt="{escape(product["image_alt"], quote=True)}" loading="lazy" /><figcaption>{escape(product["image_caption"])}</figcaption></figure>',
            "<h2>能解决什么问题</h2>",
            bullets(product["capabilities"]),
            "<h2>适用场景</h2>",
            bullets(product["scenarios"]),
            "<h2>部署与交付要点</h2>",
            f"<p>{escape(product['delivery'])}</p>",
            "<h2>常见问题</h2>",
            faq_html,
            "<h2>需要先做一次环境评估？</h2>",
            '<p>邮件系统的选型和迁移都会牵涉现网业务。<a href="/contact">联系云璨信息</a>，说明现有邮件平台、用户规模和目标，我们会协助梳理部署、迁移、安全与归档的组合方案。</p>',
            f'<p>产品资料参考：<a href="{escape(product["source_url"], quote=True)}" target="_blank" rel="noreferrer">原厂产品页面</a>。</p>',
        )
    )


def _build_content_json(product: dict[str, object]) -> dict[str, object]:
    content: list[dict[str, object]] = []
    block_number = 1

    def next_id(prefix: str) -> str:
        nonlocal block_number
        value = f"product-{prefix}-{block_number}"
        block_number += 1
        return value

    for item in product["intro"]:
        content.append(_paragraph(item, next_id("intro")))
    content.append(_heading("产品界面与原厂资料", 2, next_id("heading")))
    content.append(_image(product["image_url"], product["image_alt"], product["image_caption"], next_id("image")))
    content.append(_heading("能解决什么问题", 2, next_id("heading")))
    content.append(_bullet_list(product["capabilities"], next_id("capabilities")))
    content.append(_heading("适用场景", 2, next_id("heading")))
    content.append(_bullet_list(product["scenarios"], next_id("scenarios")))
    content.append(_heading("部署与交付要点", 2, next_id("heading")))
    content.append(_paragraph(product["delivery"], next_id("delivery")))
    content.append(_heading("常见问题", 2, next_id("heading")))
    for question, answer in product["faqs"]:
        content.append(_heading(question, 3, next_id("faq-question")))
        content.append(_paragraph(answer, next_id("faq-answer")))
    content.append(_heading("需要先做一次环境评估？", 2, next_id("heading")))
    content.append(_paragraph("邮件系统的选型和迁移都会牵涉现网业务。联系云璨信息，说明现有邮件平台、用户规模和目标，我们会协助梳理部署、迁移、安全与归档的组合方案。", next_id("cta")))
    content.append(_paragraph("产品资料参考：原厂产品页面。", next_id("source")))
    return {"type": "doc", "content": content}


def _get_or_create_tags(names: tuple[str, ...]) -> list[Tag]:
    tags: list[Tag] = []
    for name in names:
        tag = Tag.objects.filter(name=name).first()
        if tag is None:
            base_slug = slugify(name, allow_unicode=True) or "tag"
            candidate = base_slug
            suffix = 1
            while Tag.objects.filter(slug=candidate).exists():
                suffix += 1
                candidate = f"{base_slug}-{suffix}"
            tag = Tag.objects.create(name=name, slug=candidate)
        tags.append(tag)
    return tags


class Command(BaseCommand):
    help = "新增或更新 MDaemon、SecurityGateway、MailStore 和 Zimbra 产品中心文章"

    @transaction.atomic
    def handle(self, *args, **options):
        category, _ = Category.objects.update_or_create(
            slug=PRODUCT_CATEGORY["slug"],
            defaults={key: value for key, value in PRODUCT_CATEGORY.items() if key != "slug"},
        )
        results = []

        for position, product in enumerate(PRODUCTS, start=1):
            html = _render_html(product)
            article, created = Article.objects.get_or_create(slug=product["slug"])
            article.title = product["title"]
            article.category = category
            article.body = html
            article.content_html = html
            article.content_json = _build_content_json(product)
            article.status = "published"
            article.publish_date = article.publish_date or timezone.now()
            article.sort_order = 100 - position
            article.meta_description = product["summary"]
            article.save()
            article.tags.set(_get_or_create_tags(product["tags"]))

            SeoMetadata.objects.update_or_create(
                article=article,
                defaults={
                    "meta_title": f"{product['title']} | 云璨信息",
                    "meta_description": product["summary"],
                    "meta_keywords": ",".join(product["tags"]),
                    "canonical_url": f"https://www.yuncan.com/articles/{product['slug']}",
                    "robots": "index,follow",
                    "og_title": product["title"],
                    "og_description": product["summary"],
                },
            )

            article.faq_items.all().delete()
            FaqItem.objects.bulk_create(
                [
                    FaqItem(article=article, question=question, answer=answer, sort_order=index)
                    for index, (question, answer) in enumerate(product["faqs"], start=1)
                ]
            )
            results.append(f"{'新增' if created else '更新'}：{article.title} ({article.slug})")

        self.stdout.write(self.style.SUCCESS("\n".join(results)))
