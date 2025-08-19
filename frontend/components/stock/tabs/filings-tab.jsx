"use client"

import { useState, useEffect } from "react"
import { FileText, ExternalLink, Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function FilingsTab({ ticker }) {
  const [filings, setFilings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock API call - in real app, this would fetch from /api/filings/{ticker}
    const fetchFilings = async () => {
      setLoading(true)

      await new Promise((resolve) => setTimeout(resolve, 800))

      const mockFilings = [
        {
          id: "1",
          type: "10-K",
          description: "Annual Report",
          date: "2024-02-15",
          url: "#",
        },
        {
          id: "2",
          type: "10-Q",
          description: "Quarterly Report - Q3 2024",
          date: "2024-01-20",
          url: "#",
        },
        {
          id: "3",
          type: "8-K",
          description: "Current Report - Earnings Release",
          date: "2024-01-15",
          url: "#",
        },
        {
          id: "4",
          type: "DEF 14A",
          description: "Proxy Statement",
          date: "2024-01-10",
          url: "#",
        },
        {
          id: "5",
          type: "10-Q",
          description: "Quarterly Report - Q2 2024",
          date: "2023-12-18",
          url: "#",
        },
      ]

      setFilings(mockFilings)
      setLoading(false)
    }

    fetchFilings()
  }, [ticker])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading font-semibold">SEC Filings for {ticker}</h3>
        <p className="text-sm text-muted-foreground">{filings.length} recent filings</p>
      </div>

      <div className="space-y-3">
        {filings.map((filing) => (
          <Card key={filing.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="size-5 text-primary" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-primary">{filing.type}</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(filing.date).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-medium text-foreground">{filing.description}</h4>
                </div>
              </div>

              <Button variant="outline" size="sm" className="shrink-0 bg-transparent">
                View Filing
                <ExternalLink className="size-3 ml-2" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
