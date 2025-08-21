"use client";

export default function FilingsHeader({ company, type, onTypeChange, lastDate, has13F }) {
  const filters = ["10-K", "10-Q", "8-K"];
  if (has13F) filters.push("13F");
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex-1 min-w-[200px]">
        <h2 className="text-lg font-heading">{company?.name || ""}</h2>
        {company?.cik && (
          <p className="text-xs text-muted-foreground">
            CIK {company.cik}
            {lastDate ? ` • last filing ${lastDate}` : ""}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onTypeChange(null)}
          className={`px-3 py-1 rounded border border-border text-sm ${!type ? "bg-muted" : ""}`}
        >
          All
        </button>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => onTypeChange(f)}
            className={`px-3 py-1 rounded border border-border text-sm ${
              type === f ? "bg-muted" : ""
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
