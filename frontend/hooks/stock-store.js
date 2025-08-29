"use client";
import { createContext, useContext, useState } from "react";

const StockStoreContext = createContext(null);

export function StockStoreProvider({ children }) {
  const [patterns, setPatterns] = useState({});
  const [predictions, setPredictions] = useState({});

  return (
    <StockStoreContext.Provider value={{ patterns, setPatterns, predictions, setPredictions }}>
      {children}
    </StockStoreContext.Provider>
  );
}

export function useStockStore() {
  const ctx = useContext(StockStoreContext);
  if (!ctx) throw new Error("StockStoreProvider missing");
  return ctx;
}
