import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("production build contains every local page asset and Vercel serves the client", () => {
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    cwd: new URL("../", import.meta.url),
  });
  const root = new URL("../dist/client/", import.meta.url);
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url)));
  assert.equal(config.outputDirectory, "dist/client");
  assert.equal(config.buildCommand, "npm run build");
  assert.ok(existsSync(new URL("../dist/server/index.js", import.meta.url)));

  for (const page of ["index.html", "team/index.html", "styles.css", "team.css"]) {
    const file = new URL(page, root);
    const source = readFileSync(file, "utf8");
    const references = [
      ...source.matchAll(/(?:src|href|content)="([^"\s]+)"/g),
      ...source.matchAll(/url\(["']?([^\s)"']+)["']?\)/g),
    ];
    for (const [, reference] of references) {
      if (!/\.(?:png|jpe?g|webp|svg|css|js)(?:[?#]|$)/i.test(reference)) continue;
      if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) continue;
      const asset = reference.startsWith("/")
        ? new URL(reference.slice(1), root)
        : new URL(reference, file);
      assert.ok(existsSync(asset), `${page} references missing asset ${reference}`);
    }
  }
});
