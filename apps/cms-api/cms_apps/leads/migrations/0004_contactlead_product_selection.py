from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cms_leads", "0003_contactlead_contact_consent"),
        ("sys_settings", "0017_contactproductoption"),
    ]

    operations = [
        migrations.AddField(
            model_name="contactlead",
            name="product_key",
            field=models.CharField(blank=True, max_length=64, verbose_name="咨询产品参数"),
        ),
        migrations.AddField(
            model_name="contactlead",
            name="product_name",
            field=models.CharField(blank=True, max_length=80, verbose_name="咨询产品"),
        ),
    ]
