"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedCounter } from "./animated-counter"

export function MetricBox({ label, value, format = "number", change, animate = false, tooltip, className }) {
  const formatValue = (val) => {
    if (typeof val === "string") return val

    switch (format) {
      case "currency":
        return `$${val.toLocaleString()}`
      case "percentage":
        return `${val}%`
      case "number":
      default:
        return val.toLocaleString()
    }
  }

  const getChangeColor = (changeValue) => {
    if (changeValue > 0) return "text-success"
    if (changeValue < 0) return "text-danger"
    return "text-muted"
  }

  return (
    <Card className={cn("bg-card border-grid", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted flex items-center gap-2">
          {label}
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="size-3 text-muted hover:text-primary transition-colors" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-white font-mono">
            {animate ? (
              <AnimatedCounter
                value={typeof value === "string" ? Number.parseFloat(value) : value}
                format={formatValue}
              />
            ) : (
              formatValue(value)
            )}
          </div>
          {change !== undefined && (
            <div className={cn("text-sm font-medium", getChangeColor(change))}>
              {change > 0 ? "+" : ""}
              {change}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
