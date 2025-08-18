"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function AnimatedTabs({ tabs, activeTab, onTabChange, className }) {
  return (
    <div className={cn("border-b border-border", className)}>
      <nav className="flex space-x-8" role="tablist">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative py-4 px-1 text-sm font-medium transition-colors duration-200",
              "hover:text-primary focus:outline-none focus-ring",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
            whileHover={{ y: -1 }}
            whileTap={{ y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                layoutId="activeTab"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  duration: 0.3,
                }}
              />
            )}
          </motion.button>
        ))}
      </nav>
    </div>
  )
}
