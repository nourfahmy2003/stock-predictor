"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NewsList } from "./news-list";

export default function LatestHeadlines({ ticker, limit = 10 }) {
  const [headlines, setHeadlines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!ticker) return;
    async function load() {
      try {
        setLoading(true);
        setErr(null);
        const json = await api(
          `/news/${ticker}?range=1w&analyze=1&page=1&per_page=${limit}`
        );
        const hs = (json.items || []).map((it) => ({
          title: it.title,
          source: it.source,
          timestamp: it.published,
          sentiment: it.sentiment,
          url: it.link,
        }));
        setHeadlines(hs);
      } catch (e) {
        setErr(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ticker, limit]);

  return (
    <div className="space-y-2 max-h-200 overflow-y-auto">
      {err && (
        <div className="text-sm text-red-500">
          Failed: {String(err.message || err)}
        </div>
      )}
      <NewsList ticker={ticker} headlines={headlines} isLoading={loading} />
      <div className="pt-2 text-center">
        <a
          href={`/t/${ticker}?tab=news`}
          className="text-sm text-blue-500 hover:underline"
        >
          View all news
        </a>
      </div>
    </div>
  );
}

