"use client"

import { createContext, useContext, useState, useCallback } from "react"

const PredictionContext = createContext()

export function PredictionStoreProvider({ children }) {
  const [jobs, setJobs] = useState({})

  const startJob = useCallback((ticker, jobId) => {
    setJobs((prev) => ({
      ...prev,
      [ticker]: {
        jobId,
        state: "queued",
        pct: 0,
        etaSeconds: null,
        startedAt: Date.now(),
        finishedAt: null,
        result: null,
        error: null,
      },
    }))
  }, [])

  const updateStatus = useCallback((ticker, patch) => {
    setJobs((prev) => ({
      ...prev,
      [ticker]: { ...prev[ticker], ...patch },
    }))
  }, [])

  const setResult = useCallback((ticker, result) => {
    setJobs((prev) => ({
      ...prev,
      [ticker]: { ...prev[ticker], result, state: "done", finishedAt: Date.now() },
    }))
  }, [])

  const setError = useCallback((ticker, error) => {
    setJobs((prev) => ({
      ...prev,
      [ticker]: { ...prev[ticker], error, state: "error", finishedAt: Date.now() },
    }))
  }, [])

  const clearJob = useCallback((ticker) => {
    setJobs((prev) => {
      const copy = { ...prev }
      delete copy[ticker]
      return copy
    })
  }, [])

  const value = {
    jobs,
    startJob,
    updateStatus,
    setResult,
    setError,
    clearJob,
  }

  return <PredictionContext.Provider value={value}>{children}</PredictionContext.Provider>
}

export function usePredictionStore() {
  return useContext(PredictionContext)
}

export function usePredictionJob(ticker) {
  const { jobs } = useContext(PredictionContext)
  return ticker ? jobs[ticker] : undefined
}

export function useAnyPredictionJob() {
  const { jobs } = useContext(PredictionContext)
  const tickers = Object.keys(jobs)
  return tickers.length ? jobs[tickers[0]] : undefined
}
