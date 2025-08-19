export const dynamic = "force-dynamic"

import { jobs } from "../store"

function makeResult(job) {
  const now = Date.now()
  const forecast = []
  for (let i = 0; i < job.horizon; i++) {
    const date = new Date(now + i * 86400000)
    const price = 100 + i
    forecast.push({
      date: date.toISOString().slice(0, 10),
      pred_price: price,
      pred_return: 0.01,
    })
  }
  return {
    ticker: job.ticker,
    look_back: job.look_back,
    horizon: job.horizon,
    forecast,
    metrics: { rmse: 1.82, mape: 2.1, coverage: 0.78 },
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("jobId")
  const job = jobs.get(jobId)
  if (!job) {
    return Response.json({ error: "not found" }, { status: 404 })
  }
  if (job.state !== "done") {
    return Response.json({ error: "not ready" }, { status: 202 })
  }
  if (!job.result) {
    job.result = makeResult(job)
  }
  return Response.json(job.result)
}
