import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
  variant?: "text" | "circular" | "rectangular"
  animation?: "pulse" | "wave"
}

export function LoadingSkeleton({ className, variant = "rectangular", animation = "pulse" }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "bg-muted",
        animation === "pulse" && "animate-pulse",
        animation === "wave" &&
          "animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]",
        variant === "text" && "h-4 rounded",
        variant === "circular" && "rounded-full aspect-square",
        variant === "rectangular" && "rounded-md",
        className,
      )}
    />
  )
}

export function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-6 w-32" variant="text" />
        <LoadingSkeleton className="h-4 w-20" variant="text" />
      </div>
      <div className="h-[300px] relative">
        <LoadingSkeleton className="absolute inset-0" />
        <div className="absolute inset-0 flex items-end justify-between px-4 pb-4">
          {[...Array(12)].map((_, i) => (
            <LoadingSkeleton key={i} className="w-4" style={{ height: `${Math.random() * 60 + 20}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
