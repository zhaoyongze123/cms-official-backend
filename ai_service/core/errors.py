from __future__ import annotations

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from ai_service.core.models import ErrorPayload, build_trace_id


class ServiceError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: dict | None = None) -> None:
        self.status_code = status_code
        self.payload = ErrorPayload(code=code, message=message, details=details or {})
        super().__init__(message)


def build_error_response(trace_id: str, error: ErrorPayload, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "trace_id": trace_id,
            "error": error.to_dict(),
        },
    )


async def service_error_handler(request: Request, exc: ServiceError) -> JSONResponse:
    trace_id = getattr(request.state, "trace_id", build_trace_id())
    return build_error_response(trace_id=trace_id, error=exc.payload, status_code=exc.status_code)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    trace_id = getattr(request.state, "trace_id", build_trace_id())
    message = exc.detail if isinstance(exc.detail, str) else "请求处理失败"
    error = ErrorPayload(
        code="http_error",
        message=message,
        details={"status_code": exc.status_code, "detail": exc.detail},
    )
    return build_error_response(trace_id=trace_id, error=error, status_code=exc.status_code)


async def unexpected_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    trace_id = getattr(request.state, "trace_id", build_trace_id())
    error = ErrorPayload(
        code="internal_server_error",
        message="服务内部错误",
        details={"exception_type": exc.__class__.__name__},
    )
    return build_error_response(trace_id=trace_id, error=error, status_code=500)
