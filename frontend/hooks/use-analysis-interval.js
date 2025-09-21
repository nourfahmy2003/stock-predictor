"use client"

import { useCallback, useSyncExternalStore } from "react"

const store = new Map()
const listeners = new Map()

function keyForSymbol(symbol) {
  return (symbol || "").toUpperCase()
}

function emit(key) {
  const set = listeners.get(key)
  if (!set) return
  for (const fn of Array.from(set)) fn()
}

function subscribe(key, listener) {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  set.add(listener)
  return () => {
    set.delete(listener)
    if (set.size === 0) listeners.delete(key)
  }
}

function getValue(key, fallback) {
  return store.get(key) || fallback
}

export function setAnalysisInterval(symbol, interval) {
  const key = keyForSymbol(symbol)
  if (!key) return
  if (!interval) return
  const current = store.get(key)
  if (current === interval) return
  store.set(key, interval)
  emit(key)
}

export function useAnalysisInterval(symbol, defaultInterval = "5m") {
  const key = keyForSymbol(symbol)
  const subscribeFn = useCallback((listener) => subscribe(key, listener), [key])
  const getSnapshot = useCallback(
    () => getValue(key, defaultInterval),
    [key, defaultInterval]
  )
  const interval = useSyncExternalStore(subscribeFn, getSnapshot, getSnapshot)

  const setInterval = useCallback(
    (value) => {
      if (!value) return
      setAnalysisInterval(symbol, value)
    },
    [symbol]
  )

  return [interval, setInterval]
}

export function useAnalysisIntervalValue(symbol, defaultInterval = "5m") {
  const [interval] = useAnalysisInterval(symbol, defaultInterval)
  return interval
}
