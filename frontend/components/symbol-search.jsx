"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export default function SymbolSearch({ defaultQuery = "", onSelect }) {
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
    <div className="relative w-full">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => q && setOpen(true)}
        onKeyDown={onKey}
        placeholder="Search Yahoo symbols (e.g., AAPL, BTC-USD, VOD.L)"
        className="w-full px-3 py-2 rounded-xl border bg-background"
      />
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
