export const INTERVAL_OPTIONS = [
  { value: '5y', label: '5Y' },
  { value: '1y', label: '1Y' },
  { value: '3mo', label: '3M' },
  { value: '1mo', label: '1M' },
  { value: '1d', label: '1D' },
  { value: '5m', label: '5m' },
  { value: '1m', label: '1m' },
];

// Suggested refresh cadence for each interval in milliseconds.
export const REFRESH_MS = {
  '5y': 24 * 60 * 60 * 1000,
  '1y': 60 * 60 * 1000,
  '3mo': 30 * 60 * 1000,
  '1mo': 15 * 60 * 1000,
  '1d': 60 * 1000,
  '5m': 60 * 1000,
  '1m': 60 * 1000,
};

// Mapping from picker option to chart range & interval parameters.
export const CHART_PARAMS = {
  '5y': { range: '5y', interval: '1mo' },
  '1y': { range: '1y', interval: '1d' },
  '3mo': { range: '3mo', interval: '1d' },
  '1mo': { range: '1mo', interval: '1d' },
  '1d': { range: '1d', interval: '1m' },
  '5m': { range: '1d', interval: '5m' },
  '1m': { range: '1d', interval: '1m' },
};

