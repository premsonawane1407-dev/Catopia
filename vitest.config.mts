import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests cover pure logic only (no browser, no WebGL). Browser behaviour is checked by running the app.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["features/**/*.test.ts", "lib/**/*.test.ts"],
  },
});
