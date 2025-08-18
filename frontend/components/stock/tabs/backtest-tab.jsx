"use client"

import { useState, useEffect } from "react"
import { TrendingUp, BarChart3, Target } from "lucide-react"
import { MetricBox } from "@/components/stock/metric-box"
import { ChartWrapper } from "@/components/stock/chart-wrapper"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function BacktestTab({ ticker }) {
  const [backtestData, setBacktestData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock backtest data generation
    const generateBacktestData = () => {
      const data = []
      let portfolioValue = 10000
      let benchmark = 10000

      for (let i = 0; i < 252; i++) {
        // 1 year of trading days
        const strategyReturn = (Math.random() - 0.45) * 0.02 // Slightly positive bias
        const benchmarkReturn = (Math.random() - 0.48) * 0.015 // Market return

        portfolioValue *= 1 + strategyReturn
        benchmark *= 1 + benchmarkReturn

        data.push({
          date: new Date(Date.now() - (251 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          portfolio: portfolioValue,
          benchmark: benchmark,
          drawdown: Math.min(
            0,
            (portfolioValue / Math.max(...data.map((d) => d?.portfolio || portfolioValue)) - 1) * 100,
          ),
        })
      }

      return data
    }

    setTimeout(() => {
      setBacktestData(generateBacktestData())
      setLoading(false)
    }, 800)
  }, [ticker])

  const calculateMetrics = () => {
    if (backtestData.length === 0) return {}

    const finalValue = backtestData[backtestData.length - 1].portfolio
    const totalReturn = ((finalValue - 10000) / 10000) * 100

    const returns = backtestData.map((d, i) => (i === 0 ? 0 : d.portfolio / backtestData[i - 1].portfolio - 1)).slice(1)

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const riskLevel =
      Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length) * Math.sqrt(252) * 100

    const riskAdjustedReturn = (avgReturn * 252) / (riskLevel / 100)
    const maxDrawdown = Math.min(...backtestData.map((d) => d.drawdown))

    return {
      totalReturn: totalReturn.toFixed(2),
      riskAdjustedReturn: riskAdjustedReturn.toFixed(2),
      riskLevel: riskLevel.toFixed(2),
      maxDrawdown: Math.abs(maxDrawdown).toFixed(2),
    }
  }

  const metrics = calculateMetrics()

  const performanceMetrics = [
    {
      label: "Total Return",
      value: metrics.totalReturn || "0",
      format: "percentage",
      change: Number.parseFloat(metrics.totalReturn || "0"),
      tooltip: "Total profit or loss from the strategy",
    },
    {
      label: "Risk-Adjusted Return",
      value: metrics.riskAdjustedReturn || "0",
      format: "number",
      tooltip: "How much return you get for the risk taken",
    },
    {
      label: "Risk Level",
      value: metrics.riskLevel || "0",
      format: "percentage",
      tooltip: "How much the strategy's returns typically vary",
    },
    {
      label: "Largest Drop",
      value: metrics.maxDrawdown || "0",
      format: "percentage",
      tooltip: "The biggest decline from peak to trough",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div>
        <h3 className="text-lg font-poppins font-semibold mb-4 flex items-center gap-2 text-white">
          <BarChart3 className="size-5 text-primary" />
          Backtest Results
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceMetrics.map((metric) => (
            <MetricBox
              key={metric.label}
              label={metric.label}
              value={metric.value}
              format={metric.format}
              change={metric.change}
              tooltip={metric.tooltip}
              animate={true}
            />
          ))}
        </div>
      </div>

      {/* Equity Curve */}
      <ChartWrapper title="Strategy Performance vs Market" loading={loading}>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={backtestData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value, name) => [`$${value.toLocaleString()}`, name === "portfolio" ? "Strategy" : "Market"]}
            />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              name="Strategy"
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Market"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Strategy Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-poppins font-semibold flex items-center gap-2 text-white">
            <Target className="size-4 text-primary" />
            Strategy Details
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Model Type:</span>
              <span className="text-white">AI Neural Network</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Training Period:</span>
              <span className="text-white">2 Years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Rebalancing:</span>
              <span className="text-white">Daily</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Transaction Costs:</span>
              <span className="text-white">0.1%</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-poppins font-semibold flex items-center gap-2 text-white">
            <TrendingUp className="size-4 text-success" />
            Risk Metrics
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Market Sensitivity:</span>
              <span className="text-white">0.85</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Excess Return:</span>
              <span className="text-success">+2.3%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Win Rate:</span>
              <span className="text-white">58.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Average Win/Loss:</span>
              <span className="text-white">1.4x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
