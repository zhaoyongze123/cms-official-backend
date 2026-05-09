from __future__ import annotations

from dataclasses import replace
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

import ai_service.core.auth as auth_module
import ai_service.core.providers as providers_module
import ai_service.main as main_module
from ai_service.core.config import settings as base_settings


INTERNAL_TOKEN = "unit-test-internal-token"


@pytest.fixture()
def configured_client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    test_settings = replace(
        base_settings,
        ai_provider="mock",
        ai_model="mock-reviewer-test",
        ai_prompt_version="v-test",
        internal_api_token=INTERNAL_TOKEN,
    )
    monkeypatch.setattr(main_module, "settings", test_settings)
    monkeypatch.setattr(auth_module, "settings", test_settings)
    monkeypatch.setattr(providers_module, "settings", test_settings)
    return TestClient(main_module.app)


def test_health_endpoint_returns_service_context_and_trace_id(configured_client: TestClient) -> None:
    response = configured_client.get("/health")

    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "ok"
    assert body["service"] == "ai-service"
    assert body["provider"] == "mock"
    assert body["prompt_version"] == "v-test"
    assert body["trace_id"].startswith("trace_")


@pytest.mark.parametrize(
    "path,payload,expected_status",
    [
        ("/internal/ai/review-article", {"article_id": 88, "title": "测试文章"}, 200),
        ("/internal/ai/generate-metadata", {"article_id": 88, "title": "测试文章"}, 200),
        ("/internal/ai/generate-faq", {"article_id": 88, "title": "测试文章"}, 200),
        ("/internal/ai/recommend-internal-links", {"article_id": 88, "title": "测试文章"}, 200),
        ("/internal/ai/generate-alt", {"article_id": 88, "title": "测试文章"}, 200),
        ("/internal/rag/reindex-article", {"article_id": 88}, 202),
        ("/internal/rag/search", {"query": "测试查询", "limit": 3}, 200),
    ],
)
def test_internal_routes_require_x_internal_token(
    configured_client: TestClient,
    path: str,
    payload: dict[str, Any],
    expected_status: int,
) -> None:
    unauthorized = configured_client.post(path, json=payload)
    assert unauthorized.status_code == 401
    assert unauthorized.json() == {
        "trace_id": unauthorized.json()["trace_id"],
        "error": {
            "code": "invalid_internal_token",
            "message": "内部服务令牌无效",
            "details": {},
        },
    }

    authorized = configured_client.post(path, json=payload, headers={"X-Internal-Token": INTERNAL_TOKEN})
    assert authorized.status_code == expected_status
    assert authorized.json()["trace_id"].startswith("trace_")


def test_review_article_returns_run_and_suggestions(configured_client: TestClient) -> None:
    response = configured_client.post(
        "/internal/ai/review-article",
        json={"article_id": 123, "title": "SEO 审核"},
        headers={"X-Internal-Token": INTERNAL_TOKEN},
    )

    body = response.json()
    assert response.status_code == 200
    assert body["trace_id"].startswith("trace_")

    run = body["run"]
    assert run["schema_version"] == "v1"
    assert run["article_id"] == 123
    assert run["status"] == "completed"
    assert run["provider"] == "mock"
    assert run["model"] == "mock-reviewer-test"
    assert run["prompt_version"] == "v-test"
    assert run["token_usage"] == {"prompt_tokens": 128, "completion_tokens": 64, "total_tokens": 192}
    assert run["created_at"].endswith("Z")
    assert run["completed_at"].endswith("Z")

    suggestions = body["suggestions"]
    assert len(suggestions) == 1
    suggestion = suggestions[0]
    assert suggestion["schema_version"] == "v1"
    assert suggestion["article_id"] == 123
    assert suggestion["type"] == "metadata"
    assert suggestion["status"] == "pending"
    assert suggestion["severity"] == "medium"
    assert suggestion["patches"]
    assert suggestion["source_chunks"]


def test_generate_metadata_returns_seo_context(configured_client: TestClient) -> None:
    response = configured_client.post(
        "/internal/ai/generate-metadata",
        json={"article_id": 88, "title": "测试文章"},
        headers={"X-Internal-Token": INTERNAL_TOKEN},
    )

    body = response.json()
    assert response.status_code == 200
    assert body["trace_id"].startswith("trace_")
    assert body["provider"] == "mock"
    assert body["model"] == "mock-reviewer-test"

    seo_context = body["seo_context"]
    assert seo_context["seo_context_schema_version"] == "v1"
    assert seo_context["title"] == "测试文章"
    assert seo_context["description"]
    assert seo_context["canonical"]
    assert seo_context["robots"] == "index,follow"
    assert seo_context["og"]["type"] == "article"
    assert seo_context["json_ld"]
    assert seo_context["twitter"]["card"] == "summary_large_image"


def test_generate_faq_returns_faq_items(configured_client: TestClient) -> None:
    response = configured_client.post(
        "/internal/ai/generate-faq",
        json={"article_id": 88, "title": "测试文章"},
        headers={"X-Internal-Token": INTERNAL_TOKEN},
    )

    body = response.json()
    assert response.status_code == 200
    assert body["trace_id"].startswith("trace_")
    assert body["article_id"] == 88
    assert body["faq"]
    assert body["faq"][0]["question"]
    assert body["faq"][0]["answer"]


def test_recommend_internal_links_returns_links(configured_client: TestClient) -> None:
    response = configured_client.post(
        "/internal/ai/recommend-internal-links",
        json={"article_id": 88, "title": "测试文章"},
        headers={"X-Internal-Token": INTERNAL_TOKEN},
    )

    body = response.json()
    assert response.status_code == 200
    assert body["trace_id"].startswith("trace_")
    assert body["article_id"] == 88
    assert body["links"]
    assert body["links"][0]["title"]
    assert body["links"][0]["url"].startswith("/")


def test_generate_alt_returns_suggestion_payload(configured_client: TestClient) -> None:
    response = configured_client.post(
        "/internal/ai/generate-alt",
        json={
            "article_id": 88,
            "image_url": "https://example.com/image.png",
            "alt_text": "测试图片的替代文本",
        },
        headers={"X-Internal-Token": INTERNAL_TOKEN},
    )

    body = response.json()
    assert response.status_code == 200
    assert body["trace_id"].startswith("trace_")
    assert body["provider"] == "mock"
    assert body["model"] == "mock-reviewer-test"

    suggestion = body["suggestion"]
    assert suggestion["type"] == "alt_text"
    assert suggestion["status"] == "pending"
    assert suggestion["severity"] == "low"
    assert suggestion["patches"][0]["operation"] == "alt_text"
    assert suggestion["patches"][0]["target_block_id"] == "blk_image_1"
    assert suggestion["source_chunks"][0]["source_type"] == "article"


def test_rag_search_returns_chunks(configured_client: TestClient) -> None:
    response = configured_client.post(
        "/internal/rag/search",
        json={"query": "测试查询", "limit": 3},
        headers={"X-Internal-Token": INTERNAL_TOKEN},
    )

    body = response.json()
    assert response.status_code == 200
    assert body["trace_id"].startswith("trace_")
    assert body["rag_schema_version"] == "v1"
    assert body["query"] == "测试查询"
    assert 1 <= len(body["chunks"]) <= 3
    assert body["chunks"][0]["source_type"] == "article"
    assert body["chunks"][0]["text"]


def test_reindex_article_returns_accepted_status(configured_client: TestClient) -> None:
    response = configured_client.post(
        "/internal/rag/reindex-article",
        json={"article_id": 88},
        headers={"X-Internal-Token": INTERNAL_TOKEN},
    )

    body = response.json()
    assert response.status_code == 202
    assert body["trace_id"].startswith("trace_")
    assert body["article_id"] == 88
    assert body["status"] == "accepted"
    assert body["job_id"] == "rag_reindex_88"


def test_invalid_article_id_returns_unified_error_payload(configured_client: TestClient) -> None:
    response = configured_client.post(
        "/internal/ai/review-article",
        json={"title": "缺少 article_id"},
        headers={"X-Internal-Token": INTERNAL_TOKEN},
    )

    body = response.json()
    assert response.status_code == 422
    assert body["error"]["code"] == "missing_article_id"
    assert body["error"]["message"] == "请求体缺少 article_id"
    assert body["error"]["details"] == {"field": "article_id"}
    assert body["trace_id"].startswith("trace_")


def test_contract_openapi_file_still_contains_ai_service_paths() -> None:
    contract_text = Path("contracts/openapi.ai-service.yaml").read_text(encoding="utf-8")

    for path in [
        "/health",
        "/internal/ai/review-article",
        "/internal/ai/generate-metadata",
        "/internal/ai/generate-faq",
        "/internal/ai/recommend-internal-links",
        "/internal/ai/generate-alt",
        "/internal/rag/reindex-article",
        "/internal/rag/search",
    ]:
        assert path in contract_text

    assert "name: X-Internal-Token" in contract_text
    assert "type: apiKey" in contract_text


def test_runtime_openapi_exposes_all_internal_paths(configured_client: TestClient) -> None:
    openapi = main_module.app.openapi()
    for path in [
        "/health",
        "/internal/ai/review-article",
        "/internal/ai/generate-metadata",
        "/internal/ai/generate-faq",
        "/internal/ai/recommend-internal-links",
        "/internal/ai/generate-alt",
        "/internal/rag/reindex-article",
        "/internal/rag/search",
    ]:
        assert path in openapi["paths"]
