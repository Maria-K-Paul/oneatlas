import { execSync } from "node:child_process";

/** Applies migrations to the test database once, before any integration test runs. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Start Postgres with `docker compose up -d db` and copy the value from .env.example.",
    );
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
