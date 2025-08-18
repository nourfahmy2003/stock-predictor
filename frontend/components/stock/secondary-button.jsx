import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SecondaryButton({ className, children, ...props }) {
  return (
    <Button
      variant="outline"
      className={cn(
        "btn-secondary font-medium text-base",
        "hover:scale-105 active:scale-95",
        "focus:ring-2 focus:ring-primary focus:ring-offset-2",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
}
