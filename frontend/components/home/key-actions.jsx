"use client"

import { BarChart3, Brain, TrendingUp, Newspaper } from "lucide-react"
import FeatureCard from "./feature-card"

export default function KeyActions() {
  const actions = [
    {
      icon: BarChart3,
      title: "Explore Data",
      description:
        "Dive deep into stock prices, trading volumes, and market trends with interactive charts and real-time data.",
    },
    {
      icon: Brain,
      title: "Train Model",
      description:
        "Let our AI analyze historical patterns and market signals to create personalized prediction models for any stock.",
    },
    {
      icon: TrendingUp,
      title: "View Predictions",
      description:
        "Get clear, actionable forecasts with confidence intervals and risk assessments to guide your decisions.",
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
