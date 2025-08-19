"use client"

import * as React from "react"
import { Calendar, Play, Pause, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

export function TimeTravelSlider({ onDateChange, className, isPlaying = false, onPlayToggle }) {
  const [currentIndex, setCurrentIndex] = React.useState(100) // Start at present (100%)
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(false)

  // Generate date range (last 2 years)
  const dateRange = React.useMemo(() => {
    const dates = []
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 2 * 365 * 24 * 60 * 60 * 1000)

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
      // Weekly intervals
      dates.push(new Date(d))
    }
    return dates
  }, [])

  const currentDate = React.useMemo(() => {
    const index = Math.floor((currentIndex / 100) * (dateRange.length - 1))
    return dateRange[index] || new Date()
  }, [currentIndex, dateRange])

  React.useEffect(() => {
    onDateChange?.(currentDate)
  }, [currentDate, onDateChange])

  React.useEffect(() => {
    let interval
    if (isAutoPlaying && currentIndex < 100) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1
          if (next >= 100) {
            setIsAutoPlaying(false)
            return 100
          }
          return next
        })
      }, 200) // Fast playback
    }
    return () => clearInterval(interval)
  }, [isAutoPlaying, currentIndex])

  const handlePlayToggle = () => {
    setIsAutoPlaying(!isAutoPlaying)
    onPlayToggle?.()
  }

  const handleReset = () => {
    setCurrentIndex(100)
    setIsAutoPlaying(false)
  }

  return (
    <div className={cn("space-y-4 p-4 bg-card/50 backdrop-blur-sm rounded-xl border", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="size-4 text-primary" />
          Time Travel
        </div>
        <div className="text-sm text-muted-foreground font-mono">
          {currentDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Slider
          value={[currentIndex]}
          onValueChange={([value]) => setCurrentIndex(value)}
          max={100}
          min={0}
          step={1}
          className="w-full"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePlayToggle} disabled={currentIndex >= 100}>
              {isAutoPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
              {isAutoPlaying ? "Pause" : "Play"}
            </Button>

            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="size-3" />
              Reset
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">{currentIndex < 100 ? "Historical View" : "Present Day"}</div>
        </div>
      </div>
    </div>
  )
}
