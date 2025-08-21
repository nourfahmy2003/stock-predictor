"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import FilingsHeader from "./FilingsHeader";
import FilingsList from "./FilingsList";
import FilingViewer from "./FilingViewer";
import FilingsEmpty from "./FilingsEmpty";
import FilingsError from "./FilingsError";

const fetcher = (path) => api(path);

export default function FilingsPanel({ ticker }) {
  const [type, setType] = useState(null);
  const [selected, setSelected] = useState(null);
  const { data: company } = useSWR(
    ticker ? `/filings/${ticker}/company` : null,
    fetcher,
    { dedupingInterval: 60_000 }
  );
  const { data, error, isLoading } = useSWR(
    ticker ? `/filings/${ticker}/list?types=10-K,10-Q,8-K,13F&limit=100` : null,
    fetcher,
    { dedupingInterval: 60_000 }
  );

  const filings = useMemo(() => {
    if (!data) return [];
    return data.filter((f) => !type || f.type === type);
  }, [data, type]);

  if (error) return <FilingsError message={error.message} />;
  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading filings…</div>;
  if (!filings || filings.length === 0) return <FilingsEmpty />;

  const lastDate = data[0]?.filed;
  const has13F = data.some((f) => f.type === "13F");

  return (
    <div className="space-y-4">
      <FilingsHeader
        company={company}
        type={type}
        onTypeChange={setType}
        lastDate={lastDate}
        has13F={has13F}
      />
      <FilingsList filings={filings} onSelect={setSelected} />
      {selected && (
        <FilingViewer
          ticker={ticker}
          filing={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
