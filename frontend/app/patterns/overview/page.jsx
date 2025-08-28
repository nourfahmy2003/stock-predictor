'use client';

import { useEffect, useState } from 'react';
import PriceChart from '@/components/stock/PriceChart';
import { api } from '@/lib/api';
import {
  INTERVAL_OPTIONS,
  REFRESH_MS,
  CHART_PARAMS,
} from '@/lib/chart-params';

export default function PatternsOverviewPage() {
  const [interval, setIntervalState] = useState('1y');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let timer;
    async function load() {
      setLoading(true);
      try {
        const json = await api(`/patterns/overview?interval=${interval}`);
        setItems(json.items || []);
        setSelected(json.items?.[0]?.symbol || null);
      } catch {
        setItems([]);
        setSelected(null);
      } finally {
        setLoading(false);
      }
    }
    load();
    const refresh = REFRESH_MS[interval] ?? 60000;
    timer = window.setInterval(load, refresh);
    return () => window.clearInterval(timer);
  }, [interval]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-3xl font-heading font-bold">Patterns Overview</h1>
      <div className="flex items-center space-x-2">
        <label htmlFor="interval" className="text-sm font-medium">
          Interval
        </label>
        <select
          id="interval"
          value={interval}
          onChange={(e) => setIntervalState(e.target.value)}
          className="border rounded px-2 py-1 bg-background"
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <div className="border rounded p-2">
          <PriceChart
            ticker={selected}
            range={CHART_PARAMS[interval].range}
            interval={CHART_PARAMS[interval].interval}
            refreshMs={REFRESH_MS[interval]}
            rangeKey={interval}
          />
        </div>
      )}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.symbol}
              className={`border rounded p-2 cursor-pointer ${
                selected === item.symbol ? 'bg-muted' : ''
              }`}
              onClick={() => setSelected(item.symbol)}
            >
              <span className="font-semibold">{item.symbol}</span>{' '}
              <span className="text-sm text-muted-foreground">
                {item.label} ({item.conf})
              </span>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-muted-foreground">No detections.</li>
          )}
        </ul>
      )}
    </div>
  );
}

