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
      const start = Date.now();
      job.result = {
        ticker: job.ticker,
        look_back: job.look_back,
        horizon: job.horizon,
        forecast: {
          metrics: { coverage: 0.5 },
          series: Array.from({ length: job.horizon }, (_, i) => ({
            date: new Date(start + i * 86400000).toISOString().slice(0, 10),
            pred_fore: 100 + i,
          })),
        },
      };
    }
  }

  return Response.json({
    state: job.state,
    pct: job.pct,
    etaSeconds: job.etaSeconds,
  });
}

