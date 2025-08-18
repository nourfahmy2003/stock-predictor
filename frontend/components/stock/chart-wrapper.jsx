import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const ChartWrapper = React.forwardRef(({ title, children, className, loading = false }, ref) => {
  return (
    <Card ref={ref} className={cn("p-6", className)}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-heading font-semibold">{title}</h3>
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
        <div className="min-h-[300px] w-full">{children}</div>
      </div>
    </Card>
  );
});

ChartWrapper.displayName = "ChartWrapper";

export { ChartWrapper };
