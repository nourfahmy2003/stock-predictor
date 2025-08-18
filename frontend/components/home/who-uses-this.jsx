"use client"

import { motion } from "framer-motion"
import { GraduationCap, Users, Briefcase } from "lucide-react"

export default function WhoUsesThis() {
  const users = [
    {
      icon: GraduationCap,
      label: "Students",
      description: "Learn market analysis and build investment knowledge",
    },
    {
      icon: Users,
      label: "Retail Investors",
      description: "Make informed decisions with professional-grade tools",
    },
    {
      icon: Briefcase,
      label: "Analysts",
      description: "Enhance research with AI-powered insights and data",
    },
  ]

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto text-center">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Trusted by Investors at Every Level</h2>
          <p className="text-lg text-muted-foreground font-body">
            From beginners to professionals, MarketPulse provides the insights you need
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {users.map((user, index) => (
            <motion.div
              key={user.label}
              className="flex flex-col items-center text-center max-w-xs"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <user.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold font-heading text-foreground mb-2">{user.label}</h3>
              <p className="text-sm text-muted-foreground font-body">{user.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
