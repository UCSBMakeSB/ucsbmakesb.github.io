import { cp, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";

const root = new URL("../", import.meta.url);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

await new Promise((resolve, reject) => {
  const child = spawn(npmCommand, ["exec", "next", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  child.on("error", reject);
  child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`next build exited with code ${code}`)));
});

await mkdir(new URL(".next/server-worker/", root), { recursive: true });
await cp(new URL("worker/index.js", root), new URL(".next/server-worker/index.js", root));
console.log("Built MakeSB Next.js site");
