"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const RANGES = [
  { label: "1W", value: "1w" },
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "9M", value: "9m" },
  { label: "1Y", value: "1y" },
];

function SentimentPill({ s }) {
  const base = "px-2 py-0.5 rounded-full text-xs";
  if (s === "positive")
    return <span className={`${base} bg-green-600/20 text-green-400`}>positive</span>;
  if (s === "negative")
    return <span className={`${base} bg-red-600/20 text-red-400`}>negative</span>;
  return <span className={`${base} bg-zinc-600/20 text-zinc-300`}>neutral</span>;
}

export default function NewsPanel({ ticker }) {
  const [range, setRange] = useState("1w");
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const json = await api(
        `/news/${ticker}?range=${range}&analyze=1&page=${page}&per_page=${perPage}`
      );
      console.log("News API result", json);
      if (json?.items) {
        console.log(
          "Sentiment summary",
          json.items.map(({ title, sentiment, confidence }) => ({
            title,
            sentiment,
            confidence,
          }))
        );
      }
      setData(json);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ticker) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, range, page]);
  useEffect(() => {
    setPage(1);
  }, [range, ticker]);
  return (
    <div className="space-y-4 text-zinc-900 dark:text-zinc-100">
      <div className="flex gap-2 flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-3 py-1 rounded border border-zinc-700/40 ${
              range === r.value ? "bg-zinc-900 text-white" : "bg-transparent"
            }`}
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto px-3 py-1 rounded border border-zinc-700/40"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-sm opacity-70">Loading news…</div>}
      {err && (
        <div className="text-sm text-red-500">
          Failed: {String(err.message || err)}
        </div>
      )}
      {!loading && !err && (!data || data.items?.length === 0) && (
        <div className="text-sm opacity-70">No recent articles.</div>
      )}

      {data?.items?.length > 0 && (
        <>
          <ul className="space-y-3">
            {data.items.map((it, i) => (
              <li
                key={i}
                className="rounded border border-zinc-800/40 p-3 bg-white/50 dark:bg-zinc-900/30"
              >
                <div className="text-xs flex items-center gap-2">
                  <SentimentPill s={it.sentiment} />
                  {it.source && <span className="opacity-70">{it.source}</span>}
                  {it.published && (
                    <span className="opacity-60">
                      • {new Date(it.published).toLocaleString()}
                    </span>
                  )}
                </div>
                <a
                  href={it.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-1 hover:underline"
                >
                  {it.title || "(untitled)"}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded border border-zinc-700/40 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm opacity-70">
              Page {page} of {Math.max(1, Math.ceil((data.total || 0) / perPage))}
            </span>
            <button
              onClick={() =>
                setPage((p) =>
                  data && data.total > p * perPage ? p + 1 : p
                )
              }
              disabled={!data || data.total <= page * perPage}
              className="px-3 py-1 rounded border border-zinc-700/40 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

