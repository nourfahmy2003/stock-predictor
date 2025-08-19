"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const Spline = dynamic(() => import("@splinetool/react-spline/next"), { ssr: false })

export default function GalaxyInteractiveHeroBackground({ children, scene }) {
  const [mounted, setMounted] = useState(false)
  const [prefersReducedMotion, setPRM] = useState(false)

  useEffect(() => {
    setMounted(true)
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setPRM(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return (
    <div className="relative min-h-[100dvh]">
      {/* Fallback background to avoid fetch during render */}
      {!mounted || prefersReducedMotion ? (
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-slate-100 to-slate-200 dark:from-zinc-900 dark:via-zinc-950 dark:to-black" />
      ) : (
        <div className="absolute inset-0 -z-10">
          <Spline
            style={{ width: "100%", height: "100dvh", pointerEvents: "auto" }}
            scene={scene || "https://prod.spline.design/us3ALejTXl6usHZ7/scene.splinecode"}
          />
          <div className="absolute inset-0 pointer-events-none bg-white/40 dark:bg-black/40" />
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

