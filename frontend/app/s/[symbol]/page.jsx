import PriceHeader from "@/components/stock/PriceHeader"
import DayRange from "@/components/stock/DayRange"
import PriceChart from "@/components/stock/PriceChart.client"
import { PredictionPanel } from "@/components/stock/prediction-panel"

async function getData(symbol) {
  const base = process.env.NEXT_PUBLIC_BASE_URL
  const quote = await fetch(`${base}/api/quote/${symbol}`, { cache: "no-store" }).then((r) => r.json())
  return { quote }
}

export default async function Page({ params }) {
  const symbol = params.symbol.toUpperCase()
  const { quote } = await getData(symbol)
  return (
    <div className="container mx-auto px-4">
      <PriceHeader quote={quote} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <PriceChart ticker={symbol} />
        </div>
        <div>
          <DayRange low={quote.dayLow} high={quote.dayHigh} />
        </div>
      </div>
      <div className="mt-8">
        <PredictionPanel ticker={symbol} />
      </div>
    </div>
  )
}
