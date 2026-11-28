import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

// The look-test lab (the Phase 0 throwaway) has two helper routes that read this repository's folders (assets/, docs/) and only
// work on a developer's machine. They are written as `route.dev.ts`, which counts as a route only while the dev server runs.
// Left in a production build, Next's file tracing packs the whole repository (hundreds of megabytes of models, sprite sheets and
// review pictures) into each of those two functions, which is how a deployment goes over the platform's size limit.
export default function config(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    pageExtensions: dev ? ["tsx", "ts", "jsx", "js", "dev.ts"] : ["tsx", "ts", "jsx", "js"],
    // Belt and braces: no route needs these folders at run time (the game's files are served from public/).
    outputFileTracingExcludes: {
      "/*": ["./assets/**/*", "./docs/**/*", "./references/**/*", "./supabase/**/*", "./.git/**/*", "./.agents/**/*", "./.claude/**/*", "./.next/cache/**/*"],
    },
  };
}
