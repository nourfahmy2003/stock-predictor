export default function DayRange({ low, high }) {
  const min = Math.min(low, high)
  const max = Math.max(low, high)
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
        <span>Day Range</span>
        <span>
          {low?.toFixed(2)} – {high?.toFixed(2)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" style={{ width: "100%" }} />
      </div>
    </div>
  )
}
