"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function FeatureCard({
  icon: Icon,
  title,
  description,
  color = "text-primary",
  bgColor = "bg-primary/10",
  className,
  index = 0,
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card
        className={cn(
          "glass h-full group cursor-pointer",
          "hover:bg-white/20 dark:hover:bg-white/10",
          "transition-all duration-300",
          "border-white/20 dark:border-white/10",
          className,
        )}
        {...props}
      >
        <CardHeader className="text-center pb-4">
          <motion.div
            className={cn(
              "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4",
              "shadow-lg group-hover:shadow-xl transition-all duration-300",
              bgColor,
            )}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Icon className={cn("size-8", color)} />
          </motion.div>
          <CardTitle className="font-heading text-lg group-hover:text-primary transition-colors">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
