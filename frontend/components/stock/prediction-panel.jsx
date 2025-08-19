"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, Brain, Zap } from "lucide-react"
import { AnimatedCounter } from "./animated-counter"
import { motion, AnimatePresence } from "framer-motion"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

export function PredictionPanel({ ticker }) {
  const [isTraining, setIsTraining] = useState(false)
  const [stats, setStats] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [status, setStatus] = useState("idle")
  const [error, setError] = useState(null)
  const [lookBack] = useState(60)
  const [horizon] = useState(10)

  async function runForecast() {
    const url = `/api/forecast?ticker=${encodeURIComponent(
      ticker
    )}&look_back=${lookBack}&horizon=${horizon}`
    setStatus("loading")
    setIsTraining(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        setStatus("error")
        setError("Request failed")
        return
      }
      const json = await res.json()
      setForecastData(json)
      const series = (json.forecast || [])
        .filter((r) => r.pred_price != null)
        .map((r) => ({ date: r.date, price: r.pred_price }))
      if (series.length) {
        const last = series[series.length - 1].price
        const prev = series[series.length - 2]
          ? series[series.length - 2].price
          : last
        const trend =
          last > prev ? "Uptrend" : last < prev ? "Downtrend" : "Flat"
        const confidence = Math.round(
          (series.length / (json.forecast || []).length) * 100
        )
        setStats({ nextPrice: last, trend, confidence, series })
      }
      setStatus("done")
    } catch (e) {
      setStatus("error")
      setError("Request failed")
    } finally {
      setIsTraining(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-grid relative overflow-hidden">
        <AnimatePresence>
          {isTraining && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center"
            >
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto relative">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <Zap className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-3 h-3 bg-primary rounded-full animate-ping"></div>
                  <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-success rounded-full animate-ping delay-300"></div>
                  <div className="absolute top-1/2 -left-4 w-2 h-2 bg-primary/60 rounded-full animate-ping delay-700"></div>
                </div>

                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">Crunching the numbers…</p>
                  <p className="text-sm text-muted-foreground">Please wait while we generate your prediction</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Brain className="size-5 text-primary" />
            AI Prediction Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <Button
              onClick={runForecast}
              disabled={status === "loading"}
              className="w-full transition-all duration-200"
              size="lg"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <TrendingUp className="size-5" />
                  Run AI Prediction
                </>
              )}
            </Button>

            {stats?.series && stats.series.length > 0 && (
              <div className="mt-6 h-72 w-full">
                <ResponsiveContainer>
                  <LineChart data={stats.series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={["auto", "auto"]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {forecastData && (
              <details className="text-left mt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Raw JSON
                </summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {JSON.stringify(forecastData, null, 2)}
                </pre>
              </details>
            )}

            {status === "error" && <p className="text-sm text-danger">{error}</p>}

            <AnimatePresence>
              {stats && !isTraining && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="grid grid-cols-2 gap-4 mt-6"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <Card className="bg-background/50 hover:bg-background/70 transition-colors">
                      <CardContent className="p-4 text-center">
                        <div className="text-sm text-muted mb-1">Next Price</div>
                        <div className="text-2xl font-bold text-success font-mono">
                          $<AnimatedCounter value={stats.nextPrice} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                  >
                    <Card className="bg-background/50 hover:bg-background/70 transition-colors">
                      <CardContent className="p-4 text-center">
                        <div className="text-sm text-muted mb-1">Confidence</div>
                        <div className="text-2xl font-bold text-primary font-mono">
                          <AnimatedCounter value={stats.confidence} />%
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {stats && !isTraining && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="flex justify-center gap-2 mt-4"
                >
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                    {stats.trend}
                  </Badge>
                  <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                    {stats.confidence}% Confidence
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
