# ai-service FastAPI 主工程

## 目标职责

`apps/ai-service/` 是当前 FastAPI AI/RAG 内部服务的主工程目录，用于承载模型调用、RAG 检索、建议生成、Patch 生成、Worker 支撑逻辑与健康检查。

## 当前结构

- `app/main.py`：FastAPI 入口
- `app/core/*`：鉴权、配置、错误、Graph、Provider、RAG 逻辑
- `app/cli.py`：RAG 命令入口
- `app/worker_stub.py`、`app/worker_support.py`：异步任务占位与 Django 集成
- `tests/`：FastAPI 与 RAG 契约测试
- `requirements/`：AI 服务依赖

## 基础验证

```bash
cd apps/ai-service
pytest
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
