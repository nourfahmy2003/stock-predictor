"use client"

import React, { lazy, Suspense } from "react"
const Spline = lazy(() => import("@splinetool/react-spline"))

export default function GalaxyInteractiveHeroBackground({ children }) {
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
          style={{
            background: `\
              linear-gradient(to right, rgba(0,0,0,0.8), transparent 30%, transparent 70%, rgba(0,0,0,0.8)),\
              linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.9))
            `,
          }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
