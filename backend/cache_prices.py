import argparse, yfinance as yf
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("--tickers", required=True)
ap.add_argument("--period", default="2y")
ap.add_argument("--interval", default="1d")
ap.add_argument("--fmt", choices=["parquet","csv"], default="parquet")
args = ap.parse_args()

DATA = Path("data"); DATA.mkdir(exist_ok=True)
tickers = [l.strip() for l in open(args.tickers) if l.strip()]

for t in tickers:
    try:
        df = yf.download(t, period=args.period, interval=args.interval, auto_adjust=True, progress=False)
        if df is None or df.empty or "Close" not in df:
            continue
        df.index.name = "Date"
        out = DATA / f"{t}_{args.period}_{args.interval}.{args.fmt}"
        if args.fmt == "parquet":
            df.to_parquet(out)
        else:
            df.to_csv(out)
        print(out)
    except Exception:
        pass
