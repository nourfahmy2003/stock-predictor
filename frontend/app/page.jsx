"use client";

import { useState } from 'react';
import { HomeHero } from '@/components/blocks/HomeHero';
import { KpiRow } from '@/components/blocks/KpiRow';
import { PredictionPanel } from '@/components/blocks/PredictionPanel';
import { ToastOnSearch } from '@/components/blocks/ToastOnSearch';

export default function HomePage() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ticker, setTicker] = useState(null);

  const handleSearch = async (symbol) => {
    setTicker(symbol);
    setLoading(true);
    try {
      const res = await fetch(`/api/quote/${symbol}`);
      const data = await res.json();
      setQuote({
        price: data.price,
        changePercent: data.changePercent,
        volume: data.volume,
        marketCap: data.marketCap,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <HomeHero onSearch={handleSearch} />
      <KpiRow data={quote} loading={loading} />
      <ToastOnSearch trigger={!!quote && !loading} />
      <PredictionPanel ticker={ticker} />
    </div>
  );
}
