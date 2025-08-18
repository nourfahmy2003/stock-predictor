"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function StatCard({ title, value, change, changeType, description, tooltip, trend, className }) {
  const getChangeColor = (type) => {
    switch (type) {
      case "positive":
        return "text-success"
      case "negative":
        return "text-danger"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <motion.div whileHover={{ y: -2, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
      <Card className={cn("glass border-white/20 dark:border-white/10 hover-glow", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {title}
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="size-3 text-muted-foreground hover:text-primary transition-colors" />
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
            <motion.div
              className="text-2xl font-bold font-mono"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {value}
            </motion.div>
            {change && (
              <motion.div
                className={cn("text-sm font-medium", getChangeColor(changeType))}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {change}
              </motion.div>
            )}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
