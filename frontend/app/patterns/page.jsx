"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { API_BASE } from "@/lib/api";
import {
  FRIENDLY_LABELS,
  NORMALIZE,
  computeInsights,
  buildGamePlan,
} from "@/lib/patterns";

export default function PatternsPage() {
  const [file, setFile] = useState(null);
  const [imgBlobUrl, setImgBlobUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [minConf, setMinConf] = useState(0.6);
  const [showBoxes, setShowBoxes] = useState(true);
  const [analyzedAt, setAnalyzedAt] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    function handlePaste(e) {
      const item = Array.from(e.clipboardData.items).find((i) =>
        i.type.startsWith("image/")
      );
      if (item) {
        const f = item.getAsFile();
        if (f) {
          setFile(f);
          setImgBlobUrl(URL.createObjectURL(f));
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  function onFileChange(f) {
    setFile(f);
    setResult(null);
    setAnalyzedAt(null);
    if (imgBlobUrl) URL.revokeObjectURL(imgBlobUrl);
    setImgBlobUrl(f ? URL.createObjectURL(f) : null);
  }

  async function onDetect() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("interval", "auto");
      fd.append("minConf", String(minConf));
      fd.append("withOverlay", "false");
      const res = await fetch(`${API_BASE}/patterns/detect-image`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      let dets = (json.detections || []).map((d) => {
        const k = (d.label || "").toLowerCase();
        const friendly = NORMALIZE[k] || d.label;
        return { ...d, label: friendly };
      });
      dets = dets.filter((d) => d.conf >= minConf);
      const insights = computeInsights(dets);
      const gamePlan = buildGamePlan(dets);
      setResult({ ...json, detections: dets, insights, gamePlan });
      setAnalyzedAt(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-3xl font-heading font-bold">Patterns (YOLO)</h1>
      <p className="text-muted-foreground text-sm">
        Upload a chart screenshot to auto-detect patterns (interval is detected
        from the image).
      </p>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? "Change" : "Upload"}
            </Button>
            <Button onClick={onDetect} disabled={!file || loading}>
              {loading ? "Detecting…" : "Detect"}
            </Button>
            <label className="flex items-center gap-2 text-sm">
              Min Conf {minConf.toFixed(2)}
              <input
                type="range"
                min="0.5"
                max="0.9"
                step="0.05"
                value={minConf}
                onChange={(e) => setMinConf(parseFloat(e.target.value))}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={showBoxes}
                onChange={(e) => setShowBoxes(e.target.checked)}
              />
              Show boxes
            </label>
            <Badge className="ml-auto">Auto</Badge>
            {analyzedAt && (
              <span className="text-xs text-muted-foreground">
                Analyzed at {analyzedAt}
              </span>
            )}
          </div>

          <ChartWithOverlay
            imgSrc={imgBlobUrl || result?.rawImageUrl || result?.imageUrl}
            detections={result?.detections || []}
            showBoxes={showBoxes}
            hoverIdx={hoverIdx}
            onDrop={(f) => onFileChange(f)}
          />
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardContent>
              <KeyInsights insights={result.insights} />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <GamePlan
                patterns={result.gamePlan.recognizedPatterns}
                gamePlan={result.gamePlan}
                onHover={setHoverIdx}
              />
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Pattern detections are automated and may be inaccurate. Not financial
        advice.
      </p>
    </div>
  );
}

function ChartWithOverlay({ imgSrc, detections, showBoxes, hoverIdx, onDrop }) {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSrc, detections, showBoxes, hoverIdx]);

  function draw() {
    const img = imgRef.current;
    const cvs = canvasRef.current;
    if (!img || !cvs) return;
    const ctx = cvs.getContext("2d");
    const rect = img.getBoundingClientRect();
    cvs.width = rect.width;
    cvs.height = rect.height;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    if (!showBoxes) return;
    const sx = rect.width / img.naturalWidth;
    const sy = rect.height / img.naturalHeight;
    detections.forEach((d, i) => {
      const [x, y, w, h] = d.bbox;
      const X = x * sx;
      const Y = y * sy;
      const W = w * sx;
      const H = h * sy;
      ctx.lineWidth = i === hoverIdx ? 3 : 2;
      ctx.strokeStyle = "rgba(59,130,246,0.95)";
      ctx.fillStyle = "rgba(59,130,246,0.12)";
      ctx.fillRect(X, Y, W, H);
      ctx.strokeRect(X, Y, W, H);
      const text = `${d.label} (${Math.round(d.conf * 100)}%)`;
      ctx.font = "12px Inter, ui-sans-serif";
      const pad = 6;
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = "rgba(15,23,42,0.9)";
      ctx.fillRect(X, Y - 20, tw + pad * 2, 18);
      ctx.fillStyle = "white";
      ctx.fillText(text, X + pad, Y - 6);
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onDrop(f);
  }

  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-800"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {imgSrc ? (
        <>
          <img ref={imgRef} src={imgSrc} alt="chart" className="w-full h-full object-contain" />
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
        </>
      ) : (
        <label
          htmlFor="file-input"
          className="flex h-full w-full cursor-pointer flex-col items-center justify-center p-8 text-center text-sm text-slate-400"
        >
          Drop a chart image here or click to upload. Supported: PNG/JPG up to
          8MB.
        </label>
      )}
    </div>
  );
}

function KeyInsights({ insights }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Chip label="Trend" value={insights.trend} />
      <Chip label="Signal" value={insights.signal} />
      <Chip label="Risk Level" value={insights.risk} />
      <Chip label="Volume" value={insights.volume} muted />
    </div>
  );
}

function Chip({ label, value, muted }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-sm ${
        muted ? "bg-slate-700 text-slate-400" : "bg-slate-800 text-slate-100"
      }`}
    >
      {label} <strong className="ml-1">{value}</strong>
    </span>
  );
}

function GamePlan({ patterns, gamePlan, onHover }) {
  return (
    <div className="space-y-2">
      <details open>
        <summary className="cursor-pointer text-sm font-semibold">
          Entry & Exit Strategy
        </summary>
        <p className="pl-4 text-sm">{gamePlan.entryExit}</p>
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          Risk & Reward Assessment
        </summary>
        <p className="pl-4 text-sm">{gamePlan.riskReward}</p>
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          Trade Duration & Monitoring
        </summary>
        <p className="pl-4 text-sm">{gamePlan.durationMonitoring}</p>
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          Technical Indicators
        </summary>
        <p className="pl-4 text-sm">{gamePlan.indicators}</p>
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          Recognized Patterns
        </summary>
        <ul className="pl-4 text-sm space-y-1">
          {patterns.map((p, i) => (
            <li
              key={i}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
            >
              {p.label} ({Math.round(p.conf * 100)}%) – {p.meaning}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
