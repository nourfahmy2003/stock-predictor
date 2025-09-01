import React from "react";

export default function RangeTabs({ value, onChange, options }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={
            "w-full sm:w-auto px-3 py-2 rounded-md border min-h-[40px] text-sm " +
            (value === opt
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground")
          }
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
