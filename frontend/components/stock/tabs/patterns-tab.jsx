"use client";

import React, { useEffect, useRef, useState, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon } from "lucide-react";
import { FRIENDLY_LABELS, NORMALIZE, computeInsights } from "@/lib/patterns";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const FEATURE_FUTURE = (process.env.NEXT_PUBLIC_FEATURE_FUTURE ?? "true") !== "false";
const FEATURE_HIGHLIGHT = false;
const FEATURE_COPY = false;

/** @typedef {{label:string, conf:number, bbox:[number,number,number,number]}} Detection */
/** @typedef {{symbol?:string, interval?: "auto"|"1m"|"5m"|"1h"|"1d", asOf:string, detections:Detection[], imageUrl?:string|null, rawImageUrl?:string|null}} DetectImageResponse */

const normalizeLabel = (s = "") => NORMALIZE[String(s).toLowerCase()] ?? s;

/* --- Upload bar (no confidence UI) --- */
function UploadBar({ file, setFile, onDetect, loading, analyzedAt }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 rounded-xl bg-blue-500/10 text-blue-300 px-3 py-1 text-xs font-medium">
        Auto interval
      </span>

      <label
        className={`inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 ${
          loading ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-900/70"
        }`}
      >
        <Upload className="h-4 w-4" />
        <span>{file ? file.name : "Upload chart image (PNG/JPG ≤ 8MB)"}</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={loading}
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
const ChartWithOverlay = React.forwardRef(function ChartWithOverlay(
  { imgSrc, detections, future, onFile },
  ref
) {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  useImperativeHandle(ref, () => ({
    download: () => {
      const img = imgRef.current, cvs = canvasRef.current;
      if (!img || !cvs) return;
      const temp = document.createElement("canvas");
      temp.width = cvs.width;
      temp.height = cvs.height;
      const ctx = temp.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      ctx.drawImage(cvs, 0, 0);
      const a = document.createElement("a");
      a.href = temp.toDataURL("image/png");
      a.download = "pattern-overlay.png";
      a.click();
    },
  }));

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile?.(f);
  };

  const draw = () => {
    const img = imgRef.current, cvs = canvasRef.current;
    if (!img || !cvs) return;
    const rect = img.getBoundingClientRect();
    cvs.width = rect.width;  cvs.height = rect.height;
    const ctx = cvs.getContext("2d");
    ctx.clearRect(0,0,cvs.width,cvs.height);
    const sx = rect.width / img.naturalWidth;
    const sy = rect.height / img.naturalHeight;

    detections?.forEach((d) => {
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

    if (future?.direction && future.direction !== "Not found" && future.boxes?.length) {
      const b = future.boxes[0];
      const [x,y,w,h] = b.bbox;
      const X=x*sx, Y=y*sy, W=w*sx, H=h*sy;
      const cx = X + W/2;
      const top = Y - 24;
      ctx.fillStyle = future.direction === "Up" ? "#16a34a" : "#dc2626";
      ctx.beginPath();
      if (future.direction === "Up") {
        ctx.moveTo(cx, top);
        ctx.lineTo(cx-6, top+12);
        ctx.lineTo(cx+6, top+12);
      } else {
        ctx.moveTo(cx, top+12);
        ctx.lineTo(cx-6, top);
        ctx.lineTo(cx+6, top);
      }
      ctx.closePath();
      ctx.fill();
      const text = `${future.direction} (${Math.round((future.conf||0)*100)}%)`;
      ctx.font = "12px Inter, ui-sans-serif";
      const pad=6, tw=ctx.measureText(text).width;
      ctx.fillStyle = "rgba(15,23,42,0.9)";
      ctx.fillRect(cx - tw/2 - pad, top+12, tw+pad*2, 18);
      ctx.fillStyle = "white";
      ctx.fillText(text, cx - tw/2, top+24);
    }
  };

  useEffect(() => {
    draw();
    const onR = () => draw();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSrc, detections, future]);

  if (!imgSrc) {
    return (
      <div
        className="aspect-[16/9] w-full rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-400"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="h-6 w-6" />
          <span className="text-sm">Drop a chart image here or click to upload. Supported: PNG/JPG up to 8MB.</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-800"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <img ref={imgRef} src={imgSrc} alt="Uploaded chart" className="w-full h-full object-contain" onLoad={draw} />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
});

/* --- Insights & Game Plan (render only after result exists) --- */
function Pill({ label, value, muted }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm shadow-sm ${
        muted ? "bg-slate-800/60 text-slate-400" : "bg-slate-800/80 text-slate-100"
      }`}
    >
      <span className="opacity-80">{label}:</span>
      <strong className="font-semibold">{value}</strong>
    </span>
  );
}

function KeyInsights({ insights }) {
  return (
    <Card className="bg-slate-900/70 border-white/5">
      <CardHeader>
        <CardTitle className="font-heading">Key Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-3">
          <Pill label="Trend" value={insights.trend} muted={insights.trend === "Not found"} />
          {FEATURE_FUTURE && (
            <Pill label="Future" value={insights.future} muted={insights.future === "Not found"} />
          )}
          <Pill label="Signal" value={insights.signal} muted={insights.signal === "N/A"} />
          <Pill label="Risk" value={insights.risk} muted={insights.risk === "N/A"} />
          <Pill label="Volume" value={insights.volume} muted />
        </div>
        {insights.trend === "Not found" && (
          <div className="space-y-1 text-xs text-slate-400">
            <p>
              {insights.hasDetections
                ? "Only neutral structures detected (e.g., triangle/trendline). Direction is not inferred."
                : "No directional pattern detected in the uploaded image."}
            </p>
            {insights.future === "Not found" && (
              <p>Future model did not infer direction from this image.</p>
            )}
          </div>
        )}
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
function GamePlan({ detections, insights }) {
  const list = (detections || []).map((d)=>({
    ...d, label: normalizeLabel(d.label),
    meaning: FRIENDLY_LABELS[normalizeLabel(d.label)] || "",
  }));
  if (insights.trend === "Not found" && !insights.hasDetections) {
    return (
      <Card className="bg-slate-900/70 border-white/5">
        <CardHeader><CardTitle className="font-heading">Game Plan</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-400">
          <div>No actionable pattern-based plan. Try a clearer or more recent chart section.</div>
          <div>No patterns detected by the model.</div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="bg-slate-900/70 border-white/5">
      <CardHeader><CardTitle className="font-heading">Game Plan</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {insights.trend === "Not found" && insights.neutralOnly && (
          <div className="text-sm text-slate-400">
            Neutral-only patterns detected; use breakout direction on triangle/trendline for confirmation.
          </div>
        )}
        {insights.trend === "Mixed" && FEATURE_FUTURE && insights.future !== "Not found" &&
          (insights.patternTrend === "Bullish" || insights.patternTrend === "Bearish") && (
          <div className="text-sm text-slate-400">
            Future model suggests {insights.future} while pattern signals are {insights.patternTrend.toLowerCase()}. Treat as Mixed until confirmation.
          </div>
        )}
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
  const cacheKey = `patterns-cache:${ticker}`;
  const [file, setFile] = useState(null);
  const [imgBlobUrl, setImgBlobUrl] = useState(null);
  const [cachedUrl, setCachedUrl] = useState(null);
  const [result, setResult] = useState(/** @type {DetectImageResponse|null} */(null));
  const [rawResult, setRawResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState(null);
  const [err, setErr] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { fileUrl, resultJson, rawJson, analyzedAt } = JSON.parse(cached);
        setCachedUrl(fileUrl);
        setResult(resultJson);
        setRawResult(rawJson);
        setAnalyzedAt(analyzedAt);
      } catch {}
    }
  }, [cacheKey]);

  useEffect(() => {
    if (!file) { setImgBlobUrl(null); return; }
    const url = URL.createObjectURL(file);
    setImgBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFile(f) {
    if (loading) return;
    setFile(f);
    setResult(null);
    setRawResult(null);
    setErr(null);
    setAnalyzedAt(null);
    setCachedUrl(null);
    localStorage.removeItem(cacheKey);
  }

  async function onDetect() {
    if (!file) { setErr(new Error("Upload a chart image first.")); return; }
    setLoading(true); setErr(null); setResult(null); setRawResult(null);
    try {
      const fd = new FormData();
      if (ticker) fd.append("symbol", ticker);
      fd.append("file", file);
      fd.append("interval", "auto");
      fd.append("withOverlay", "false");
      fd.append("withFuture", FEATURE_FUTURE ? "true" : "false");

      const res = await fetch(`${API_BASE}/patterns/detect-image`, { method:"POST", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rawJson = await res.json();
      const json = { ...rawJson, detections: (rawJson.detections || []).map((d)=>({ ...d, label: normalizeLabel(d.label) })) };
      if (!json.detections.length) {
        handleFile(null);
        setErr(new Error("No patterns detected in this image. Try a clearer or more recent chart section."));
        return;
      }
      setResult(json);
      setRawResult(rawJson);
      const analyzed = new Date().toLocaleTimeString();
      setAnalyzedAt(analyzed);
      const fileUrl = json.rawImageUrl || json.imageUrl || imgBlobUrl;
      localStorage.setItem(cacheKey, JSON.stringify({ fileUrl, resultJson: json, rawJson, analyzedAt: analyzed }));
      setCachedUrl(fileUrl);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadOverlay() {
    chartRef.current?.download();
  }

  function handleDownloadJson() {
    if (!rawResult) return;
    const blob = new Blob([JSON.stringify(rawResult, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patterns.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const imgSrc = imgBlobUrl || cachedUrl || result?.rawImageUrl || result?.imageUrl || null;
  const insights = result ? computeInsights(result.detections || [], FEATURE_FUTURE ? result.future : null, result.combinedTrend) : null;

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
          <UploadBar file={file} setFile={handleFile} onDetect={onDetect} loading={loading} analyzedAt={analyzedAt} />
          <ChartWithOverlay
            ref={chartRef}
            imgSrc={imgSrc}
            detections={result?.detections || []}
            future={FEATURE_FUTURE ? result?.future : null}
            onFile={handleFile}
          />
          {result && !loading && result.detections?.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadOverlay} className="rounded-xl">
                Download Overlay (PNG)
              </Button>
              <Button variant="outline" onClick={handleDownloadJson} className="rounded-xl">
                Download JSON
              </Button>
            </div>
          )}
          {err && <div className="text-sm text-red-400">{String(err.message || err)}</div>}
        </CardContent>
      </Card>

      {/* Render Insights/Plan ONLY when detections exist */}
      {result && !loading && result.detections?.length > 0 && insights && (
        <>
          <KeyInsights insights={insights} />
          <GamePlan detections={result?.detections || []} insights={insights} />
        </>
      )}

      <p className="text-xs text-slate-500">
        Pattern detections are automated and may be inaccurate. Not financial advice.
      </p>
    </div>
  );
}
