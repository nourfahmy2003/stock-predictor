"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "./stat-card"
import { TrendingUp, BarChart3 } from "lucide-react"

export function BacktestPanel({ ticker }) {
  const backtestResults = {
    totalReturn: 24.7,
    sharpeRatio: 1.42,
    maxDrawdown: -8.3,
    winRate: 67.2,
    avgWin: 4.2,
    avgLoss: -2.1,
    trades: 156,
  }

  return (
    <div className="space-y-6">
      <Card className="glass border-white/20 dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading">
            <BarChart3 className="size-6 text-primary" />
            Strategy Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="Total Return"
              value={`${backtestResults.totalReturn}%`}
              trend="positive"
              tooltip="Total profit/loss over the backtesting period"
            />
            <StatCard
              title="Risk-Adjusted Return"
              value={backtestResults.sharpeRatio}
              tooltip="Sharpe ratio - measures return per unit of risk"
            />
            <StatCard
              title="Largest Drop"
              value={`${backtestResults.maxDrawdown}%`}
              trend="negative"
              tooltip="Maximum drawdown - largest peak-to-trough decline"
            />
          </div>

          <div className="h-64 bg-muted/10 rounded-lg flex items-center justify-center mb-6">
            <div className="text-center space-y-2">
              <TrendingUp className="size-12 text-primary mx-auto" />
              <p className="text-muted-foreground">Equity Curve Chart</p>
              <p className="text-sm text-muted-foreground">Interactive performance chart would display here</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Win Rate"
              value={`${backtestResults.winRate}%`}
              tooltip="Percentage of profitable trades"
            />
            <StatCard
              title="Average Win"
              value={`${backtestResults.avgWin}%`}
              tooltip="Average profit per winning trade"
            />
            <StatCard
              title="Average Loss"
              value={`${backtestResults.avgLoss}%`}
              tooltip="Average loss per losing trade"
            />
            <StatCard
              title="Total Trades"
              value={backtestResults.trades}
              tooltip="Number of trades executed in backtest"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
