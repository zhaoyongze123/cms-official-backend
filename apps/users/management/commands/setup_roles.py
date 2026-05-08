"""
Management command to create default user groups with CMS permissions.
Run with: python manage.py setup_roles
"""
from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand


DEFAULT_ROLES = {
    "\u7ba1\u7406\u5458": {
        "description": "Full access including user management",
        "permissions": "all",
    },
    "\u7f16\u8f91": {
        "description": "Create and edit content",
        "permissions": [
            "simple_cms.add_article",
            "simple_cms.change_article",
            "simple_cms.view_article",
            "simple_cms.delete_article",
            "simple_cms.add_category",
            "simple_cms.change_category",
            "simple_cms.view_category",
            "media_library.add_imageitem",
            "media_library.change_imageitem",
            "media_library.view_imageitem",
            "media_library.add_fileitem",
            "media_library.change_fileitem",
            "media_library.view_fileitem",
            "sys_settings.view_sitesetting",
        ],
    },
    "\u5ba1\u6838\u5458": {
        "description": "Review and audit content",
        "permissions": [
            "simple_cms.change_article",
            "simple_cms.view_article",
            "simple_cms.view_category",
            "users.view_auditlog",
            "users.view_proxygroup",
        ],
    },
    "\u8bbf\u5ba2": {
        "description": "Read-only access",
        "permissions": [
            "simple_cms.view_article",
            "simple_cms.view_category",
            "media_library.view_imageitem",
            "media_library.view_fileitem",
            "users.view_auditlog",
        ],
    },
}


class Command(BaseCommand):
    help = "Create default user groups (roles) with CMS permissions"

    def handle(self, *args, **options):
        for role_name, config in DEFAULT_ROLES.items():
            group, created = Group.objects.get_or_create(name=role_name)
            status = "Created" if created else "Already exists"

            if config["permissions"] == "all":
                all_perms = Permission.objects.all()
                group.permissions.set(all_perms)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [{status}] {role_name} - all permissions granted"
                    )
                )
                continue

            perms = []
            for perm_string in config["permissions"]:
                app_label, codename = perm_string.rsplit(".", 1)
                try:
                    perm = Permission.objects.get(
                        content_type__app_label=app_label,
                        codename=codename,
                    )
                    perms.append(perm)
                except Permission.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f"  Permission not found: {perm_string}")
                    )

            group.permissions.set(perms)
            self.stdout.write(
                self.style.SUCCESS(
                    f"  [{status}] {role_name} - {len(perms)} permissions"
                )
            )

        self.stdout.write(self.style.SUCCESS("\nAll roles configured."))
