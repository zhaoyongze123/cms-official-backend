import os
import time


def main() -> None:
    provider = os.getenv("AI_PROVIDER", "mock")
    interval = int(os.getenv("WORKER_HEARTBEAT_SECONDS", "30"))
    print(f"[worker] 启动 foundation worker，占位 provider={provider}", flush=True)

    while True:
        print("[worker] foundation heartbeat", flush=True)
        time.sleep(interval)


if __name__ == "__main__":
    main()
