import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const ChartWrapper = React.forwardRef(
  ({ title, subtitle, children, className, loading = false }, ref) => {
    return (
      <Card ref={ref} className={cn("p-6", className)}>
        {(title || subtitle) && (
          <div className="mb-4">
            {title && (
              <h3 className="text-lg font-heading font-semibold">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                <span className="text-sm">Loading chart...</span>
              </div>
            </div>
          )}
          <div
            className="sm:overflow-visible overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none]"
            onWheel={(e) => {
              if (window.innerWidth < 640 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                e.currentTarget.scrollLeft += e.deltaY;
                e.preventDefault();
              }
            }}
          >
            <div className="min-w-full sm:min-w-0 pr-2 pb-4">
              <div className="min-h-[320px] h-[60vh] max-h-[520px] w-full">{children}</div>
            </div>
          </div>
        </div>
      </Card>
    );
  }
);

ChartWrapper.displayName = "ChartWrapper";

export { ChartWrapper };
