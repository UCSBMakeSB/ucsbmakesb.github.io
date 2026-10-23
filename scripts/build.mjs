import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const nextCommand = fileURLToPath(new URL("node_modules/next/dist/bin/next", root));

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [nextCommand, "build"], {
    cwd: rootPath,
    stdio: "inherit",
    shell: false,
  });
  child.on("error", reject);
  child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`next build exited with code ${code}`)));
});

console.log("Built MakeSB Next.js site");
