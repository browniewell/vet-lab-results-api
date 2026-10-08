import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      // Report on every source file, including ones no test imports yet
      include: ["src/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
