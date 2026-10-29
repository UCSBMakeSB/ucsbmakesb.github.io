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

function run(args) {
  return spawnSync(process.execPath, args, { stdio: "inherit" }).status ?? 1;
}

if (suite === "e2e") {
  // One file at a time: each live file wipes all e2e-* test data when it
  // starts and ends, so running them in parallel makes them delete each
  // other's users, rows and files.
  let failed = false;
  for (const file of filesIn("tests/e2e", ".e2e.mjs")) {
    if (run(["--test", file]) !== 0) failed = true;
  }
  process.exit(failed ? 1 : 0);
} else if (suite === "unit") {
  process.exit(
    run([
      "--import",
      "./tests/support/register-fakes.mjs",
      "--test",
      ...filesIn("tests", ".test.mjs"),
      ...filesIn("tests/routes", ".test.mjs"),
    ]),
  );
} else {
  console.error(`Unknown suite "${suite}". Use "unit" or "e2e".`);
  process.exit(2);
}
