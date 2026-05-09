from __future__ import annotations

import os
from dataclasses import dataclass


def _env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    ai_provider: str
    ai_model: str
    ai_prompt_version: str
    internal_api_token: str
    siliconflow_base_url: str
    siliconflow_api_key: str
    siliconflow_embedding_model: str
    siliconflow_rerank_model: str
    rag_provider: str
    rag_database_url: str
    rag_chunk_table: str
    rag_source_table: str
    rag_source_type: str
    rag_default_limit: int
    rag_candidate_limit: int
    rag_index_chunk_size: int
    rag_index_chunk_overlap: int
    rag_embedding_dimensions: int
    rag_enable_rerank: bool
    rag_force_mock: bool
    service_name: str
    enable_response_headers: bool

    @property
    def normalized_provider(self) -> str:
        provider = self.ai_provider.strip().lower()
        if provider in {"siliconflow", "silicon_flow"}:
            return "siliconflow"
        return "mock"


settings = Settings(
    ai_provider=os.getenv("AI_PROVIDER", "mock"),
    ai_model=os.getenv("AI_MODEL", "mock-reviewer"),
    ai_prompt_version=os.getenv("AI_PROMPT_VERSION", "v1"),
    internal_api_token=os.getenv("INTERNAL_API_TOKEN", ""),
    siliconflow_base_url=os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1"),
    siliconflow_api_key=os.getenv("SILICONFLOW_API_KEY", ""),
    siliconflow_embedding_model=os.getenv("SILICONFLOW_EMBEDDING_MODEL", "Qwen/Qwen3-Embedding-4B"),
    siliconflow_rerank_model=os.getenv("SILICONFLOW_RERANK_MODEL", "BAAI/bge-reranker-v2-m3"),
    rag_provider=os.getenv("RAG_PROVIDER", "auto"),
    rag_database_url=os.getenv("RAG_DATABASE_URL", os.getenv("DATABASE_URL", "")),
    rag_chunk_table=os.getenv("RAG_CHUNK_TABLE", "simple_cms_knowledgechunk"),
    rag_source_table=os.getenv("RAG_SOURCE_TABLE", "simple_cms_knowledgesource"),
    rag_source_type=os.getenv("RAG_SOURCE_TYPE", "article"),
    rag_default_limit=int(os.getenv("RAG_DEFAULT_LIMIT", "5")),
    rag_candidate_limit=int(os.getenv("RAG_CANDIDATE_LIMIT", "20")),
    rag_index_chunk_size=int(os.getenv("RAG_INDEX_CHUNK_SIZE", "1200")),
    rag_index_chunk_overlap=int(os.getenv("RAG_INDEX_CHUNK_OVERLAP", "120")),
    rag_embedding_dimensions=int(os.getenv("RAG_EMBEDDING_DIMENSIONS", "1536")),
    rag_enable_rerank=_env_bool("RAG_ENABLE_RERANK", "true"),
    rag_force_mock=_env_bool("RAG_FORCE_MOCK", "false"),
    service_name=os.getenv("SERVICE_NAME", "ai-service"),
    enable_response_headers=_env_bool("ENABLE_RESPONSE_HEADERS", "true"),
)
