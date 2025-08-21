"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const fetcher = (path) => api(path);

export default function FilingViewer({ ticker, filing, onClose }) {
  const [tab, setTab] = useState("highlights");
  const { data: doc } = useSWR(
    filing ? `/filings/${ticker}/doc?accession=${filing.accession}` : null,
    fetcher,
    { dedupingInterval: 60_000 }
  );
  const { data: highlights } = useSWR(
    filing ? `/filings/${ticker}/highlights?accession=${filing.accession}` : null,
    fetcher,
    { dedupingInterval: 60_000 }
  );

  useEffect(() => {
    if (!filing) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [filing, onClose]);

  if (!filing) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex" role="dialog" aria-modal="true">
      <div className="ml-auto w-full h-full max-w-3xl bg-background border-l border-border flex flex-col">
        <div className="p-4 border-b border-border sticky top-0 bg-background flex items-center gap-2">
          <div className="flex-1">
            <h3 className="font-heading">{filing.type} – {filing.filed}</h3>
            <p className="text-xs text-muted-foreground">{filing.accession}</p>
          </div>
          <a
            href={filing.urlHtml || filing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 text-sm border border-border rounded"
          >
            SEC
          </a>
          <button
            onClick={() => navigator.clipboard.writeText(filing.urlHtml || filing.url)}
            className="px-2 py-1 text-sm border border-border rounded"
          >
            Copy
          </button>
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("highlights")}
            className={`px-4 py-2 text-sm border-r border-border ${
              tab === "highlights" ? "bg-muted" : ""
            }`}
          >
            Highlights
          </button>
          <button
            onClick={() => setTab("full")}
            className={`px-4 py-2 text-sm ${tab === "full" ? "bg-muted" : ""}`}
          >
            Full Text
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm space-y-4">
          {tab === "full" && (
            <pre className="whitespace-pre-wrap font-mono">
              {doc?.text || "Loading..."}
            </pre>
          )}
          {tab === "highlights" && (
            highlights ? (
              <div className="space-y-6">
                {Object.entries({
                  mdna: "MD&A",
                  risks: "Risk Factors",
                  liquidity: "Liquidity",
                  business: "Business",
                }).map(([key, label]) => {
                  const h = highlights[key];
                  if (!h) return null;
                  return (
                    <section key={key}>
                      <h4 className="font-medium mb-1">{label}</h4>
                      <p className="whitespace-pre-wrap">{h.excerpt}</p>
                    </section>
                  );
                })}
                {!Object.values(highlights).some(Boolean) && (
                  <p className="text-sm text-muted-foreground">No highlights found.</p>
                )}
              </div>
            ) : (
              <p>Loading...</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
