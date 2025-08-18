"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function FeatureCard({ icon: Icon, title, description, className, delay = 0, ...props }) {
  return (
    <motion.div
      className={cn(
        "group relative p-6 rounded-2xl",
        "bg-white/10 dark:bg-white/5 backdrop-blur-sm",
        "border border-white/20 dark:border-white/10",
        "hover:bg-white/20 dark:hover:bg-white/10",
        "transition-all duration-300",
        "hover:shadow-xl hover:shadow-primary/10",
        "hover:-translate-y-1",
        "h-full flex flex-col",
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.6,
        delay,
        ease: "easeOut",
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
      {...props}
    >
      <div className="mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>

      <h3 className="text-xl font-semibold font-heading text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
        {title}
      </h3>

      <p className="text-muted-foreground leading-relaxed font-body flex-1">{description}</p>
    </motion.div>
  )
}
