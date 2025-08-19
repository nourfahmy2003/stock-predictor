"use client"

import { useEffect, useState } from 'react'
import { NewsList } from './news-list'
import { toast } from 'sonner'

export default function LatestHeadlines({ ticker }) {
  const [headlines, setHeadlines] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    const timer = setTimeout(() => {
      const news = generateMockNews(ticker)
      setHeadlines(news)
      setLoading(false)
      toast.success('Latest headlines loaded', {
        description: `Found ${news.length} recent articles for ${ticker}`,
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [ticker])

  const generateMockNews = (symbol) => [
    {
      title: `${symbol} Reports Strong Quarterly Earnings Beat`,
      source: 'Financial Times',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      sentiment: 'positive',
      url: '#',
    },
    {
      title: `Analysts Upgrade ${symbol} Price Target`,
      source: 'Reuters',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      sentiment: 'positive',
      url: '#',
    },
    {
      title: `${symbol} Announces New Product Launch`,
      source: 'Bloomberg',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      sentiment: 'neutral',
      url: '#',
    },
    {
      title: `Market Volatility Affects ${symbol} Trading`,
      source: 'CNBC',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
      sentiment: 'negative',
      url: '#',
    },
  ]

  return <NewsList ticker={ticker} headlines={headlines} isLoading={loading} />
}
