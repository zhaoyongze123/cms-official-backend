from django.core.validators import RegexValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("sys_settings", "0016_sitesetting_homepage_ai_drive_demo_description_1_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ContactProductOption",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "product_key",
                    models.CharField(
                        help_text="例如 kodbox。对应访问地址 /contact?product=kodbox。",
                        max_length=64,
                        unique=True,
                        validators=[
                            RegexValidator(
                                message="仅支持小写字母、数字和连字符，且必须以字母或数字开头。",
                                regex="^[a-z0-9][a-z0-9-]{0,63}$",
                            )
                        ],
                        verbose_name="URL 参数值",
                    ),
                ),
                ("name", models.CharField(max_length=80, verbose_name="产品显示名称")),
                ("is_active", models.BooleanField(default=True, verbose_name="在官网表单中启用")),
                ("sort_order", models.PositiveIntegerField(default=0, verbose_name="排序")),
                (
                    "site_setting",
                    models.ForeignKey(
                        editable=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="contact_product_options",
                        to="sys_settings.sitesetting",
                        verbose_name="所属站点设置",
                    ),
                ),
            ],
            options={
                "verbose_name": "咨询表单产品选项",
                "verbose_name_plural": "咨询表单产品选项",
                "ordering": ["sort_order", "id"],
            },
        ),
    ]
