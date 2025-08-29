"use client"

import { useState, useEffect } from "react"
import { MetricBox } from "@/components/stock/metric-box"
import { ChartWrapper } from "@/components/stock/chart-wrapper"
import { TimeTravelSlider } from "@/components/stock/time-travel-slider"
import { StaggeredFadeIn } from "@/components/stock/page-transition"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function OverviewTab({ ticker, stockData }) {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    // Mock chart data generation
    const generateChartData = () => {
      const data = []
      const basePrice = stockData.price
      let currentPrice = basePrice * 0.8

      for (let i = 0; i < 30; i++) {
        const change = (Math.random() - 0.5) * 0.1
        currentPrice = currentPrice * (1 + change)

        data.push({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          price: currentPrice,
          volume: Math.floor(Math.random() * 10000000) + 1000000,
        })
      }

      return data
    }

    setTimeout(() => {
      setChartData(generateChartData())
      setLoading(false)
    }, 500)
  }, [ticker, stockData.price])

  const metrics = [
    { label: "Market Cap", value: stockData.marketCap, format: "number", tooltip: "Total value of all company shares" },
    { label: "Volume", value: stockData.volume, format: "number", tooltip: "Number of shares traded today" },
    {
      label: "P/E Ratio",
      value: (Math.random() * 30 + 10).toFixed(2),
      format: "number",
      tooltip: "Price compared to earnings per share",
    },
    {
      label: "52W High",
      value: stockData.price * (1 + Math.random() * 0.3),
      format: "currency",
      tooltip: "Highest price in the last year",
    },
    {
      label: "52W Low",
      value: stockData.price * (1 - Math.random() * 0.3),
      format: "currency",
      tooltip: "Lowest price in the last year",
    },
    {
      label: "Price Swings",
      value: (Math.random() * 50 + 10).toFixed(1),
      format: "percentage",
      tooltip: "How much the stock price typically moves up and down",
    },
  ]

  const handleDateChange = (date) => {
    setSelectedDate(date)
    // In a real app, this would filter the chart data based on the selected date
  }

  return (
    <div className="space-y-6">
      {/* Time Travel Slider */}
      <TimeTravelSlider onDateChange={handleDateChange} />

      {/* Price Chart */}
      <ChartWrapper title="Price History (30 Days)" loading={loading}>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
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
              formatter={(value) => [`$${value.toFixed(2)}`, "Price"]}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Key Metrics */}
      <div>
        <h3 className="text-lg font-poppins font-semibold mb-4 text-white">Key Statistics</h3>
        <StaggeredFadeIn delay={100}>
          {[
            <div key="row1" className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.slice(0, 3).map((metric, index) => (
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
            <div key="row2" className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.slice(3, 6).map((metric, index) => (
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
    </div>
  )
}
