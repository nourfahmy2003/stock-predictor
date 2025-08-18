"use client"

import { motion } from "framer-motion"

export default function Footer() {
  const links = [
    { label: "About", href: "/about" },
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
  ]

  return (
    <footer className="py-12 px-4 border-t border-border/50 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="flex flex-col md:flex-row items-center justify-between gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold font-heading text-foreground mb-1">MarketPulse</h3>
            <p className="text-sm text-muted-foreground font-body">AI-powered stock analysis for everyone</p>
          </div>

          <nav className="flex gap-6">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 font-body"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </motion.div>

        <motion.div
          className="mt-8 pt-6 border-t border-border/30 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="text-xs text-muted-foreground font-body">© 2024 MarketPulse. All rights reserved.</p>
        </motion.div>
      </div>
    </footer>
  )
}
