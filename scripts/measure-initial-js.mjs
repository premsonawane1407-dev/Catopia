// Measures the JavaScript a page loads up front (the script tags in its server-rendered HTML),
// raw and gzip-compressed. Used to prove a feature does not add weight to pages that do not use it.
// Usage: node scripts/measure-initial-js.mjs http://localhost:3100 /community-preview
import { gzipSync } from "node:zlib";

const [base = "http://localhost:3100", route = "/community-preview"] = process.argv.slice(2);

const html = await (await fetch(base + route)).text();
const srcs = new Set();
for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) srcs.add(m[1]);
for (const m of html.matchAll(/<link[^>]+rel="preload"[^>]+as="script"[^>]+href="([^"]+)"/g)) srcs.add(m[1]);
for (const m of html.matchAll(/<link[^>]+href="([^"]+\.js[^"]*)"[^>]+as="script"/g)) srcs.add(m[1]);

const files = [];
for (const src of [...srcs].sort()) {
  const url = new URL(src, base).toString();
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  files.push({ src, raw: buf.length, gzip: gzipSync(buf, { level: 6 }).length });
}
const totalRaw = files.reduce((a, f) => a + f.raw, 0);
const totalGzip = files.reduce((a, f) => a + f.gzip, 0);
console.log(JSON.stringify({ route, scriptCount: files.length, totalRaw, totalGzip, files }, null, 2));
