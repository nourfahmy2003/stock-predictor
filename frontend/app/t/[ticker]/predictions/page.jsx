import { PredictionPanel } from "@/components/stock/prediction-panel"

export default function PredictionsPage({ params }) {
  const ticker = params.ticker?.toUpperCase()
  return (
    <div className="container mx-auto p-4">
      <PredictionPanel ticker={ticker} />
    </div>
  )
}
