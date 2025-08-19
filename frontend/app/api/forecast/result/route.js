export const dynamic = "force-dynamic";

import { jobs } from "../store";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId") || "";
  const job = jobs.get(jobId);
  if (!job || job.state !== "done" || !job.result) {
    return new Response(null, { status: 404 });
  }
  return Response.json(job.result);
}

