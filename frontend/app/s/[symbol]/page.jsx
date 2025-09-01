import PriceHeader from "@/components/stock/PriceHeader"
import DayRange from "@/components/stock/DayRange"
import dynamic from "next/dynamic"
const PriceChart = dynamic(() => import("@/components/stock/PriceChart"), { ssr: false })
import { PredictionPanel } from "@/components/stock/prediction-panel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading">Price Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceChart ticker={symbol} />
          </CardContent>
        </Card>
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
