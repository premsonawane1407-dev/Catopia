import { notFound } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// PHASE 0 LOOK TEST - dev only. Lets the lab page save a still or a short capture into
// `docs/look-test/captures/` so the results can be reviewed outside the browser.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") notFound();

  const url = new URL(request.url);
  const name = (url.searchParams.get("name") ?? "capture").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const ext = path.extname(name).toLowerCase();
  if (![".png", ".webm", ".json"].includes(ext)) {
    return Response.json({ error: "Only .png, .webm and .json captures are accepted." }, { status: 400 });
  }

  const dir = path.resolve(process.cwd(), "docs/look-test/captures");
  await mkdir(dir, { recursive: true });
  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength === 0 || body.byteLength > 40 * 1024 * 1024) {
    return Response.json({ error: "Empty or oversized body." }, { status: 400 });
  }
  const file = path.join(dir, name);
  await writeFile(file, body);
  return Response.json({ saved: `docs/look-test/captures/${name}`, bytes: body.byteLength });
}
