"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export default function SymbolSearch({ defaultQuery = "", onSelect, className = "" }) {
  const [q, setQ] = useState(defaultQuery);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const timer = useRef(null);

  useEffect(() => {
    if (!q) { setItems([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await api(`/symbols/search?q=${encodeURIComponent(q)}`);
        setItems(res.items || []);
        setOpen(true);
        setIdx(res.items?.length ? 0 : -1);
      } catch {
        setItems([]); setOpen(true); setIdx(-1);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q]);

  const pick = (it) => {
    setOpen(false);
    setQ(it.symbol);
    onSelect?.(it);
  };

  const onKey = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && idx >= 0) { e.preventDefault(); pick(items[idx]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  const highlight = (text) => {
    if (!q) return text;
    const i = text.toUpperCase().indexOf(q.toUpperCase());
    if (i === -1) return text;
    return (
      <>
        {text.slice(0, i)}
        <span className="underline">{text.slice(i, i + q.length)}</span>
        {text.slice(i + q.length)}
      </>
    );
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white/90 shadow-sm ring-1 ring-black/[0.02] backdrop-blur px-4 py-3 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/80 dark:ring-white/[0.04] dark:hover:border-neutral-700">
        <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => q && setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search Yahoo symbols (e.g., AAPL, BTC-USD, VOD.L)"
          aria-label="Search symbols"
          className="w-full bg-transparent text-base text-neutral-900 placeholder:text-neutral-400 outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-0 rounded-xl"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover shadow-lg max-h-80 overflow-auto">
          {items.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No Yahoo symbols found.</div>
          ) : items.map((it, i) => (
            <button
              key={it.symbol}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(it)}
              className={`w-full text-left px-3 py-2 hover:bg-accent ${i===idx ? "bg-accent" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono font-semibold">{highlight(it.symbol)}</div>
                  <div className="text-xs text-muted-foreground truncate">{highlight(it.name)}</div>
                </div>
                <div className="flex gap-2">
                  {it.exchangeDisp && <span className="text-[10px] px-2 py-0.5 rounded-full border">{it.exchangeDisp}</span>}
                  {it.type && <span className="text-[10px] px-2 py-0.5 rounded-full border">{it.type}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
