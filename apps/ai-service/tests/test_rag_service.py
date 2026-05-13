from __future__ import annotations

from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

import app.cli as cli_module
import app.core.auth as auth_module
import app.core.providers as providers_module
import app.core.rag as rag_module
import app.main as main_module
from app.core.config import settings as base_settings
from app.core.models import RagSearchResponse


@pytest.fixture()
def configured_rag_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    test_settings = replace(
        base_settings,
        ai_provider="mock",
        ai_model="mock-reviewer-test",
        ai_prompt_version="v-test",
        internal_api_token="unit-test-internal-token",
        siliconflow_api_key="",
        rag_provider="mock",
    )
    monkeypatch.setattr(main_module, "settings", test_settings)
    monkeypatch.setattr(auth_module, "settings", test_settings)
    monkeypatch.setattr(providers_module, "settings", test_settings)
    monkeypatch.setattr(rag_module, "settings", test_settings)
    monkeypatch.setattr(cli_module, "get_provider", lambda: rag_module.build_rag_service())
    monkeypatch.setattr(cli_module, "build_trace_id", lambda: "trace_cli")


def test_mock_rag_service_returns_contract_compatible_chunks(configured_rag_settings: None) -> None:
    service = rag_module.build_rag_service()

    response = service.search_rag(payload={"query": "测试查询", "limit": 2}, trace_id="trace_test")

    assert isinstance(response, RagSearchResponse)
    assert response.rag_schema_version == "v1"
    assert response.query == "测试查询"
    assert len(response.chunks) == 2
    assert response.chunks[0].metadata["provider"] == "mock"


def test_mock_rag_indexer_uses_payload_content_for_chunk_count(configured_rag_settings: None) -> None:
    service = rag_module.build_rag_service()

    result = service.reindex_article(
        article_id=88,
        payload={
            "title": "测试文章",
            "summary": "这是摘要。",
            "content": "第一段内容。第二段内容。",
            "url": "/articles/88/",
        },
        trace_id="trace_test",
    )

    assert result["status"] == "accepted"
    assert result["job_id"] == "rag_reindex_88"
    assert result["chunk_count"] >= 1


def test_cli_search_outputs_json(configured_rag_settings: None, capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = cli_module.main(["search", "--query", "测试查询", "--limit", "2"])

    captured = capsys.readouterr()
    body = captured.out.strip()
    assert exit_code == 0
    assert '"rag_schema_version": "v1"' in body
    assert '"query": "测试查询"' in body
    assert '"provider": "mock"' in body


def test_cli_reindex_outputs_json(configured_rag_settings: None, capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = cli_module.main(
        [
            "reindex",
            "--article-id",
            "88",
            "--title",
            "测试文章",
            "--summary",
            "这是摘要。",
            "--content",
            "第一段。第二段。",
            "--url",
            "/articles/88/",
        ]
    )

    captured = capsys.readouterr()
    body = captured.out.strip()
    assert exit_code == 0
    assert '"job_id": "rag_reindex_88"' in body
    assert '"status": "accepted"' in body


@pytest.fixture()
def configured_client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    test_settings = replace(
        base_settings,
        ai_provider="mock",
        ai_model="mock-reviewer-test",
        ai_prompt_version="v-test",
        internal_api_token="unit-test-internal-token",
        siliconflow_api_key="",
        rag_provider="mock",
    )
    monkeypatch.setattr(main_module, "settings", test_settings)
    monkeypatch.setattr(auth_module, "settings", test_settings)
    monkeypatch.setattr(providers_module, "settings", test_settings)
    monkeypatch.setattr(rag_module, "settings", test_settings)
    return TestClient(main_module.app)


def test_internal_rag_search_still_returns_contract_payload(configured_client: TestClient) -> None:
    response = configured_client.post(
        "/internal/rag/search",
        json={"query": "测试查询", "limit": 2},
        headers={"X-Internal-Token": "unit-test-internal-token"},
    )

    body = response.json()
    assert response.status_code == 200
    assert body["rag_schema_version"] == "v1"
    assert body["query"] == "测试查询"
    assert len(body["chunks"]) == 2

