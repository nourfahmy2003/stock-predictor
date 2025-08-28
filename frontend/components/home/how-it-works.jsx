"use client"

import { motion } from "framer-motion"
import { Search, Brain, BarChart3 } from "lucide-react"

export default function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: "Search a Ticker",
      description: "Enter any stock symbol to start your analysis journey",
    },
    {
      icon: Brain,
      title: "Run AI Prediction",
      description: "Our advanced algorithms analyze market data and generate forecasts",
    },
    {
      icon: BarChart3,
      title: "Detect Patterns",
      description: "Identify classical chart patterns using YOLOv8",
    },
  ]

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground font-body">
            Get started with AI-powered stock analysis in three simple steps
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line for desktop */}
          <div className="hidden md:block absolute top-8 left-1/2 transform -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                className="text-center relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                {/* Step number */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-sm font-bold text-accent-foreground">
                    {index + 1}
                  </div>
                </div>

                <h3 className="text-xl font-semibold font-heading text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground font-body">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
