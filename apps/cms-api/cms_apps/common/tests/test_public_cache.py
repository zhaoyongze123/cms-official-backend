from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from cms_apps.common.services.public_cache import invalidate_public_web_cache


class PublicCacheTests(SimpleTestCase):
    @override_settings(
        PUBLIC_WEB_REVALIDATE_URL="http://public-web:3000/api/revalidate",
        PUBLIC_WEB_REVALIDATE_TOKEN="test-token",
    )
    @patch("cms_apps.common.services.public_cache.urllib_request.ProxyHandler")
    @patch("cms_apps.common.services.public_cache.urllib_request.build_opener")
    def test_invalidation_posts_token_to_public_web(self, build_opener, _proxy_handler):
        response = build_opener.return_value.open.return_value.__enter__.return_value
        response.status = 200

        self.assertTrue(invalidate_public_web_cache())

        request = build_opener.return_value.open.call_args.args[0]
        self.assertEqual(request.get_header("X-revalidate-token"), "test-token")

    @override_settings(PUBLIC_WEB_REVALIDATE_URL="", PUBLIC_WEB_REVALIDATE_TOKEN="")
    @patch("cms_apps.common.services.public_cache.urllib_request.build_opener")
    def test_missing_configuration_skips_request(self, build_opener):
        self.assertFalse(invalidate_public_web_cache())
        build_opener.assert_not_called()
