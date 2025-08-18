"use client"

import React, { Suspense } from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"

const Spline = dynamic(
  () => import("@splinetool/react-spline/next"),
  { ssr: false }
);

export default function GalaxyInteractiveHeroBackground({ children }) {
  const { theme } = useTheme()
  const overlay =
    theme === "light"
      ? `linear-gradient(to right, rgba(255,255,255,0.6), transparent 30%, transparent 70%, rgba(255,255,255,0.6)),
         linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.75))`
      : `linear-gradient(to right, rgba(0,0,0,0.8), transparent 30%, transparent 70%, rgba(0,0,0,0.8)),
         linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.9))`


  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden">
        <Suspense fallback={null}>
          <Spline
            style={{ width: "100%", height: "100vh", pointerEvents: "auto" }}
            scene="https://prod.spline.design/us3ALejTXl6usHZ7/scene.splinecode"
          />
        </Suspense>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: overlay }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
