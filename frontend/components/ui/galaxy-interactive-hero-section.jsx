"use client";
import React, { useEffect, useRef, useState, lazy, Suspense } from "react";
const Spline = lazy(() => import("@splinetool/react-spline"));

function HeroSplineBackground() {
  return (
    <div style={{ position:"relative", width:"100%", height:"100vh", pointerEvents:"auto", overflow:"hidden" }}>
      <Suspense fallback={<div className="w-full h-[100vh] bg-black" />}>
        <Spline
          style={{ width:"100%", height:"100vh", pointerEvents:"auto" }}
          scene="https://prod.spline.design/us3ALejTXl6usHZ7/scene.splinecode"
        />
      </Suspense>
      <div
        style={{
          position:"absolute", top:0, left:0, width:"100%", height:"100vh",
          background:`linear-gradient(to right, rgba(0,0,0,.8), transparent 30%, transparent 70%, rgba(0,0,0,.8)),
                      linear-gradient(to bottom, transparent 50%, rgba(0,0,0,.9))`,
          pointerEvents:"none"
        }}
      />
    </div>
  );
}

function HeroContent() {
  return (
    <div className="text-left text-white pt-24 md:pt-32 px-4 max-w-3xl">
      <h1 className="text-4xl md:text-7xl font-bold leading-tight tracking-wide">
        AI-Powered <br className="sm:hidden" />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1E90FF] to-[#00C49A]">
          Stock Analysis
        </span>
      </h1>
      <p className="text-lg md:text-xl mt-4 opacity-80 max-w-xl">
        Explore stock data, SEC filings, and AI predictions—built for students,
        analysts, and retail investors.
      </p>
    </div>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-20 bg-black/30 backdrop-blur-md rounded-b-2xl">
      <div className="container mx-auto px-4 py-4 md:px-6 lg:px-8 flex items-center justify-between">
        <div className="text-white font-semibold">MarketPulse</div>
        <button className="lg:hidden text-white p-2" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>
    </nav>
  );
}

export function HeroSection() {
  const screenshotRef = useRef(null);
  const heroContentRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      if (!screenshotRef.current || !heroContentRef.current) return;
      const y = window.pageYOffset;
      requestAnimationFrame(() => {
        screenshotRef.current.style.transform = `translateY(-${y * 0.5}px)`;
        heroContentRef.current.style.opacity = String(1 - Math.min(y / 400, 1));
      });
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative">
      <Navbar />
      <div className="relative min-h-screen">
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <HeroSplineBackground />
        </div>
        <div ref={heroContentRef} className="absolute inset-0 z-10 pointer-events-none flex items-center">
          <div className="container mx-auto">
            <HeroContent />
          </div>
        </div>
      </div>
      <div className="bg-black relative z-10 -mt-[10vh]">
        {/* optional screenshot section removed for minimal layout */}
        <section className="container mx-auto px-4 md:px-6 lg:px-8 pb-12">
          <div ref={screenshotRef} className="hidden" />
        </section>
      </div>
    </div>
  );
}
