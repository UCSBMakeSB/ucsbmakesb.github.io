import { cp, mkdir, rm } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);
await rm(dist, { recursive: true, force: true });
await mkdir(new URL("server/", dist), { recursive: true });
await mkdir(new URL("client/", dist), { recursive: true });
await cp(new URL("worker/index.js", root), new URL("server/index.js", dist));
for (const path of ["index.html", "styles.css", "faq-animation.js", "team-home.js", "team.css", "team.js", "team", "assets"]) {
  await cp(new URL(path, root), new URL(`client/${path}`, dist), { recursive: true });
}
console.log("Built MakeSB site in dist (static files: dist/client)");
