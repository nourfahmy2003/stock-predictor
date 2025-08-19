export const dynamic = "force-dynamic"

import { jobs } from "./store"

export async function POST(req) {
  const { searchParams } = new URL(req.url)
  const ticker = (searchParams.get("ticker") || "").toUpperCase()
  const look_back = Number(searchParams.get("look_back") || 60)
  const horizon = Number(searchParams.get("horizon") || 10)
  const jobId = Math.random().toString(36).slice(2)
  jobs.set(jobId, {
    ticker,
    look_back,
    horizon,
    state: "queued",
    pct: 0,
    eta: 5,
    startedAt: Date.now(),
    finishedAt: null,
    result: null,
    error: null,
  })
  return Response.json({ jobId })
}
