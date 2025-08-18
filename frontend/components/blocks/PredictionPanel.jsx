"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function PredictionPanel({ ticker }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const prefersReducedMotion = useReducedMotion();

  const handlePredict = async () => {
    if (!ticker) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/forecast?ticker=${ticker}`);
      const json = await res.json();
      setData(json.predictions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button onClick={handlePredict} disabled={loading || !ticker} className="relative">
        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Run Prediction
      </Button>
      <div className="relative mt-6">
        {loading && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm font-medium">Crunching the numbers… please wait</p>
          </div>
        )}
        {data.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
            className="h-64"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E90FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1E90FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-grid" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="high" stroke="none" fill="url(#band)" />
                <Area type="monotone" dataKey="low" stroke="none" fill="url(#band)" />
                <Line type="monotone" dataKey="price" stroke="#1E90FF" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>
    </div>
  );
}
