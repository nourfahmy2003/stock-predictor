export const dynamic = "force-dynamic"

import { jobs } from "../store"

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("jobId")
  const job = jobs.get(jobId)
  if (!job) {
    return Response.json({ pct: 0, state: "error" }, { status: 404 })
  }
  const elapsed = (Date.now() - job.startedAt) / 1000
  const pct = Math.min(100, Math.floor((elapsed / job.eta) * 100))
  job.pct = pct
  if (pct >= 100) {
    job.state = "done"
    job.finishedAt = job.finishedAt || Date.now()
    return Response.json({ pct: 100, state: "done", etaSeconds: 0 })
  }
  job.state = "running"
  return Response.json({
    pct,
    state: "running",
    etaSeconds: Math.max(0, Math.ceil(job.eta - elapsed)),
  })
}
