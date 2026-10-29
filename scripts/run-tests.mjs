// Portable test runner (no shell globbing, so it behaves the same on Windows,
// macOS and Linux, and on every supported Node version).
//
//   npm test           route-level + unit tests (fast, no network, no secrets)
//   npm run test:e2e   live suite against a dedicated TEST Supabase project
//                      (see docs/auth-testing.md before running this one)
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

const suite = process.argv[2] ?? "unit";

function filesIn(dir, suffix) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(suffix))
    .sort()
    .map((name) => `${dir}/${name}`);
}

let args;
if (suite === "e2e") {
  args = ["--test", ...filesIn("tests/e2e", ".e2e.mjs")];
} else if (suite === "unit") {
  args = [
    "--import",
    "./tests/support/register-fakes.mjs",
    "--test",
    ...filesIn("tests", ".test.mjs"),
    ...filesIn("tests/routes", ".test.mjs"),
  ];
} else {
  console.error(`Unknown suite "${suite}". Use "unit" or "e2e".`);
  process.exit(2);
}

const result = spawnSync(process.execPath, args, { stdio: "inherit" });
process.exit(result.status ?? 1);
