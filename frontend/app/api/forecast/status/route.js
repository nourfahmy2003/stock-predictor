export const dynamic = "force-dynamic";

import { jobs } from "../store";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId") || "";
  const job = jobs.get(jobId);
  if (!job) {
    return new Response(null, { status: 404 });
  }

  if (job.state === "queued") {
    job.state = "running";
  }
  if (job.state === "running") {
    job.pct = Math.min(job.pct + 20, 100);
    job.etaSeconds = Math.max((job.etaSeconds || 5) - 1, 0);
    if (job.pct >= 100) {
      job.state = "done";
      job.finishedAt = Date.now();
      job.result = {
        forecast: Array.from({ length: job.horizon }, (_, i) => ({
          step: i + 1,
          pred_price: 100 + i,
        })),
        metrics: { coverage: 0.5 },
      };
    }
  }

  return Response.json({
    state: job.state,
    pct: job.pct,
    etaSeconds: job.etaSeconds,
  });
}

