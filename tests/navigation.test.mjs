import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("../navigation.js", import.meta.url), "utf8");

for (const type of ["reload", "navigate", "back_forward"]) {
  test(`${type}: only refresh clears the section and scrolls to the top`, () => {
    let onLoad;
    let replacement;
    let scroll;
    const history = {
      state: { saved: true },
      scrollRestoration: "auto",
      replaceState(state, title, url) { replacement = { state, url }; },
    };
    runInNewContext(source, {
      performance: { getEntriesByType: () => [{ type }] },
      history,
      location: { hash: "#team", pathname: "/", search: "?preview=1" },
      window: {
        addEventListener(event, callback) { assert.equal(event, "load"); onLoad = callback; },
        scrollTo(options) { scroll = options; },
      },
    });
    if (type === "reload") {
      assert.equal(history.scrollRestoration, "manual");
      assert.equal(replacement.url, "/?preview=1");
      assert.equal(replacement.state, history.state);
      onLoad();
      assert.equal(scroll.top, 0);
      assert.equal(scroll.behavior, "instant");
      assert.equal(history.scrollRestoration, "auto");
    } else {
      assert.equal(onLoad, undefined);
      assert.equal(replacement, undefined);
      assert.equal(history.scrollRestoration, "auto");
    }
  });
}
