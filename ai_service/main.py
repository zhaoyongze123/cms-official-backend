from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from ai_service.core.auth import validate_internal_token
from ai_service.core.config import settings
from ai_service.core.errors import ServiceError, http_exception_handler, service_error_handler, unexpected_exception_handler
from ai_service.core.graph import build_review_graph
from ai_service.core.models import build_trace_id
from ai_service.core.providers import get_provider

app = FastAPI(
    title="AI SEO FastAPI Service",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_exception_handler(ServiceError, service_error_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, unexpected_exception_handler)


@app.middleware("http")
async def add_trace_id(request: Request, call_next):
    trace_id = request.headers.get("X-Trace-Id") or build_trace_id()
    request.state.trace_id = trace_id
    if request.method in {"POST", "PUT", "PATCH"}:
        try:
            request.state.body = await request.json()
        except Exception:
            request.state.body = {}
    else:
        request.state.body = {}
    response = await call_next(request)
    response.headers["X-Trace-Id"] = trace_id
    return response


@app.get("/health")
def health(request: Request) -> dict[str, object]:
    return {
        "status": "ok",
        "service": settings.service_name,
        "provider": settings.normalized_provider,
        "prompt_version": settings.ai_prompt_version,
        "trace_id": _trace_id(request),
    }


def _trace_id(request: Request) -> str:
    return getattr(request.state, "trace_id", build_trace_id())


def _base_response(request: Request, payload: dict[str, Any]) -> dict[str, Any]:
    return {"trace_id": _trace_id(request), **payload}


def _body(request: Request) -> dict[str, Any]:
    body = request.state.body
    if not isinstance(body, dict):
        raise ServiceError(
            status_code=422,
            code="invalid_request_body",
            message="请求体必须是 JSON 对象",
            details={"received_type": body.__class__.__name__},
        )
    return body


def _article_id(body: dict[str, Any]) -> int:
    article_id = body.get("article_id")
    if article_id in {None, ""}:
        raise ServiceError(
            status_code=422,
            code="missing_article_id",
            message="请求体缺少 article_id",
            details={"field": "article_id"},
        )
    try:
        return int(article_id)
    except (TypeError, ValueError) as exc:
        raise ServiceError(
            status_code=422,
            code="invalid_article_id",
            message="article_id 必须是整数",
            details={"field": "article_id", "value": article_id},
        ) from exc


@app.post("/internal/ai/review-article")
def review_article(request: Request, _: str = Depends(validate_internal_token)) -> dict[str, Any]:
    body = _body(request)
    article_id = _article_id(body)
    graph = build_review_graph()
    run, suggestions = graph.invoke(article_id=article_id, payload=body, trace_id=_trace_id(request))
    return _base_response(request, {"run": run, "suggestions": suggestions, "provider": graph.provider.name})


@app.post("/internal/ai/generate-metadata")
def generate_metadata(request: Request, _: str = Depends(validate_internal_token)) -> dict[str, Any]:
    body = _body(request)
    article_id = _article_id(body)
    payload = get_provider().generate_metadata(article_id=article_id, payload=body, trace_id=_trace_id(request))
    return _base_response(request, payload)


@app.post("/internal/ai/generate-faq")
def generate_faq(request: Request, _: str = Depends(validate_internal_token)) -> dict[str, Any]:
    body = _body(request)
    article_id = _article_id(body)
    payload = get_provider().generate_faq(article_id=article_id, payload=body, trace_id=_trace_id(request))
    return _base_response(request, payload)


@app.post("/internal/ai/recommend-internal-links")
def recommend_internal_links(request: Request, _: str = Depends(validate_internal_token)) -> dict[str, Any]:
    body = _body(request)
    article_id = _article_id(body)
    payload = get_provider().recommend_internal_links(article_id=article_id, payload=body, trace_id=_trace_id(request))
    return _base_response(request, payload)


@app.post("/internal/ai/generate-alt")
def generate_alt(request: Request, _: str = Depends(validate_internal_token)) -> dict[str, Any]:
    body = _body(request)
    article_id = _article_id(body)
    payload = get_provider().generate_alt(article_id=article_id, payload=body, trace_id=_trace_id(request))
    return _base_response(request, payload)


@app.post("/internal/rag/reindex-article")
def reindex_article(request: Request, _: str = Depends(validate_internal_token)) -> JSONResponse:
    body = _body(request)
    article_id = _article_id(body)
    payload = get_provider().reindex_article(article_id=article_id, payload=body, trace_id=_trace_id(request))
    return JSONResponse(status_code=202, content=_base_response(request, payload))


@app.post("/internal/rag/search")
def search_rag(request: Request, _: str = Depends(validate_internal_token)) -> dict[str, Any]:
    body = request.state.body
    payload = get_provider().search_rag(payload=body, trace_id=_trace_id(request))
    return _base_response(request, payload.to_dict())
