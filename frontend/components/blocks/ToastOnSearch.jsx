"use client";

import { useEffect } from 'react';
import { toast } from 'sonner';

export function ToastOnSearch({ trigger }) {
  useEffect(() => {
    if (trigger) {
      toast.success('Latest headlines loaded');
    }
  }, [trigger]);
  return null;
}
