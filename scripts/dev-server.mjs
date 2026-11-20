import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = resolve(projectRoot, "public");
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".glb", "model/gltf-binary"],
  [".html", "text/html; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

function resolveRequest(pathname) {
  if (pathname === "/") return resolve(publicRoot, "index.html");
  if (pathname === "/catopia.css") return resolve(projectRoot, "styles", "catopia.css");
  if (pathname === "/health") return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }

  if (!(decodedPath.startsWith("/fonts/") || decodedPath.startsWith("/images/") || decodedPath.startsWith("/models/") || decodedPath === "/favicon.svg")) {
    return undefined;
  }

  const target = resolve(publicRoot, `.${decodedPath}`);
  if (!target.startsWith(`${publicRoot}${sep}`) && target !== publicRoot) return undefined;
  return target;
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  if (requestUrl.pathname === "/health") {
    const body = Buffer.from(JSON.stringify({ app: "Catopia", status: "preview", backend: "not-configured" }));
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Content-Length": body.length, "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : body);
    return;
  }

  const target = resolveRequest(requestUrl.pathname);
  if (!target) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }

  try {
    const details = await stat(target);
    if (!details.isFile()) throw new Error("Not a file");
    const body = await readFile(target);
    response.writeHead(200, {
      "Content-Type": contentTypes.get(extname(target).toLowerCase()) ?? "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": target.endsWith(".woff2") || target.endsWith(".glb") ? "public, max-age=31536000, immutable" : "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

const port = Number(process.env.PORT ?? 4173);
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Catopia local preview: http://127.0.0.1:${port}\n`);
});
