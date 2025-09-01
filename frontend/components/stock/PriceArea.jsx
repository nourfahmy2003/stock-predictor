"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useTheme } from "next-themes";
import { useReducedMotion } from "framer-motion";

export default function PriceArea({ data, xTicks, yTicks, xFmt, yFmt, domain, onResize, labelFmt }) {
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-full w-full rounded-md border border-border animate-pulse" />;

  const root = getComputedStyle(document.documentElement);
  const axis = root.getPropertyValue("--muted-foreground").trim() || (resolvedTheme === "dark" ? "#fff" : "#000");
  const grid = root.getPropertyValue("--border").trim() || (resolvedTheme === "dark" ? "#333" : "#ddd");
  const tooltipBg = root.getPropertyValue("--card").trim() || (resolvedTheme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.98)");
  const small = w < 640;

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      onResize={(W, H) => {
        setW(W);
        setH(H);
        onResize && onResize(W, H);
      }}
    >
      <AreaChart data={data} margin={{ top: 22, right: 32, bottom: small ? 60 : 42, left: 36 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.06} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={grid} strokeOpacity={0.12} vertical={false} />
        <XAxis
          dataKey="ts"
          type="number"
          domain={["dataMin", "dataMax"]}
          ticks={xTicks}
          tickFormatter={xFmt}
          tick={{ fill: axis, fontSize: small ? 10 : 12 }}
          axisLine={{ stroke: axis, opacity: 0.35 }}
          tickLine={{ stroke: axis, opacity: 0.35 }}
          minTickGap={24}
          tickMargin={8}
          angle={small ? -35 : 0}
          textAnchor={small ? "end" : "middle"}
        />
        <YAxis
          domain={domain}
          ticks={yTicks}
          tickFormatter={yFmt}
          tick={{ fill: axis, fontSize: small ? 10 : 12 }}
          axisLine={{ stroke: axis, opacity: 0.35 }}
          tickLine={{ stroke: axis, opacity: 0.35 }}
        />
        <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: "1px solid hsl(var(--border))", borderRadius: 6, padding: "0.5rem" }}  labelFormatter={labelFmt} />
        <Area type="monotone" dataKey="close" stroke="#60a5fa" strokeWidth={2} fill="url(#priceFill)" dot={false} isAnimationActive={!reduceMotion} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
