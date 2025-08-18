"use client";

import { Skeleton } from '@/components/ui/skeleton';

export function KpiRow({ data, loading }) {
  const cards = [
    { label: 'Price', value: data ? `$${data.price.toFixed(2)}` : null },
    { label: 'Daily Change', value: data ? `${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%` : null },
    { label: 'Volume', value: data ? data.volume.toLocaleString() : null },
    { label: 'Market Cap', value: data ? `$${(data.marketCap / 1e9).toFixed(2)}B` : null },
  ];

  return (
    <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value }) => (
        <div key={label} className="bg-card rounded-lg p-4 shadow-inner">
          <p className="text-sm text-muted">{label}</p>
          {loading ? (
            <Skeleton className="h-6 mt-2 w-24" />
          ) : (
            <p className="font-mono text-lg mt-1">{value ?? '--'}</p>
          )}
        </div>
      ))}
    </div>
  );
}
