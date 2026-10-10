// Runs once before the whole test run: start from an empty test database
// and apply every migration to it. Dev data (dev.db) is never touched.
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

export default function setup() {
  rmSync("prisma/test.db", { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "file:./prisma/test.db",
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
    },
  });
}
