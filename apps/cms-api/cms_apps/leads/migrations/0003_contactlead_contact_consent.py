from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cms_leads", "0002_add_email_configuration"),
    ]

    operations = [
        migrations.AddField(
            model_name="contactlead",
            name="contact_consent",
            field=models.BooleanField(default=False, verbose_name="联系授权"),
        ),
    ]
