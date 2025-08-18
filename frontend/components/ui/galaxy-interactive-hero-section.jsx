"use client";

import { useEffect, useRef, useState, Suspense, lazy } from 'react';
const Spline = lazy(() => import('@splinetool/react-spline'));

function HeroSplineBackground() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', pointerEvents: 'auto', overflow: 'hidden' }}>
      <Suspense fallback={<div className="w-full h-[100vh] bg-deep" />}>
        <Spline
          style={{ width: '100%', height: '100vh', pointerEvents: 'auto' }}
          scene="https://prod.spline.design/us3ALejTXl6usHZ7/scene.splinecode"
        />
      </Suspense>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: `linear-gradient(to right, rgba(0,0,0,0.8), transparent 30%, transparent 70%, rgba(0,0,0,0.8)), linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.9))`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function ScreenshotSection({ screenshotRef }) {
  return (
    <section className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8 mt-11 md:mt-12">
      <div ref={screenshotRef} className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700/50 w-full md:w-[80%] lg:w-[70%] mx-auto">
        <img
          src="https://images.unsplash.com/photo-1551281044-8c88e3f97b97?q=80&w=1920&auto=format&fit=crop"
          alt="App Screenshot"
          className="w-full h-auto block"
        />
      </div>
    </section>
  );
}

function HeroContent() {
  return (
    <div className="text-left text-white pt-16 sm:pt-24 md:pt-32 px-4 max-w-3xl">
      <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 leading-tight tracking-wide">
        AI-Powered <br className="sm:hidden" />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-success">Stock Analysis</span>
      </h1>
      <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-80 max-w-xl">
        Explore stock data, SEC filings, and AI predictions—built for students, analysts, and retail investors.
      </p>
      {/* Primary action = Search lives elsewhere in the page */}
    </div>
  );
}

function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-20 bg-black/30 backdrop-blur-md rounded-b-2xl">
      <div className="container mx-auto px-4 py-4 md:px-6 lg:px-8 flex items-center justify-between">
        <div className="text-white font-semibold">MarketPulse</div>
        <button
          className="lg:hidden text-white p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </div>
    </nav>
  );
}

export const HeroSection = () => {
  const screenshotRef = useRef(null);
  const heroContentRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!screenshotRef.current || !heroContentRef.current) return;
      const scrollPosition = window.pageYOffset;
      requestAnimationFrame(() => {
        screenshotRef.current.style.transform = `translateY(-${scrollPosition * 0.5}px)`;
        const opacity = 1 - Math.min(scrollPosition / 400, 1);
        heroContentRef.current.style.opacity = opacity.toString();
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
        <ScreenshotSection screenshotRef={screenshotRef} />
      </div>
    </div>
  );
};
