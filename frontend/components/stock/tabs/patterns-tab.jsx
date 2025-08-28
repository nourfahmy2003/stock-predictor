import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, API_BASE } from "@/lib/api";

const INTERVAL_OPTS = [
  { value: "1d", label: "1D" },
  { value: "1h", label: "1H" },
  { value: "5m", label: "5m" },
  { value: "1m", label: "1m" },
];

const REFRESH_MS = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

// Simple placeholder tab for future YOLO-based pattern detection.
export function PatternsTab({ ticker }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [interval, setIntervalState] = useState("1d");
  const [file, setFile] = useState(null);

  async function runDetection(currentInterval = interval) {
    if (!ticker && !file) return;
    setLoading(true);
    setErr(null);
    try {
      let data;
      if (file) {
        const fd = new FormData();
        if (ticker) fd.append("symbol", ticker);
        fd.append("interval", currentInterval);
        fd.append("image", file);
        const res = await fetch(`${API_BASE}/patterns/detect`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      } else {
        data = await api(
          `/patterns/detect?symbol=${encodeURIComponent(ticker)}&interval=${currentInterval}`
        );
      }
      setResult(data);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ticker) return;
    let timer;
    runDetection(interval);
    const refresh = REFRESH_MS[interval] ?? 60000;
    timer = window.setInterval(() => runDetection(interval), refresh);
    return () => window.clearInterval(timer);
  }, [ticker, interval]);

  return (
    <div className="space-y-4" aria-busy={loading}>
      <div className="flex items-center gap-2">
        <label htmlFor="interval" className="text-sm font-medium">
          Interval
        </label>
        <select
          id="interval"
          value={interval}
          onChange={(e) => setIntervalState(e.target.value)}
          className="border rounded px-2 py-1 bg-background"
        >
          {INTERVAL_OPTS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-sm"
        />
        <Button onClick={() => runDetection()} disabled={loading} variant="secondary">
          {loading ? "Detecting…" : "Detect"}
        </Button>
      </div>
      {err && <div className="text-sm text-red-500">{String(err.message || err)}</div>}
      {result && (
        <pre className="text-xs p-2 rounded bg-muted overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      {!loading && !err && !result && (
        <div className="text-sm text-muted-foreground">No detection yet.</div>
      )}
    </div>
  );
}
