"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function PageTransition({ children, className }) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StaggeredFadeIn({ children, delay = 100, className }) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: `${index * delay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
