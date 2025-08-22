"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { BacktestTab } from "../stock/tabs/backtest-tab";

export function BacktestPanel({ ticker }) {
  return (
    <div className="space-y-6">
      <Card className="glass border-white/20 dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading">
            <BarChart3 className="size-6 text-primary" />
            Accuracy Backtest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BacktestTab ticker={ticker} />
        </CardContent>
      </Card>
    </div>
  );
}
