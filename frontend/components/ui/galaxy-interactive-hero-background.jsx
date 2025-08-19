"use client";

import React from "react";
import Spline from "@splinetool/react-spline/next";

export default function GalaxyInteractiveHeroBackground({ children, scene }) {
  return (
    <div className="relative min-h-[100dvh]">
      <div className="absolute inset-0 -z-10 pointer-events-auto overflow-hidden">
        <Spline
          style={{ width: "100%", height: "100dvh", pointerEvents: "auto" }}
          scene={scene || "https://prod.spline.design/us3ALejTXl6usHZ7/scene.splinecode"}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

