import { PredictionPanel } from "@/components/stock/prediction-panel";

export default function ForecastPage() {
  // Default ticker for legacy forecast page
  return <PredictionPanel ticker="AAPL" />;
}
