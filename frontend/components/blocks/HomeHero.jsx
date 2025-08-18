"use client";

import { SearchBar } from './SearchBar';

export function HomeHero({ onSearch }) {
  return (
    <section className="pt-24 pb-12 container mx-auto">
      <h1 className="text-4xl md:text-6xl font-bold font-heading mb-8 text-left">
        MarketPulse
      </h1>
      <div className="flex justify-center">
        <SearchBar onSearch={onSearch} />
      </div>
    </section>
  );
}
