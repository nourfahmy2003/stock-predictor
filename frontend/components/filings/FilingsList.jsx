"use client";

import { useState, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function FilingsList({ filings, onSelect }) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(20);
  const refs = useRef([]);

  const list = useMemo(() => {
    return filings.filter((f) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        f.type.toLowerCase().includes(q) ||
        (f.period && f.period.toLowerCase().includes(q)) ||
        f.filed.toLowerCase().includes(q) ||
        f.accession.toLowerCase().includes(q)
      );
    });
  }, [filings, query]);

  function handleKey(e, idx, filing) {
    if (e.key === "Enter") {
      onSelect(filing);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      refs.current[idx + 1]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      refs.current[idx - 1]?.focus();
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search filings..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setVisible(20);
        }}
        className="max-w-sm"
      />
      <ul role="list" className="divide-y divide-border">
        {list.slice(0, visible).map((f, idx) => (
          <li
            key={f.accession}
            role="listitem"
            tabIndex={0}
            ref={(el) => (refs.current[idx] = el)}
            onKeyDown={(e) => handleKey(e, idx, f)}
            className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 outline-none focus:bg-accent/30"
          >
            <div className="flex items-center gap-2 flex-1">
              <Badge>{f.type}</Badge>
              <span className="text-sm">{f.filed}</span>
              {f.period && (
                <span className="text-sm text-muted-foreground">Period {f.period}</span>
              )}
              <span className="text-xs text-muted-foreground hidden md:inline">
                {f.accession}
              </span>
              {f.size && (
                <span className="text-xs text-muted-foreground">
                  {(f.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => onSelect(f)}>
                Open
              </Button>
              <a
                href={f.urlHtml || f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-sm border border-border rounded"
              >
                Download
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(f.urlHtml || f.url)}
                className="px-2 py-1 text-sm border border-border rounded"
              >
                Copy
              </button>
            </div>
          </li>
        ))}
      </ul>
      {visible < list.length && (
        <div className="flex justify-center">
          <button
            onClick={() => setVisible((v) => v + 20)}
            className="px-3 py-1 text-sm border border-border rounded"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
