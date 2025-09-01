"use client"

import { motion } from "framer-motion"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import SymbolSearch from "@/components/symbol-search"
import { api } from "@/lib/api"

// ✅ Load the WebGL background only on the client
const GalaxyInteractiveHeroBackground = dynamic(
  () => import("@/components/ui/galaxy-interactive-hero-background"),
  { ssr: false }
)

export default function HomeHero() {
  const router = useRouter()
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* BACKGROUND: full-bleed, behind content */}
      <div className="absolute inset-0">
        <GalaxyInteractiveHeroBackground
          hue={0}                 // tweak if you want a different palette
          hoverIntensity={0.25}   // subtle wobble
          rotateOnHover={true}
          forceHoverState={false}
        />
      </div>

      {/* FOREGROUND CONTENT */}
      <div className="relative z-10 text-center mx-auto max-w-3xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-heading font-extrabold tracking-tight leading-[0.95] text-neutral-900 drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)] dark:text-white dark:drop-shadow-none">
            <span>AI-Powered</span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-300">
              Stock Analysis
            </span>
          </h1>
        </motion.div>

        <motion.p
          className="mt-6 max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-neutral-600 dark:text-neutral-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          Get instant insights on any stock with our AI-powered analysis. Search, predict, and make informed investment
          decisions.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          <SymbolSearch
            className="mt-8 w-full sm:max-w-xl mx-auto"
            onSelect={async (it) => {
              try {
                const v = await api(`/symbols/validate?symbol=${encodeURIComponent(it.symbol)}`);
                if (v.valid) {
                  router.push(`/t/${it.symbol}`);
                } else {
                  toast.error("This symbol is not available on Yahoo right now.");
                }
              } catch {
                toast.error("This symbol is not available on Yahoo right now.");
              }
            }}
          />
        </motion.div>

        <motion.p
          className="mt-6 text-sm text-neutral-600 dark:text-neutral-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          Try searching for popular stocks like AAPL, GOOGL, or TSLA
        </motion.p>
      </div>
    </section>
  )
}
