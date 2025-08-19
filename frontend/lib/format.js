export function compactNumber(n) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n || 0);
}

export function fmtPrice(n, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);
}

export function fmtDateISO(s) {
  const d = new Date(s);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}
