import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const command = process.argv[2];

if (!command) {
  console.error("缺少 Next 命令参数。");
  process.exit(1);
}

const childEnv = { ...process.env };

// 某些本地运行环境会注入异常的 localStorage 实现，导致 Next dev overlay 在服务端抛错。
delete childEnv.NODE_OPTIONS;

const child = spawn(
  process.execPath,
  ["--no-experimental-webstorage", nextBin, command, "--hostname", "0.0.0.0", "--port", "3003"],
  {
    cwd: projectRoot,
    env: childEnv,
    stdio: "inherit",
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
