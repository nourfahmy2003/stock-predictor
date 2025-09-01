import React from "react";

export default function ChartCard({ title, subtitle, children, tabs, loading = false }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="px-4 sm:px-6 pt-5">
        {title && <h3 className="text-lg font-heading font-semibold">{title}</h3>}
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      {tabs && <div className="-mx-4 sm:mx-0 px-4 sm:px-0 mt-3">{tabs}</div>}

      <div
        className="mt-3 sm:overflow-visible overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] bg-card"
        style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
        onWheel={(e) => {
          if (window.innerWidth < 640 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
            e.currentTarget.scrollLeft += e.deltaY;
            e.preventDefault();
          }
        }}
      >
        <div className="pl-4 pr-4 sm:px-6">
          <div className="min-w-[720px] sm:min-w-0">
            <div className="min-h-[320px] h-[60vh] max-h-[520px] relative">
              {loading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    <span className="text-sm">Loading chart...</span>
                  </div>
                </div>
              )}
              {children}
            </div>
          </div>
        </div>
      </div>

      <div className="pb-4 sm:pb-6" />
    </div>
  );
}
