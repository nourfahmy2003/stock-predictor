"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

/** @typedef {{label:string, conf:number, bbox:[number,number,number,number]}} Detection */
/** @typedef {{symbol?:string, interval?: "auto"|"1m"|"5m"|"1h"|"1d", asOf:string, detections:Detection[], imageUrl?:string|null, rawImageUrl?:string|null}} DetectImageResponse */

const FRIENDLY_LABELS = {
  "Head and shoulders top": "Bearish reversal. Left shoulder–Head–Right shoulder; neckline breaks down → downside target ≈ head-to-neckline distance.",
  "Head and shoulders bottom": "Bullish reversal (Inverse H&S). Breakout above neckline; target ≈ head-to-neckline distance.",
  M_Head: "Bearish M-shape / double-top variant. Two peaks with a middle dip; breakdown confirms weakness.",
  W_Bottom: "Bullish W-shape / double-bottom. Two troughs with a middle peak; breakout confirms strength.",
  Triangle: "Consolidation (sym/asc/desc not distinguished). Breakout direction matters; use breakout candle + retest.",
  StockLine: "Trendline segment (support/resistance). Breaks can signal continuation or reversal.",
};

const NORMALIZE = {
  head_and_shoulders: "Head and shoulders top",
  head_and_shoulders_top: "Head and shoulders top",
  head_and_shoulders_bottom: "Head and shoulders bottom",
  m_head: "M_Head",
  w_bottom: "W_Bottom",
  triangle: "Triangle",
  stockline: "StockLine",
};
const normalizeLabel = (s="") => NORMALIZE[String(s).toLowerCase()] ?? s;

/* --- Upload bar (no confidence UI) --- */
function UploadBar({ file, setFile, onDetect, loading, analyzedAt }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 rounded-xl bg-blue-500/10 text-blue-300 px-3 py-1 text-xs font-medium">
        Auto interval
      </span>

      <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-slate-900/70">
        <Upload className="h-4 w-4" />
        <span>{file ? file.name : "Upload chart image (PNG/JPG ≤ 8MB)"}</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>

      <Button onClick={onDetect} disabled={loading || !file} className="rounded-xl">
        {loading ? "Detecting…" : "Detect"}
      </Button>

      {analyzedAt && <span className="text-xs text-slate-400">Analyzed at {analyzedAt}</span>}
    </div>
  );
}

/* --- Chart + overlay --- */
function ChartWithOverlay({ imgSrc, detections }) {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const draw = () => {
    const img = imgRef.current, cvs = canvasRef.current;
    if (!img || !cvs) return;
    const rect = img.getBoundingClientRect();
    cvs.width = rect.width;  cvs.height = rect.height;
    const ctx = cvs.getContext("2d");
    ctx.clearRect(0,0,cvs.width,cvs.height);
    if (!detections?.length) return;

    const sx = rect.width / img.naturalWidth;
    const sy = rect.height / img.naturalHeight;

    detections.forEach((d) => {
      const [x,y,w,h] = d.bbox;
      const X=x*sx, Y=y*sy, W=w*sx, H=h*sy;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(59,130,246,0.95)";
      ctx.fillStyle = "rgba(59,130,246,0.12)";
      ctx.fillRect(X,Y,W,H);
      ctx.strokeRect(X,Y,W,H);
      const text = `${normalizeLabel(d.label)} (${Math.round(d.conf*100)}%)`;
      ctx.font = "12px Inter, ui-sans-serif";
      const pad = 6, tw = ctx.measureText(text).width;
      ctx.fillStyle = "rgba(15,23,42,0.9)";
      ctx.fillRect(X, Y-20, tw+pad*2, 18);
      ctx.fillStyle = "white";
      ctx.fillText(text, X+pad, Y-6);
    });
  };

  useEffect(() => {
    draw();
    const onR = () => draw();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSrc, detections]);

  if (!imgSrc) {
    return (
      <div className="aspect-[16/9] w-full rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="h-6 w-6" />
          <span className="text-sm">Drop a chart image here or click upload (PNG/JPG ≤ 8MB)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-800">
      <img ref={imgRef} src={imgSrc} alt="Uploaded chart" className="w-full h-full object-contain" onLoad={draw} />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
}

/* --- Insights & Game Plan (render only after result exists) --- */
function Pill({ label, value }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-800/80 px-4 py-2 text-sm text-slate-100 shadow-sm">
      <span className="opacity-80">{label}</span>
      <strong className="font-semibold">{value}</strong>
    </span>
  );
}

function KeyInsights({ detections }) {
  // Simple derived info; you can remove or expand later
  const bullishSet = new Set(["Head and shoulders bottom","W_Bottom"]);
  const bearishSet = new Set(["Head and shoulders top","M_Head"]);
  let bullish=0,bearish=0;
  detections.forEach(d=>{
    const L = normalizeLabel(d.label);
    if (bullishSet.has(L)) bullish++;
    if (bearishSet.has(L)) bearish++;
  });
  const trend = bullish&&!bearish ? "Bullish" : bearish&&!bullish ? "Bearish" : "Mixed";
  const signal = detections.some(d=>d.conf>=0.75) ? (bullish&&!bearish?"Add to Watchlist":bearish&&!bullish?"Reduce":"Watch") : "Watch";
  const risk = detections.length<=1?"Low":detections.length===2?"Medium":"High";

  return (
    <Card className="bg-slate-900/70 border-white/5">
      <CardHeader><CardTitle className="font-heading">Key Insights</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Pill label="Trend" value={trend} />
        <Pill label="Signal" value={signal} />
        <Pill label="Risk Level" value={risk} />
        <Pill label="Volume" value="Not inferred" />
      </CardContent>
    </Card>
  );
}

function Section({ title, children, defaultOpen=false }) {
  return (
    <details className="group rounded-2xl bg-slate-900/60 border border-white/5" open={defaultOpen}>
      <summary className="cursor-pointer list-none px-4 py-3 font-medium text-slate-200 select-none">{title}</summary>
      <div className="px-4 pb-4 text-sm text-slate-300">{children}</div>
    </details>
  );
}
function GamePlan({ detections }) {
  const list = (detections || []).map((d)=>({
    ...d, label: normalizeLabel(d.label),
    meaning: FRIENDLY_LABELS[normalizeLabel(d.label)] || ""
  }));
  return (
    <Card className="bg-slate-900/70 border-white/5">
      <CardHeader><CardTitle className="font-heading">Game Plan</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Section title="Entry & Exit Strategy" defaultOpen>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Head & Shoulders (Top/Bottom):</strong> trade the neckline break; stop above/below neckline; target ≈ head↔neckline distance.</li>
            <li><strong>W-Bottom / M-Head:</strong> confirm on breakout beyond the middle swing; stops beneath/above last swing.</li>
            <li><strong>Triangle:</strong> trade in the breakout direction; prefer a retest; invalidate on close back inside.</li>
          </ul>
        </Section>
        <Section title="Risk & Reward Assessment">
          Prefer R:R ≥ 1.5:1. Reduce size when signals conflict or confidence is low.
        </Section>
        <Section title="Technical Indicators">
          Optional confirmation: SMA20/50/200 alignment; RSI divergences; volume expansion on breakout.
        </Section>
        <Section title="Recognized Patterns">
          {!list.length && <div className="text-slate-400">No patterns detected by the model.</div>}
          <div className="grid gap-2">
            {list.map((d, i)=>(
              <div key={i} className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-100">{d.label}</div>
                  <div className="text-slate-300 text-sm">{Math.round(d.conf*100)}%</div>
                </div>
                {d.meaning && <div className="text-slate-400 text-xs mt-1">{d.meaning}</div>}
              </div>
            ))}
          </div>
        </Section>
      </CardContent>
    </Card>
  );
}

export function PatternsTab({ ticker }) {
  const [file, setFile] = useState(null);
  const [imgBlobUrl, setImgBlobUrl] = useState(null);
  const [result, setResult] = useState(/** @type {DetectImageResponse|null} */(null));
  const [loading, setLoading] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!file) { setImgBlobUrl(null); return; }
    const url = URL.createObjectURL(file);
    setImgBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function onDetect() {
    if (!file) { setErr(new Error("Upload a chart image first.")); return; }
    setLoading(true); setErr(null); setResult(null);
    try {
      const fd = new FormData();
      if (ticker) fd.append("symbol", ticker);
      fd.append("file", file);
      fd.append("interval", "auto");
      fd.append("withOverlay", "false");

      const res = await fetch(`${API_BASE}/patterns/detect-image`, { method:"POST", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      json.detections = (json.detections || []).map((d)=>({ ...d, label: normalizeLabel(d.label) }));
      setResult(json);
      setAnalyzedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }

  const imgSrc = imgBlobUrl || result?.rawImageUrl || result?.imageUrl || null;

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/70 border-white/10 shadow-xl ring-1 ring-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-heading">
            <ImageIcon className="h-5 w-5 text-primary" />
            Patterns (YOLO)
          </CardTitle>
          <p className="text-sm text-slate-400">
            Upload a chart screenshot to auto-detect patterns (interval is detected from the image).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadBar file={file} setFile={setFile} onDetect={onDetect} loading={loading} analyzedAt={analyzedAt} />
          <ChartWithOverlay imgSrc={imgSrc} detections={result?.detections || []} />
          {err && <div className="text-sm text-red-400">{String(err.message || err)}</div>}
        </CardContent>
      </Card>

      {/* Render Insights/Plan ONLY after backend returns */}
      {result && !loading && (
        <>
          <KeyInsights detections={result?.detections || []} />
          <GamePlan detections={result?.detections || []} />
        </>
      )}

      <p className="text-xs text-slate-500">
        Pattern detections are automated and may be inaccurate. Not financial advice.
      </p>
    </div>
  );
}
