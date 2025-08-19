"use client"

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import debounce from "lodash.debounce";
import { LineChart, Bitcoin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function SearchBar({ className }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  const debounced = useCallback(
    debounce((v) => setQuery(v), 200),
    [],
  );

  const onChange = (e) => {
    const v = e.target.value;
    setValue(v);
    debounced(v);
    setOpen(true);
  };

  const { data, isLoading } = useSWR(
    query ? `/api/symbols/search?q=${encodeURIComponent(query)}` : null,
    fetcher,
    { dedupingInterval: 30000 },
  );

  const items = data?.items || [];
  const groups = { stock: [], etf: [], crypto: [] };
  items.forEach((it) => groups[it.type]?.push(it));

  const flat = [
    ...(groups.stock.length ? [{ type: "header", label: "Stocks" }, ...groups.stock] : []),
    ...(groups.etf.length ? [{ type: "header", label: "ETFs" }, ...groups.etf] : []),
    ...(groups.crypto.length ? [{ type: "header", label: "Crypto" }, ...groups.crypto] : []),
  ];

  useEffect(() => {
    if (!open) setActive(null);
  }, [open]);

  const move = (dir) => {
    if (!open || flat.length === 0) return;
    let idx = active == null ? (dir > 0 ? 0 : flat.length - 1) : active + dir;
    while (flat[idx] && flat[idx].type === "header") idx += dir;
    if (idx < 0 || idx >= flat.length) return;
    setActive(idx);
  };

  const handleKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter" && active != null) {
      e.preventDefault();
      const item = flat[active];
      if (item && item.symbol) select(item);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const select = (item) => {
    setOpen(false);
    setValue("");
    setQuery("");
    const path = `/t/${item.symbol}`;
    router.push(path);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls="symbol-listbox"
        aria-activedescendant={active != null ? `option-${active}` : undefined}
        aria-autocomplete="list"
        placeholder="Search symbols..."
        value={value}
        onChange={onChange}
        onKeyDown={handleKey}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        className="pr-8"
      />
      {open && (
        <div
          id="symbol-listbox"
          role="listbox"
          className="absolute z-50 mt-2 w-full max-h-80 overflow-auto rounded-xl border bg-background text-foreground shadow-md"
        >
          {isLoading && (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          )}
          {!isLoading && flat.length === 0 && query && (
            <div className="p-4 text-sm text-muted-foreground">
              No results for {query}. Try another symbol.
            </div>
          )}
          {!isLoading && flat.length > 0 && (
            <ul>
              {flat.map((item, idx) => {
                if (item.type === "header") {
                  return (
                    <li
                      key={`h-${item.label}`}
                      className="sticky top-0 z-10 bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {item.label}
                    </li>
                  );
                }
                const activeItem = idx === active;
                const Icon = item.type === "crypto" ? Bitcoin : LineChart;
                return (
                  <li
                    id={`option-${idx}`}
                    key={`${item.symbol}-${item.exchange}`}
                    role="option"
                    aria-selected={activeItem}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm",
                      activeItem && "bg-accent text-accent-foreground",
                    )}
                    onMouseEnter={() => setActive(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(item)}
                  >
                    <Icon className="size-4" />
                    <span className="font-mono font-medium">{item.symbol}</span>
                    <span className="text-muted-foreground truncate flex-1">{item.name}</span>
                    <span className="text-xs rounded bg-muted px-1.5 py-0.5">{item.exchange}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
