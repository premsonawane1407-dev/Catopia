import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";

// PHASE 0 LOOK TEST - dev only. Serves staged models/sprites straight from `assets/` so the
// throwaway lab does not have to copy anything into the deployed `public/` folder.
const ROOTS: Record<string, string> = {
  town: "assets/3d/town",
  cat: "assets/lab/cat",
};

const TYPES: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".json": "application/json",
};

export async function GET(_request: Request, ctx: RouteContext<"/lab/assets/[...path]">) {
  if (process.env.NODE_ENV === "production") notFound();

  const { path: segments } = await ctx.params;
  const [group, ...rest] = segments;
  const rootRel = ROOTS[group];
  if (!rootRel || rest.length === 0) notFound();

  const root = path.resolve(process.cwd(), rootRel);
  const file = path.resolve(root, ...rest);
  // Refuse anything that escapes the chosen folder.
  if (file !== root && !file.startsWith(root + path.sep)) notFound();

  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) notFound();

  try {
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": type, "Cache-Control": "no-store" },
    });
  } catch {
    notFound();
  }
}
