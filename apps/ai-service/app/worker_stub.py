from __future__ import annotations

import os
import time

def main() -> None:
    from app.worker_support import setup_django

    setup_django()
    from cms_apps.ai_reviews.services.tasks import AiTaskMessage, consume_review_task, mark_review_run_failed, pop_task

    provider = os.getenv("AI_PROVIDER", "mock")
    interval = int(os.getenv("WORKER_HEARTBEAT_SECONDS", "30"))
    print(f"[worker] 启动 AI worker provider={provider}", flush=True)

    while True:
        try:
            task = pop_task(timeout_seconds=interval)
            if task is None:
                print("[worker] heartbeat idle", flush=True)
                continue

            print(f"[worker] consume task type={task.task_type} run_id={task.run_id} article_id={task.article_id}", flush=True)
            if task.task_type == "review_article":
                consume_review_task(task)
                print(f"[worker] completed run_id={task.run_id}", flush=True)
                continue

            mark_review_run_failed(
                task.run_id,
                error_message=f"未知任务类型：{task.task_type}",
                code="unsupported_task_type",
                details={"task_type": task.task_type},
            )
        except Exception as exc:
            if "task" in locals() and isinstance(task, AiTaskMessage):
                try:
                    mark_review_run_failed(
                        task.run_id,
                        error_message=str(exc),
                        code="worker_execution_error",
                        details={"task_type": task.task_type},
                    )
                except Exception as mark_error:
                    print(f"[worker] drop task run_id={task.run_id} because mark failed: {mark_error}", flush=True)
            print(f"[worker] error {exc}", flush=True)
            continue


if __name__ == "__main__":
    main()
