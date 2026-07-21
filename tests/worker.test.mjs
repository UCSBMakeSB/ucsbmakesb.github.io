import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/index.js";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

function makeEnvironment() {
  return {
    ASSETS: {
      async fetch(request) {
        const pathname = new URL(request.url).pathname;

        if (pathname === "/index.html") {
          return new Response(html, {
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }

        return new Response("Not found", { status: 404 });
      },
    },
  };
}

test("serves the homepage with an absolute social image URL", async () => {
  const response = await worker.fetch(
    new Request("https://makesb.test/"),
    makeEnvironment(),
  );
  const responseHtml = await response.text();

  assert.equal(response.status, 200);
  assert.match(
    responseHtml,
    /content="https:\/\/makesb\.test\/assets\/makesb-social-card\.jpg"/,
  );
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("returns 405 for write requests", async () => {
  const response = await worker.fetch(
    new Request("https://makesb.test/", { method: "POST" }),
    makeEnvironment(),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});
