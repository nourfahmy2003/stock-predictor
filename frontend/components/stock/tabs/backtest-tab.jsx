"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

import { MetricBox } from "@/components/stock/metric-box";
import { ChartWrapper } from "@/components/stock/chart-wrapper";
import { useBacktest } from "../use-backtest-job";

export function BacktestTab({ ticker }) {
  const { theme } = useTheme();
  const [strategy, setStrategy] = useState("buy_hold");
  const [fast, setFast] = useState(20);
  const [slow, setSlow] = useState(50);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [rsiBuy, setRsiBuy] = useState(30);
  const [rsiSell, setRsiSell] = useState(70);
  const [range, setRange] = useState("1y");
  const [interval, setInterval] = useState("1d");
  const [slippage, setSlippage] = useState(0);
  const [commission, setCommission] = useState(0);

  const { state, pct, result, err, start } = useBacktest(ticker);

  const run = (e) => {
    e.preventDefault();
    const stratParams =
      strategy === "sma_crossover"
        ? { fast, slow }
        : strategy === "rsi"
        ? { period: rsiPeriod, buy: rsiBuy, sell: rsiSell }
        : {};
    start({
      range,
      interval,
      strategy: { type: strategy, params: stratParams },
      initial_cash: 10000,
      costs: { slippage_bps: slippage, commission_per_trade: commission },
    });
  };

  const axisColor = theme === "dark" ? "#fff" : "hsl(var(--foreground))";
  const tooltipBg = theme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)";

  const metrics = result?.metrics || {};
  const eq = result?.equity || [];
  const dd = result?.drawdown || [];
  const trades = result?.trades?.filter((t) => t.pnl !== undefined) || [];
  const bars = result?.barReturns || [];

  const eqVals = eq.map((p) => p.value);
  const eqMin = Math.min(...eqVals, 0);
  const eqMax = Math.max(...eqVals, 1);
  const eqPad = Math.max((eqMax - eqMin) * 0.02, 0.5);
  const eqDomain = [eqMin - eqPad, eqMax + eqPad];
  const firstEq = eq[0];
  const lastEq = eq[eq.length - 1];

  const ddVals = dd.map((p) => p.dd);
  const ddMin = Math.min(...ddVals, 0);
  const ddPad = Math.max(Math.abs(ddMin) * 0.02, 0.005);
  const ddDomain = [ddMin - ddPad, ddPad];

  return (
    <div className="space-y-6 relative" aria-busy={state === "running"}>
      {state === "running" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-sm text-foreground">
            Crunching the numbers… {pct}%
          </div>
        </div>
      )}

      <form onSubmit={run} className="flex flex-wrap items-end gap-2 text-sm">
        <h3 className="text-lg font-heading font-semibold mr-auto flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" /> Strategy Performance
        </h3>
        <div className="flex flex-col">
          <label className="text-xs">Range</label>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-2 py-1 rounded border bg-background"
          >
            <option value="1y">1y</option>
            <option value="3y">3y</option>
            <option value="5y">5y</option>
            <option value="max">max</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs">Strategy</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="px-2 py-1 rounded border bg-background"
          >
            <option value="buy_hold">Buy & Hold</option>
            <option value="sma_crossover">SMA Cross</option>
            <option value="rsi">RSI</option>
          </select>
        </div>
        {strategy === "sma_crossover" && (
          <>
            <div className="flex flex-col">
              <label className="text-xs">Fast</label>
              <input
                type="number"
                value={fast}
                onChange={(e) => setFast(Number(e.target.value))}
                className="px-2 py-1 rounded border bg-background w-20"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs">Slow</label>
              <input
                type="number"
                value={slow}
                onChange={(e) => setSlow(Number(e.target.value))}
                className="px-2 py-1 rounded border bg-background w-20"
              />
            </div>
          </>
        )}
        {strategy === "rsi" && (
          <>
            <div className="flex flex-col">
              <label className="text-xs">Period</label>
              <input
                type="number"
                value={rsiPeriod}
                onChange={(e) => setRsiPeriod(Number(e.target.value))}
                className="px-2 py-1 rounded border bg-background w-20"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs">Buy</label>
              <input
                type="number"
                value={rsiBuy}
                onChange={(e) => setRsiBuy(Number(e.target.value))}
                className="px-2 py-1 rounded border bg-background w-20"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs">Sell</label>
              <input
                type="number"
                value={rsiSell}
                onChange={(e) => setRsiSell(Number(e.target.value))}
                className="px-2 py-1 rounded border bg-background w-20"
              />
            </div>
          </>
        )}
        <div className="flex flex-col">
          <label className="text-xs">Slippage bps</label>
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(Number(e.target.value))}
            className="px-2 py-1 rounded border bg-background w-24"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs">Commission</label>
          <input
            type="number"
            value={commission}
            onChange={(e) => setCommission(Number(e.target.value))}
            className="px-2 py-1 rounded border bg-background w-24"
          />
        </div>
        <button
          type="submit"
          disabled={state === "running" || state === "starting"}
          className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50"
        >
          {state === "running" ? "Running…" : "Run Backtest"}
        </button>
      </form>
      <p className="text-xs text-muted-foreground">Costs: {slippage}bps slippage • ${commission} commission</p>

      {state === "idle" && !result && !err && (
        <div className="text-sm text-muted-foreground">No backtest yet, select parameters to run one.</div>
      )}
      {err && <div className="text-sm text-red-500">{String(err.message || err)}</div>}

      {result && (
        <div className="space-y-6" aria-live="polite">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricBox label="Total Return" value={(metrics.returnPct || 0).toFixed(2)} format="percentage" />
            <MetricBox
              label="Risk-Adjusted Return"
              value={(metrics.sharpe || 0).toFixed(2)}
              format="number"
              tooltip={metrics.sortino ? `Sortino ${metrics.sortino.toFixed(2)}` : undefined}
            />
            <MetricBox
              label="Largest Drop"
              value={Math.abs((metrics.maxDrawdownPct || 0) * 100).toFixed(2)}
              format="percentage"
            />
            <MetricBox label="Win Rate" value={((metrics.winRate || 0) * 100).toFixed(2)} format="percentage" />
            <MetricBox label="Average Win" value={((metrics.avgWin || 0) * 100).toFixed(2)} format="percentage" />
            <MetricBox label="Average Loss" value={((metrics.avgLoss || 0) * 100).toFixed(2)} format="percentage" />
          </div>

          <ChartWrapper title="Equity Curve">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={eq} margin={{ top: 24, right: 32, bottom: 28, left: 56 }}>
                <CartesianGrid strokeOpacity={0.12} stroke="hsl(var(--border))" />
                <XAxis dataKey="t" tick={{ fill: axisColor }} interval="preserveStartEnd" />
                <YAxis domain={eqDomain} tick={{ fill: axisColor }} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: "1px solid hsl(var(--border))" }}
                  formatter={(v) => [`$${v.toFixed(2)}`, "Value"]}
                />
                <ReferenceLine x={firstEq?.t} stroke="transparent" />
                <Line dataKey="value" stroke="hsl(var(--chart-line, var(--primary)))" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                {firstEq && (
                  <ReferenceDot x={firstEq.t} y={firstEq.value} r={3} label={{ position: "top", value: `$${firstEq.value.toFixed(0)}` }} />
                )}
                {lastEq && (
                  <ReferenceDot x={lastEq.t} y={lastEq.value} r={3} label={{ position: "top", value: `$${lastEq.value.toFixed(0)}` }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper title="Drawdown">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dd} margin={{ top: 24, right: 32, bottom: 28, left: 56 }}>
                <CartesianGrid strokeOpacity={0.12} stroke="hsl(var(--border))" />
                <XAxis dataKey="t" tick={{ fill: axisColor }} interval="preserveStartEnd" />
                <YAxis domain={ddDomain} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: axisColor }} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: "1px solid hsl(var(--border))" }}
                  formatter={(v) => [`${(v * 100).toFixed(2)}%`, "Drawdown"]}
                />
                <Area dataKey="dd" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <div className="grid md:grid-cols-2 gap-4">
            <ChartWrapper title="Trade Distribution">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trades} margin={{ top: 24, right: 32, bottom: 28, left: 56 }}>
                  <CartesianGrid strokeOpacity={0.12} stroke="hsl(var(--border))" />
                  <XAxis dataKey="t" tick={{ fill: axisColor, fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: axisColor }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, border: "1px solid hsl(var(--border))" }}
                    formatter={(v) => [`${(v * 100).toFixed(2)}%`, "P&L"]}
                  />
                  <Bar dataKey="pnl" fill="hsl(var(--chart-line, var(--primary)))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>

            <ChartWrapper title="Period Breakdown">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bars} margin={{ top: 24, right: 32, bottom: 28, left: 56 }}>
                  <CartesianGrid strokeOpacity={0.12} stroke="hsl(var(--border))" />
                  <XAxis dataKey="t" tick={{ fill: axisColor, fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: axisColor }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, border: "1px solid hsl(var(--border))" }}
                    formatter={(v) => [`${(v * 100).toFixed(2)}%`, "Return"]}
                  />
                  <Bar dataKey="ret" fill="hsl(var(--chart-line, var(--primary)))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>

          <ChartWrapper title="Trades">
            <div className="overflow-auto max-h-64">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left">
                    <th className="px-2 py-1">Date</th>
                    <th className="px-2 py-1">Side</th>
                    <th className="px-2 py-1">Price</th>
                    <th className="px-2 py-1">Qty</th>
                    <th className="px-2 py-1">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1 whitespace-nowrap">{t.t}</td>
                      <td className="px-2 py-1">{t.side}</td>
                      <td className="px-2 py-1">${t.price.toFixed(2)}</td>
                      <td className="px-2 py-1">{t.qty}</td>
                      <td className="px-2 py-1">
                        {t.pnl !== undefined ? `${(t.pnl * 100).toFixed(2)}%` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartWrapper>
        </div>
      )}
    </div>
  );
}
