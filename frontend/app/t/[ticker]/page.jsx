"use client";

import { useState, Suspense, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AnimatedTabs } from "@/components/stock/animated-tabs";
import HeaderPrice from "@/components/stock/HeaderPrice";
import { OverviewSection } from "@/components/stock/overview-section";
import dynamic from "next/dynamic";
const PriceChart = dynamic(() => import("@/components/stock/PriceChart"), { ssr: false });
import LatestHeadlines from "@/components/stock/LatestHeadlines";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import FilingsPanel from "@/components/filings/FilingsPanel";

const PredictionPanel = dynamic(() => import("@/components/stock/prediction-panel"), { ssr: false });

const PatternsPanel = dynamic(
  () => import("@/components/stock/patterns-panel").then((m) => m.PatternsPanel),
  { ssr: false }
);
const NewsPanel = dynamic(
  () => import("@/components/stock/news-panel"),
  { ssr: false }
);

export default function TickerPage() {
  const params = useParams()
  const ticker = params.ticker?.toString().toUpperCase()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('overview')
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    if (!ticker) return;
    async function startPrediction() {
      try {
        const body = { ticker, look_back: 60, horizon: 10 };
        const res = await api(`/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const jobId = res.jobId || res.job_id || res.id;
        if (jobId) {
          localStorage.setItem(`predjob:${ticker}`, JSON.stringify({ jobId, startedAt: Date.now() }));
        }
      } catch (e) {
        console.error("failed to start prediction", e);
      }
    }
    startPrediction();
  }, [ticker]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'filings', label: 'Filings' },
    { id: 'news', label: 'News' },
    { id: 'predictions', label: 'Predictions' },
    { id: 'patterns', label: 'Patterns (YOLO)' },
  ]

  if (!ticker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground">Invalid ticker symbol</p>
      </div>
    )
  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8 space-y-2">
        <h1 className="text-4xl font-bold font-heading">{ticker}</h1>
        <HeaderPrice ticker={ticker} />
      </header>

      <div className={`grid grid-cols-1 gap-8 ${activeTab !== 'news' ? 'lg:grid-cols-4' : ''}`}>
        <div className={activeTab !== 'news' ? 'lg:col-span-3' : ''}>
          <AnimatedTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="mb-6"
          />

          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-4">
                    <OverviewSection ticker={ticker} />
                  </CardContent>
                </Card>

                <PriceChart ticker={ticker} />
              </div>
            )}

            {activeTab === 'news' && <NewsPanel ticker={ticker} />}

            {activeTab === 'predictions' && (
              <Suspense
                fallback={
                  <div className="text-sm opacity-70">
                    Running prediction… this can take a few minutes.
                  </div>
                }
              >
                <PredictionPanel ticker={ticker} />
              </Suspense>
            )}

            {activeTab === 'patterns' && (
              <Suspense fallback={<div className="text-sm opacity-70">Loading patterns…</div>}>
                <PatternsPanel ticker={ticker} />
              </Suspense>
            )}

            {activeTab === 'filings' && (
              <Card>
                <CardContent className="p-4">
                  <FilingsPanel ticker={ticker} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {activeTab !== 'news' && (
          <div className="lg:col-span-1">
            <Card className="sticky top-24 h-[calc(100vh-8rem)] flex flex-col">
              <CardHeader className="shrink-0 pb-3">
                <CardTitle className="text-lg font-heading">Latest Headlines</CardTitle>
              </CardHeader>

              {/* This is the scrolling region */}
              <CardContent className=" flex-1 overflow-y-auto pr-5">
                <LatestHeadlines ticker={ticker} limit={20} />
              </CardContent>
            </Card>
          </div>

        )}
      </div>
    </div>
  )
}
