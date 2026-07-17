from unittest.mock import Mock, patch

from django.test import TestCase, override_settings


@override_settings(
    WECHAT_APP_ID="wx-test",
    WECHAT_APP_SECRET="secret-test",
    WECHAT_JS_API_DOMAINS="yuncan.com,www.yuncan.com",
)
class WechatJsConfigApiTests(TestCase):
    @patch("cms_apps.articles.api.wechat_views.cache.set")
    @patch("cms_apps.articles.api.wechat_views.cache.get", return_value=None)
    @patch("cms_apps.articles.api.wechat_views.requests.get")
    def test_returns_signed_config_and_caches_remote_tokens(self, request_get, _cache_get, cache_set):
        token_response = Mock()
        token_response.json.return_value = {"access_token": "access-token", "expires_in": 7200, "errcode": 0}
        token_response.raise_for_status.return_value = None
        ticket_response = Mock()
        ticket_response.json.return_value = {"ticket": "ticket-value", "expires_in": 7200, "errcode": 0}
        ticket_response.raise_for_status.return_value = None
        request_get.side_effect = [token_response, ticket_response]

        response = self.client.get(
            "/api/public/wechat/js-config/?url=https%3A%2F%2Fwww.yuncan.com%2Farticles%2Fdemo%23section"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["appId"], "wx-test")
        self.assertEqual(len(payload["signature"]), 40)
        self.assertEqual(request_get.call_count, 2)
        self.assertEqual(cache_set.call_count, 2)

    @override_settings(WECHAT_APP_ID="", WECHAT_APP_SECRET="")
    def test_rejects_missing_wechat_configuration(self):
        response = self.client.get("/api/public/wechat/js-config/?url=https%3A%2F%2Fwww.yuncan.com%2F")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "wechat_js_config_unavailable")

    @override_settings(WECHAT_JS_API_DOMAINS="www.yuncan.com")
    def test_rejects_page_url_outside_js_api_domain(self):
        response = self.client.get("/api/public/wechat/js-config/?url=https%3A%2F%2Fevil.example%2F")

        self.assertEqual(response.status_code, 503)
