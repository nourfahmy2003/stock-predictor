"use client";
import React from "react";
import { PatternsTab } from "./tabs/patterns-tab";

export function PatternsPanel({ ticker }) {
  return <PatternsTab ticker={ticker} />;
}
