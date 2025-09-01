export function LoadingText({ children = "Generating prediction…" }) {
  return (
    <div className="text-center text-lg sm:text-xl font-medium text-black dark:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.06)] shadow-[0_0_0_1px_rgba(0,0,0,0.02)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      {children}
    </div>
  );
}
