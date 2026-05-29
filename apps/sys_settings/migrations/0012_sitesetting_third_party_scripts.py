from django.db import migrations, models


DEFAULT_BAIDU_HEAD_SCRIPT = """<script>
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?89f24b4516d0d355ef517486ac72aa96";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();
</script>"""


def seed_baidu_tracking_script(apps, schema_editor):
    site_setting = apps.get_model("sys_settings", "SiteSetting")
    setting, _ = site_setting.objects.get_or_create(id=1)
    if not (setting.third_party_head_scripts or "").strip():
        setting.third_party_head_scripts = DEFAULT_BAIDU_HEAD_SCRIPT
        setting.save(update_fields=["third_party_head_scripts"])


class Migration(migrations.Migration):

    dependencies = [
        ("sys_settings", "0011_sitesetting_google_monitoring"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="third_party_body_end_scripts",
            field=models.TextField(
                blank=True,
                default="",
                help_text="粘贴需要注入到官网 </body> 前的统计或营销脚本代码。",
                verbose_name="第三方 Body 底部统计代码",
            ),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="third_party_head_scripts",
            field=models.TextField(
                blank=True,
                default="",
                help_text="粘贴需要注入到官网 <head> 的统计或验证脚本代码。",
                verbose_name="第三方 Head 统计代码",
            ),
        ),
        migrations.RunPython(seed_baidu_tracking_script, migrations.RunPython.noop),
    ]
