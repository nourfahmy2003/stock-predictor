import PredictionStatusBanner from "@/components/stock/PredictionStatusBanner"
import TabBridge from "@/components/stock/TabBridge"

export default function TickerLayout({ params, children }) {
  const ticker = params.ticker?.toUpperCase()
  return (
    <>
      <TabBridge ticker={ticker} />
      <PredictionStatusBanner ticker={ticker} />
      {children}
    </>
  )
}
