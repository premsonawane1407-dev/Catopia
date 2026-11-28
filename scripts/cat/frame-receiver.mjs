// A tiny localhost-only receiver for review captures: the running game posts the frames it draws (cropped around the
// cat) and this saves them as PNG files, so they can be assembled into animations. Nothing leaves this machine.
// Usage: node scripts/cat/frame-receiver.mjs <folder> [port]
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2] ?? "capture");
const port = Number(process.argv[3] ?? 5055);
mkdirSync(dir, { recursive: true });
createServer((req, res) => {
  const cors = { "Access-Control-Allow-Origin": "http://localhost:3000", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
  const name = path.basename(new URL(req.url, "http://x").searchParams.get("name") ?? "frame.png");
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    writeFileSync(path.join(dir, name), Buffer.concat(chunks));
    res.writeHead(200, cors).end("ok");
  });
}).listen(port, "127.0.0.1", () => console.log(`saving frames from http://localhost:3000 into ${dir} on port ${port}`));
