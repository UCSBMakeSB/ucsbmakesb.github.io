import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("Next.js app and deployment configuration are present", () => {
  const root = new URL("../", import.meta.url);
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url)));
  assert.equal(config.buildCommand, "npm run build");
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.start, "next start");
  assert.equal(packageJson.scripts.build, "node scripts/build.mjs");
  assert.ok(packageJson.dependencies.next);
  assert.ok(existsSync(new URL("../app/layout.jsx", import.meta.url)));
  assert.ok(existsSync(new URL("../app/page.jsx", import.meta.url)));
  assert.ok(existsSync(new URL("../public/assets/homepage.png", import.meta.url)));
  assert.ok(existsSync(new URL("../public/assets/makesb-logo-v2.png", import.meta.url)));
  assert.ok(existsSync(new URL("../worker/index.js", import.meta.url)));
});
