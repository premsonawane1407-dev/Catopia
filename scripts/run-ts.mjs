// Runs a TypeScript script under Node without a separate TS runner: bundles it (and the game modules it
// imports, which use extension-less imports) with rolldown into a temp folder, then runs the result.
// Usage: node scripts/run-ts.mjs scripts/cat/bake.ts [script arguments...]
import { build } from "rolldown";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [entry, ...args] = process.argv.slice(2);
if (!entry) throw new Error("Usage: node scripts/run-ts.mjs <script.ts> [arguments]");
const outDir = mkdtempSync(path.join(tmpdir(), "catopia-ts-"));
try {
  await build({
    input: path.resolve(entry),
    platform: "node",
    logLevel: "warn",
    output: { dir: outDir, format: "esm", entryFileNames: "main.mjs" },
    tsconfig: path.resolve("tsconfig.json"),
  });
  process.argv = [process.argv[0], path.resolve(entry), ...args];
  await import(pathToFileURL(path.join(outDir, "main.mjs")).href);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
