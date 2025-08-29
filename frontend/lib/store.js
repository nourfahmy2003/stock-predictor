import { create } from 'zustand';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export const useStockStore = create((set, get) => ({
  patterns: {},
  predictions: {},
  setPattern: (ticker, data) => set((state) => ({
    patterns: { ...state.patterns, [ticker]: data }
  })),
  clearPattern: (ticker) => set((state) => {
    const next = { ...state.patterns };
    delete next[ticker];
    return { patterns: next };
  }),
  setPrediction: (ticker, data) => set((state) => ({
    predictions: { ...state.predictions, [ticker]: data }
  })),
  getPrediction: (ticker) => {
    const entry = get().predictions[ticker];
    if (!entry) return null;
    const ttl = entry.ttlMs ?? DEFAULT_TTL;
    if (entry.finishedAt && Date.now() - entry.finishedAt > ttl) {
      return null;
    }
    return entry;
  }
}));

export { DEFAULT_TTL };
