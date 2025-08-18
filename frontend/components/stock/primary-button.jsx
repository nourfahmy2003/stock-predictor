import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function PrimaryButton({ className, children, ...props }) {
  return (
    <Button
      className={cn(
        "btn-primary font-medium text-base",
        "hover:-translate-y-0.5 active:translate-y-0",
        "focus:ring-2 focus:ring-primary focus:ring-offset-2",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
}
