import { connection } from "next/server";
import { checkHealth } from "@/platform/health";
import { withApiHandler } from "@/platform/http";

/** Liveness and data check. 200 when the database answers and holds data, 503 otherwise. */
export const GET = withApiHandler(
  async () => {
    await connection(); // a health check must always run at request time, never be prerendered
    const report = await checkHealth();
    return { data: report, status: report.status === "ok" ? 200 : 503 };
  },
  { cache: "no-store" },
);
