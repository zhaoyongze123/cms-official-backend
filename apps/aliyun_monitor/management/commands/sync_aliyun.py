import json
from datetime import datetime, timedelta, timezone as dt_timezone

from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.request import CommonRequest
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.sys_settings.models import SiteSetting
from apps.aliyun_monitor.models import DnsDomainStat, EcsInstanceSnapshot, EcsMetricPoint


_site_setting_cache = None


def _get_site_setting():
    global _site_setting_cache
    if _site_setting_cache is None:
        try:
            _site_setting_cache = SiteSetting.objects.first()
        except Exception:
            _site_setting_cache = None
    return _site_setting_cache


def _get_setting_override(name, default=""):
    mapping = {
        "ALIYUN_ACCESS_KEY_ID": "aliyun_access_key_id",
        "ALIYUN_ACCESS_KEY_SECRET": "aliyun_access_key_secret",
        "ALIYUN_REGION": "aliyun_region",
        "ALIYUN_DNS_REGION": "aliyun_dns_region",
        "ALIYUN_DNS_DOMAINS": "aliyun_dns_domains",
        "ALIYUN_CMS_NAMESPACE": "aliyun_cms_namespace",
        "ALIYUN_CMS_METRICS": "aliyun_cms_metrics",
        "ALIYUN_CMS_ENDPOINT": "aliyun_cms_endpoint",
    }
    setting = _get_site_setting()
    if not setting:
        return default
    field = mapping.get(name)
    if not field:
        return default
    value = getattr(setting, field, "")
    return value or default


def _env(name, default=""):
    override = _get_setting_override(name, default="")
    if override not in (None, ""):
        return override
    return getattr(settings, name, default)


def _make_client():
    access_key_id = _env("ALIYUN_ACCESS_KEY_ID")
    access_key_secret = _env("ALIYUN_ACCESS_KEY_SECRET")
    region = _env("ALIYUN_REGION", "cn-hangzhou")
    if not access_key_id or not access_key_secret or not region:
        raise CommandError("Missing ALIYUN_ACCESS_KEY_ID/ALIYUN_ACCESS_KEY_SECRET/ALIYUN_REGION")
    return AcsClient(access_key_id, access_key_secret, region)


def _request(client, domain, version, action, params, region_id=None):
    request = CommonRequest()
    request.set_accept_format("json")
    request.set_domain(domain)
    request.set_version(version)
    request.set_action_name(action)
    request.set_method("POST")
    if region_id:
        request.add_query_param("RegionId", region_id)
    for key, value in params.items():
        if value is None:
            continue
        request.add_query_param(key, value)
    response = client.do_action(request)
    payload = json.loads(response)
    if isinstance(payload, dict) and payload.get("Code"):
        code = str(payload.get("Code"))
        if code not in ("200", "OK", "Success"):
            raise CommandError(f"Aliyun API error: {payload.get('Code')}: {payload.get('Message')}")
    return payload


def _discover_regions(client):
    payload = _request(
        client,
        domain="ecs.aliyuncs.com",
        version="2014-05-26",
        action="DescribeRegions",
        params={},
        region_id=None,
    )
    regions = payload.get("Regions", {}).get("Region", [])
    results = []
    for r in regions:
        region_id = r.get("RegionId")
        if not region_id:
            continue
        endpoint = r.get("RegionEndpoint") or r.get("Endpoint") or f"ecs.{region_id}.aliyuncs.com"
        results.append({"id": region_id, "endpoint": endpoint})
    return results


def _discover_dns_domains(client):
    page_number = 1
    page_size = 50
    domains = []
    while True:
        payload = _request(
            client,
            domain="alidns.aliyuncs.com",
            version="2015-01-09",
            action="DescribeDomains",
            params={"PageNumber": page_number, "PageSize": page_size},
            region_id=None,
        )
        items = payload.get("Domains", {}).get("Domain", [])
        for item in items:
            name = item.get("DomainName")
            if name:
                domains.append(name)
        total = payload.get("TotalCount", len(domains))
        if page_number * page_size >= total:
            break
        page_number += 1
    return domains


def _parse_iso(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def sync_ecs_instances(client, region_id, endpoint=None):
    page_number = 1
    page_size = 100
    total_count = 0

    while True:
        payload = _request(
            client,
            domain=endpoint or f"ecs.{region_id}.aliyuncs.com",
            version="2014-05-26",
            action="DescribeInstances",
            params={"PageNumber": page_number, "PageSize": page_size},
            region_id=region_id,
        )

        instances = payload.get("Instances", {}).get("Instance", [])
        total_count = payload.get("TotalCount", total_count)

        for item in instances:
            public_ips = item.get("PublicIpAddress", {}).get("IpAddress", [])
            private_ips = item.get("VpcAttributes", {}).get("PrivateIpAddress", {}).get("IpAddress", [])
            EcsInstanceSnapshot.objects.update_or_create(
                instance_id=item.get("InstanceId", ""),
                defaults={
                    "instance_name": item.get("InstanceName", ""),
                    "status": item.get("Status", ""),
                    "instance_type": item.get("InstanceType", ""),
                    "cpu": item.get("Cpu"),
                    "memory": item.get("Memory"),
                    "public_ip": ",".join(public_ips),
                    "private_ip": ",".join(private_ips),
                    "region_id": item.get("RegionId", region_id),
                    "zone_id": item.get("ZoneId", ""),
                    "os_name": item.get("OSName", ""),
                    "expired_time": _parse_iso(item.get("ExpiredTime")),
                },
            )

        if page_number * page_size >= total_count:
            break
        page_number += 1


def sync_dns_stats(client, domain_names):
    if not domain_names:
        return
    end_time = datetime.now(dt_timezone.utc)
    start_time = end_time - timedelta(days=1)
    start_date = start_time.strftime("%Y-%m-%d")
    end_date = end_time.strftime("%Y-%m-%d")

    for domain in domain_names:
        payload = _request(
            client,
            domain="alidns.aliyuncs.com",
            version="2015-01-09",
            action="DescribeDomainStatistics",
            params={
                "DomainName": domain,
                "StartDate": start_date,
                "EndDate": end_date,
            },
            region_id=_env("ALIYUN_DNS_REGION", "cn-hangzhou"),
        )

        stats = payload.get("DomainStatistics", {}).get("DomainStatistic", [])
        if not stats:
            # Ensure domain is visible even if there is no traffic data.
            DnsDomainStat.objects.update_or_create(
                domain_name=domain,
                timestamp=end_time,
                defaults={"request_count": 0},
            )
            continue
        for item in stats:
            timestamp = _parse_iso(item.get("Timestamp"))
            if not timestamp:
                continue
            DnsDomainStat.objects.update_or_create(
                domain_name=domain,
                timestamp=timestamp,
                defaults={"request_count": int(item.get("RequestCount", 0))},
            )


def _metric_value(point):
    for key in ("Average", "Value", "value"):
        if key in point:
            return point.get(key)
    return None


def _is_invalid_metric_error(exc):
    msg = str(exc)
    return "metric(" in msg or "metric|Metric" in msg or "not exist" in msg


def sync_ecs_metrics(client, region_id, instance_ids):
    if not instance_ids:
        return 0, set()

    end_time = datetime.now(dt_timezone.utc)
    start_time = end_time - timedelta(hours=24)
    start_iso = start_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_iso = end_time.strftime("%Y-%m-%dT%H:%M:%SZ")

    metrics = _env("ALIYUN_CMS_METRICS", "CPUUtilization,InternetIn,InternetOut")
    cms_endpoint = _env("ALIYUN_CMS_ENDPOINT", "").strip()
    metric_list = [m.strip() for m in metrics.split(",") if m.strip()]
    total_points = 0
    invalid_metrics = set()
    periods = (60, 300)

    for instance_id in instance_ids:
        for metric in metric_list:
            if metric in invalid_metrics:
                continue
            datapoints = []
            used_period = None
            for period in periods:
                try:
                    payload = _request(
                        client,
                        domain=cms_endpoint or f"metrics.{region_id}.aliyuncs.com",
                        version="2019-01-01",
                        action="DescribeMetricList",
                        params={
                            "Namespace": _env("ALIYUN_CMS_NAMESPACE", "acs_ecs_dashboard"),
                            "MetricName": metric,
                            "Period": period,
                            "StartTime": start_iso,
                            "EndTime": end_iso,
                            "Dimensions": json.dumps({"instanceId": instance_id}),
                        },
                        region_id=region_id,
                    )
                except CommandError as exc:
                    if _is_invalid_metric_error(exc):
                        invalid_metrics.add(metric)
                        payload = {"Datapoints": "[]"}
                        break
                    raise

                datapoints_raw = payload.get("Datapoints", "[]")
                try:
                    datapoints = json.loads(datapoints_raw)
                except (TypeError, json.JSONDecodeError):
                    datapoints = []
                if datapoints:
                    used_period = period
                    break

            for point in datapoints:
                ts = point.get("Timestamp") or point.get("timestamp") or point.get("TimeStamp")
                if ts is None:
                    continue
                timestamp = datetime.fromtimestamp(ts / 1000, tz=dt_timezone.utc)
                EcsMetricPoint.objects.update_or_create(
                    instance_id=instance_id,
                    metric_name=metric,
                    timestamp=timestamp,
                    defaults={
                        "value": _metric_value(point),
                        "period": used_period or periods[-1],
                        "namespace": _env("ALIYUN_CMS_NAMESPACE", "acs_ecs_dashboard"),
                        "region_id": region_id,
                    },
                )
                total_points += 1
    return total_points, invalid_metrics


class Command(BaseCommand):
    help = "Sync Aliyun ECS, DNS statistics, and CloudMonitor metrics"

    def handle(self, *args, **options):
        status = "成功"
        messages = []
        total_metric_points = 0
        invalid_metrics = set()

        client = _make_client()

        region_setting = _env("ALIYUN_REGION", "").strip()
        if region_setting:
            region_list = [{"id": region_setting, "endpoint": f"ecs.{region_setting}.aliyuncs.com"}]
        else:
            region_list = _discover_regions(client)
            if not region_list:
                raise CommandError("No regions discovered from Aliyun ECS API")

        dns_domains = _env("ALIYUN_DNS_DOMAINS", "")
        domain_list = [d.strip() for d in dns_domains.split(",") if d.strip()]
        if not domain_list:
            domain_list = _discover_dns_domains(client)

        self.stdout.write("正在同步 ECS 实例...")
        for region in region_list:
            sync_ecs_instances(client, region["id"], region["endpoint"])

        self.stdout.write("正在同步 DNS 统计...")
        sync_dns_stats(client, domain_list)

        self.stdout.write("正在同步 ECS 指标...")
        for region in region_list:
            instance_ids = list(
                EcsInstanceSnapshot.objects.filter(region_id=region["id"]).values_list("instance_id", flat=True)
            )
            try:
                points, invalid = sync_ecs_metrics(client, region["id"], instance_ids)
                total_metric_points += points
                invalid_metrics |= invalid
            except Exception as exc:
                status = "失败"
                messages.append(str(exc))

        if invalid_metrics:
            status = "部分成功"
            messages.append("已跳过无效指标：" + ", ".join(sorted(invalid_metrics)))

        if total_metric_points == 0:
            status = "部分成功"
            messages.append("最近24小时云监控未返回指标点")
        else:
            self.stdout.write(f"云监控指标点：{total_metric_points}")

        setting = _get_site_setting()
        if setting:
            setting.aliyun_last_sync_at = timezone.now()
            setting.aliyun_last_sync_status = status
            setting.aliyun_last_sync_message = " | ".join(messages)
            setting.save(update_fields=[
                "aliyun_last_sync_at",
                "aliyun_last_sync_status",
                "aliyun_last_sync_message",
            ])

        self.stdout.write(self.style.SUCCESS("阿里云同步完成"))

