// Loaded with `node --import ./tests/support/register-fakes.mjs --test ...`
// Requires Node 20.6 or newer.
import { register } from "node:module";

register("./fake-loader.mjs", import.meta.url);
