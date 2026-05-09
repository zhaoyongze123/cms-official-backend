from fastapi import FastAPI

from ai_service.core.config import settings

app = FastAPI(
    title="AI SEO FastAPI Service",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": "ai-service",
        "provider": settings.ai_provider,
        "prompt_version": settings.ai_prompt_version,
    }
