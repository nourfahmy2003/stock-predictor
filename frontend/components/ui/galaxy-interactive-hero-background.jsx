"use client"

export default function GalaxyInteractiveHeroBackground({ children }) {
  return (
    <div className="relative min-h-[100dvh]">
      {/* static, theme-aware gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-slate-100 to-slate-200 dark:from-zinc-900 dark:via-zinc-950 dark:to-black" />
      {/* subtle overlay to match old look */}
      <div className="absolute inset-0 pointer-events-none bg-white/40 dark:bg-black/40" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
