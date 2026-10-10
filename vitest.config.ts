import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests use their own database file, recreated on every run
    env: { DATABASE_URL: "file:./prisma/test.db" },
    globalSetup: ["tests/global-setup.ts"],
    // Test files share one SQLite file, so run them one at a time
    fileParallelism: false,
    coverage: {
      provider: "v8",
      // Report on every source file, including ones no test imports yet
      include: ["src/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
