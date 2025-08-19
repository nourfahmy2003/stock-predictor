"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePredictionJob, usePredictionStore } from "./prediction-store"
import PredictionChart from "./PredictionChart"
import { fmtPrice } from "@/lib/format"

export function PredictionPanel({ ticker }) {
  const { startJob } = usePredictionStore()
  const job = usePredictionJob(ticker)
  const [lookBack] = useState(60)
  const [horizon] = useState(10)

  async function run() {
    const qs = new URLSearchParams({
      ticker,
      look_back: String(lookBack),
      horizon: String(horizon),
    })
    const res = await fetch(`/api/forecast?${qs.toString()}`, { method: "POST" })
    if (!res.ok) return
    const json = await res.json()
    startJob(ticker, json.jobId)
  }

  const forecast = job?.result?.forecast || []
  const nextPrice = forecast.length ? forecast[forecast.length - 1].pred_price : null
  const trend = useMemo(() => {
    if (forecast.length < 2) return "—"
    const last = forecast[forecast.length - 1].pred_price
    const prev = forecast[forecast.length - 2].pred_price
    if (last > prev) return "Uptrend"
    if (last < prev) return "Downtrend"
    return "—"
  }, [forecast])
  const confidence = useMemo(() => {
    const cov = job?.result?.metrics?.coverage
    if (typeof cov === "number") {
      return Math.min(Math.max(Math.round(cov * 100), 0), 99)
    }
    return null
  }, [job])

  return (
    <Card className="bg-card border-grid relative overflow-hidden">
      {job && job.state !== "done" && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center" aria-busy="true">
          <p className="mb-4 text-foreground">Crunching the numbers… {Math.floor(job.pct || 0)}%</p>
          {job.etaSeconds != null && (
            <p className="text-sm text-muted-foreground mb-4">~{String(Math.floor(job.etaSeconds / 60)).padStart(1, "0")}:{String(job.etaSeconds % 60).padStart(2, "0")} remaining</p>
          )}
          <div className="w-64 bg-primary/20 rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-full" style={{ width: `${job.pct || 0}%` }} />
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">AI Prediction Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4" aria-live="polite" aria-busy={job && job.state !== "done"}>
        <Button onClick={run} disabled={job && job.state === "running"} className="w-full">
          Run AI Prediction
        </Button>
        {forecast.length > 0 ? (
          <PredictionChart data={forecast} />
        ) : (
          <div className="h-72 flex items-center justify-center text-muted-foreground">
            <p>No forecast yet</p>
          </div>
        )}
        {nextPrice != null && (
          <div className="flex gap-4 justify-center">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Next Price</div>
              <div className="text-2xl font-bold font-mono text-success">
                {fmtPrice(nextPrice)}
              </div>
            </div>
            {confidence != null && (
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Confidence</div>
                <div className="text-2xl font-bold font-mono text-primary">{confidence}%</div>
              </div>
            )}
          </div>
        )}
        {trend !== "—" && (
          <div className="flex justify-center">
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
              {trend}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
