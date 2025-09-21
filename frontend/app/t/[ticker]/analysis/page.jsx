import AnalysisPanel from "@/components/stock/analysis-panel"

export default function AnalysisPage({ params }) {
  const ticker = params.ticker?.toUpperCase()
  return (
    <div className="container mx-auto p-4">
      <AnalysisPanel symbol={ticker} />
    </div>
  )
}
