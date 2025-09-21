"use client"

import { BarChart3, Target, Layers, Newspaper } from "lucide-react"
import FeatureCard from "./feature-card"

export default function KeyActions() {
  const actions = [
    {
      icon: BarChart3,
      title: "Run Trend Scan",
      description:
        "Instantly evaluate moving averages, MACD, RSI, and more to understand who controls the tape right now.",
    },
    {
      icon: Layers,
      title: "Map Key Levels",
      description:
        "Auto-detect pivots and volatility regimes so you know which prices matter before you place a trade.",
    },
    {
      icon: Target,
      title: "Build Trade Plan",
      description:
        "Generate entry ideas, stops, and targets backed by indicator consensus and risk notes in plain English.",
    },
    {
      icon: Newspaper,
      title: "Latest News",
      description:
        "Stay informed with curated news, earnings reports, and market sentiment analysis for your tracked stocks.",
    },
  ]

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-heading mb-4">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Analyze Stocks
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-body">
            Powerful tools and AI-driven insights to help you make smarter investment decisions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {actions.map((action, index) => (
            <FeatureCard
              key={action.title}
              icon={action.icon}
              title={action.title}
              description={action.description}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
