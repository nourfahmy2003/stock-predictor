"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

export default function BackgroundFX() {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const { theme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    const nodes = []
    const connections = []

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Resize canvas to full viewport
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Create neural network nodes
    const createNodes = () => {
      const nodeCount = prefersReducedMotion ? 15 : 25
      nodes.length = 0

      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * (prefersReducedMotion ? 0.2 : 0.5),
          vy: (Math.random() - 0.5) * (prefersReducedMotion ? 0.2 : 0.5),
          radius: Math.random() * 2 + 1,
          opacity: Math.random() * 0.3 + 0.1,
        })
      }
    }

    // Create connections between nearby nodes
    const updateConnections = () => {
      connections.length = 0
      const maxDistance = 150

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < maxDistance) {
            connections.push({
              from: nodes[i],
              to: nodes[j],
              opacity: (1 - distance / maxDistance) * 0.1,
              pulse: Math.sin(Date.now() * 0.001 + i + j) * 0.05 + 0.05,
            })
          }
        }
      }
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update node positions
      nodes.forEach((node) => {
        node.x += node.vx
        node.y += node.vy

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        // Keep nodes in bounds
        node.x = Math.max(0, Math.min(canvas.width, node.x))
        node.y = Math.max(0, Math.min(canvas.height, node.y))
      })

      updateConnections()

      // Draw connections with pulsing effect
      const isDark = theme === "dark"
      const connectionColor = isDark ? "99, 165, 255" : "30, 144, 255"

      connections.forEach((conn) => {
        if (!prefersReducedMotion) {
          const pulseOpacity = conn.opacity + conn.pulse
          ctx.strokeStyle = `rgba(${connectionColor}, ${pulseOpacity})`
        } else {
          ctx.strokeStyle = `rgba(${connectionColor}, ${conn.opacity})`
        }

        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(conn.from.x, conn.from.y)
        ctx.lineTo(conn.to.x, conn.to.y)
        ctx.stroke()
      })

      // Draw nodes
      const nodeColor = isDark ? "99, 165, 255" : "30, 144, 255"
      nodes.forEach((node) => {
        ctx.fillStyle = `rgba(${nodeColor}, ${node.opacity})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      if (!prefersReducedMotion) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    createNodes()
    animate()

    // If reduced motion, only animate once every few seconds
    if (prefersReducedMotion) {
      const interval = setInterval(animate, 3000)
      return () => {
        clearInterval(interval)
        window.removeEventListener("resize", resizeCanvas)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.4 }}
      aria-hidden="true"
    />
  )
}
