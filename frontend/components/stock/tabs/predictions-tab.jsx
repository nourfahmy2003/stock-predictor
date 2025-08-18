"use client"

import { useState } from "react"
import { Brain, Zap, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MetricBox } from "@/components/stock/metric-box"
import { ChartWrapper } from "@/components/stock/chart-wrapper"
import { AnimatedCounter } from "@/components/stock/animated-counter"
import { StaggeredFadeIn } from "@/components/stock/page-transition"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"

export function PredictionsTab({ ticker }) {
  const [isTraining, setIsTraining] = useState(false)
  const [modelTrained, setModelTrained] = useState(false)
  const [predictionData, setPredictionData] = useState([])
  const [trainingProgress, setTrainingProgress] = useState(0)

  const handleTrainModel = async () => {
    setIsTraining(true)
    setTrainingProgress(0)

    // Simulate progressive training with animated progress
    const progressInterval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 200)

    // Simulate model training
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Generate mock prediction data
    const mockData = []
    const basePrice = 150
    let currentPrice = basePrice

    // Historical data (last 10 days)
    for (let i = -10; i < 0; i++) {
      const change = (Math.random() - 0.5) * 0.05
      currentPrice = currentPrice * (1 + change)
      mockData.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString(),
        actual: currentPrice,
        predicted: null,
        confidence: null,
        type: "historical",
      })
    }

    // Prediction data (next 10 days)
    for (let i = 0; i < 10; i++) {
      const change = (Math.random() - 0.5) * 0.08
      currentPrice = currentPrice * (1 + change)
      const confidence = Math.random() * 20 + 5

      mockData.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString(),
        actual: null,
        predicted: currentPrice,
        confidenceUpper: currentPrice + confidence,
        confidenceLower: currentPrice - confidence,
        type: "prediction",
      })
    }

    setPredictionData(mockData)
    setModelTrained(true)
    setIsTraining(false)
    setTrainingProgress(100)
  }

  const modelMetrics = [
    {
      label: "Prediction Accuracy",
      value: 96.66,
      format: "percentage",
      tooltip: "How close our predictions are to actual prices",
    },
    {
      label: "Average Error",
      value: 3.12,
      format: "percentage",
      tooltip: "Average percentage difference from actual prices",
    },
    {
      label: "Model Confidence",
      value: 0.847,
      format: "number",
      tooltip: "How confident the AI is in its predictions (0-1 scale)",
    },
    {
      label: "Success Rate",
      value: 84.7,
      format: "percentage",
      tooltip: "Percentage of predictions that were directionally correct",
    },
  ]

  return (
    <div className="space-y-6">
      {!modelTrained ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto space-y-6">
            <div className="p-4 rounded-full bg-primary/10 w-20 h-20 mx-auto flex items-center justify-center">
              <Brain className={`size-10 text-primary ${isTraining ? "animate-pulse" : ""}`} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-poppins font-semibold text-white">Train AI Model</h3>
              <p className="text-muted">Train a custom prediction model for {ticker} using advanced AI algorithms.</p>
            </div>

            <Button variant="glow" size="xl" onClick={handleTrainModel} disabled={isTraining} className="group">
              {isTraining ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Training Model...
                </>
              ) : (
                <>
                  <Zap className="size-5 mr-2 group-hover:scale-110 transition-transform" />
                  Train Model
                </>
              )}
            </Button>

            {isTraining && (
              <div className="space-y-3">
                <div className="w-full bg-muted/20 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-success h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(trainingProgress, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted">
                  <AnimatedCounter value={Math.min(trainingProgress, 100)} format={(val) => `${val.toFixed(0)}%`} />{" "}
                  complete - Analyzing historical data and market patterns...
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Model Performance Metrics */}
          <div>
            <h3 className="text-lg font-poppins font-semibold mb-4 flex items-center gap-2 text-white">
              <Target className="size-5 text-primary" />
              Model Performance
            </h3>
            <StaggeredFadeIn delay={150}>
              {[
                <div key="metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {modelMetrics.map((metric) => (
                    <MetricBox
                      key={metric.label}
                      label={metric.label}
                      value={metric.value}
                      format={metric.format}
                      tooltip={metric.tooltip}
                      animate={true}
                    />
                  ))}
                </div>,
              ]}
            </StaggeredFadeIn>
          </div>

          {/* Prediction Chart */}
          <ChartWrapper title="Price Predictions with Confidence Range">
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={predictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />

                {/* Confidence Interval */}
                <Area
                  type="monotone"
                  dataKey="confidenceUpper"
                  stackId="1"
                  stroke="none"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="confidenceLower"
                  stackId="1"
                  stroke="none"
                  fill="hsl(var(--background))"
                  fillOpacity={1}
                />

                {/* Actual Price Line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />

                {/* Predicted Price Line */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrapper>

          {/* Retrain Button */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setModelTrained(false)} className="group">
              <Brain className="size-4 mr-2 group-hover:rotate-12 transition-transform" />
              Retrain Model
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
