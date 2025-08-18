"use client";

import { useState } from 'react';
import { Search } from 'lucide-react';

const EXAMPLES = ['AAPL', 'MSFT', 'NVDA'];

export function SearchBar({ onSearch }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim().toUpperCase();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const handleExample = (symbol) => {
    setValue(symbol);
    onSearch(symbol);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto">
        <input
          type="text"
          aria-label="Search for a stock ticker"
          placeholder="Enter ticker symbol..."
          autoComplete="off"
          className="w-full rounded-xl bg-card/80 shadow-inner px-4 py-3 pr-12 text-base text-foreground placeholder-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          list="ticker-suggestions"
        />
        <datalist id="ticker-suggestions">
          {EXAMPLES.map((t) => (
            <option value={t} key={t} />
          ))}
        </datalist>
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>
      {value === '' && (
        <div className="flex justify-center gap-2 mt-4">
          {EXAMPLES.map((t) => (
            <button
              key={t}
              onClick={() => handleExample(t)}
              className="px-3 py-1 text-sm bg-card rounded-full text-muted hover:text-foreground hover:bg-card/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
