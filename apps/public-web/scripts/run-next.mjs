import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const publicWebPort = "9303";
const maxOldSpaceSize = process.env.NEXT_NODE_MAX_OLD_SPACE_SIZE;

const command = process.argv[2];

if (!command) {
  console.error("缺少 Next 命令参数。");
  process.exit(1);
}

const childEnv = { ...process.env };

// 某些本地运行环境会注入异常的 localStorage 实现，导致 Next dev overlay 在服务端抛错。
delete childEnv.NODE_OPTIONS;

const nodeArgs = ["--no-experimental-webstorage"];
if (maxOldSpaceSize) {
  nodeArgs.push(`--max-old-space-size=${maxOldSpaceSize}`);
}

const child = spawn(
  process.execPath,
  [...nodeArgs, nextBin, command, "--hostname", "0.0.0.0", "--port", publicWebPort],
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
