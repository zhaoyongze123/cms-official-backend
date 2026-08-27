from django.db import migrations


DEFAULT_CONTACT_PRODUCTS = [
    (10, "Kodbox 企业网盘", "kodbox"),
    (20, "MDaemon 企业邮箱", "mdaemon"),
    (30, "SecurityGateway 邮件安全网关", "securitygateway"),
    (40, "MailStore 邮件归档", "mailstore"),
    (50, "Zimbra 邮箱协同", "zimbra"),
]


def seed_contact_product_options(apps, schema_editor):
    SiteSetting = apps.get_model("sys_settings", "SiteSetting")
    ContactProductOption = apps.get_model("sys_settings", "ContactProductOption")
    site_setting, _ = SiteSetting.objects.get_or_create(id=1)

    # 仅补齐首次可用的默认项，不覆盖后台后来修改过的名称、排序或启用状态。
    for sort_order, name, product_key in DEFAULT_CONTACT_PRODUCTS:
        ContactProductOption.objects.get_or_create(
            product_key=product_key,
            defaults={
                "site_setting": site_setting,
                "name": name,
                "sort_order": sort_order,
                "is_active": True,
            },
        )


def remove_seeded_contact_product_options(apps, schema_editor):
    ContactProductOption = apps.get_model("sys_settings", "ContactProductOption")
    ContactProductOption.objects.filter(
        product_key__in=[product_key for _, _, product_key in DEFAULT_CONTACT_PRODUCTS]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("sys_settings", "0017_contactproductoption"),
    ]

    operations = [
        migrations.RunPython(seed_contact_product_options, remove_seeded_contact_product_options),
    ]
