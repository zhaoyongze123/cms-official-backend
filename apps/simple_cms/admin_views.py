import urllib.error
import urllib.request
from urllib.parse import urlparse

from django.conf import settings
from django.http import HttpResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt


PROXY_RESPONSE_HEADERS = (
    "Content-Type",
    "Cache-Control",
    "ETag",
    "Last-Modified",
    "Content-Encoding",
    "Vary",
    "Location",
    "Set-Cookie",
)

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


DIRECT_PROXY_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirectHandler())
NEXT_EDITOR_PROXY_TIMEOUT_SECONDS = 60


def _rewrite_location(location: str, upstream_base: str) -> str:
    proxy_base = "/django-admin/next-editor"
    duplicate_proxy_base = f"{proxy_base}{proxy_base}"
    normalized_upstream_base = upstream_base.rstrip("/")
    upstream_target = urlparse(normalized_upstream_base)
    location_target = urlparse(location)

    while duplicate_proxy_base in location:
        location = location.replace(duplicate_proxy_base, proxy_base)

    if location.startswith(f"{proxy_base}/") or location == proxy_base:
        return location

    if location.startswith(normalized_upstream_base):
        rewritten_suffix = location.removeprefix(normalized_upstream_base)
        if rewritten_suffix.startswith(f"{proxy_base}/") or rewritten_suffix == proxy_base:
            return rewritten_suffix
        return f"{proxy_base}{rewritten_suffix}"

    if (
        location_target.scheme in {"http", "https"}
        and upstream_target.port
        and location_target.port == upstream_target.port
        and location_target.path.startswith("/")
    ):
        suffix = location_target.path
        if location_target.query:
            suffix = f"{suffix}?{location_target.query}"
        if suffix.startswith(f"{proxy_base}/") or suffix == proxy_base:
            return suffix
        return f"{proxy_base}{suffix}"

    if location.startswith("/"):
        return f"{proxy_base}{location}"

    return location


@csrf_exempt
def next_editor_proxy(request, resource_path=""):
    if request.method not in {"GET", "HEAD", "POST", "PATCH"}:
        return HttpResponseNotAllowed(["GET", "HEAD", "POST", "PATCH"])

    upstream_base = getattr(settings, "NEXT_EDITOR_INTERNAL_URL", "http://editor-web:3000").rstrip("/")
    proxy_base = "/django-admin/next-editor"
    query_string = request.META.get("QUERY_STRING", "")
    normalized_resource_path = resource_path.lstrip("/")
    upstream_path = f"{proxy_base}/{normalized_resource_path}" if normalized_resource_path else f"{proxy_base}/"
    upstream_url = f"{upstream_base}{upstream_path}"
    if query_string:
        upstream_url = f"{upstream_url}?{query_string}"

    upstream_request = urllib.request.Request(
        upstream_url,
        data=request.body if request.method in {"POST", "PATCH"} else None,
        headers={
            "Accept": request.headers.get("Accept", "*/*"),
            "User-Agent": request.headers.get("User-Agent", "django-next-editor-proxy"),
            "Content-Type": request.headers.get("Content-Type", "application/octet-stream"),
            "Cookie": request.headers.get("Cookie", ""),
        },
        method=request.method,
    )

    try:
        with DIRECT_PROXY_OPENER.open(upstream_request, timeout=NEXT_EDITOR_PROXY_TIMEOUT_SECONDS) as upstream_response:
            body = b"" if request.method == "HEAD" else upstream_response.read()
            response = HttpResponse(body, status=upstream_response.status)
            for header_name in PROXY_RESPONSE_HEADERS:
                header_value = upstream_response.headers.get(header_name)
                if header_value:
                    if header_name == "Location":
                        header_value = _rewrite_location(header_value, upstream_base)
                    response[header_name] = header_value
            cookie_headers = upstream_response.headers.get_all("Set-Cookie", [])
            if cookie_headers:
                response["Set-Cookie"] = cookie_headers[-1]
            response["X-Frame-Options"] = "SAMEORIGIN"
            return response
    except urllib.error.HTTPError as exc:
        error_body = b"" if request.method == "HEAD" else exc.read()
        response = HttpResponse(error_body, status=exc.code)
        for header_name in PROXY_RESPONSE_HEADERS:
            header_value = exc.headers.get(header_name)
            if header_value:
                if header_name == "Location":
                    header_value = _rewrite_location(header_value, upstream_base)
                response[header_name] = header_value
        cookie_headers = exc.headers.get_all("Set-Cookie", [])
        if cookie_headers:
            response["Set-Cookie"] = cookie_headers[-1]
        response["X-Frame-Options"] = "SAMEORIGIN"
        return response
    except urllib.error.URLError:
        response = HttpResponse("Next.js 编辑器服务暂不可用。", status=503, content_type="text/plain; charset=utf-8")
        response["X-Frame-Options"] = "SAMEORIGIN"
        return response


def analytics_dashboard_view(request):
    """为 Django Admin 暴露稳定的 SEO 监控入口。"""
    return next_editor_proxy(request, resource_path="django-admin/analytics")
