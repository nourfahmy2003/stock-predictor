from app.services.analysis.data.fetch import get_daily_pivots

def calc_S_R (ticker: str)->dict:
    
    hlc = get_daily_pivots(ticker)
    high, low, close = (int(hlc[k]) for k in ("high", "low", "close"))
    High, Low, Close = float(high), float(low), float(close)

    P  = (High + Low + Close) / 3
    R1 = (2 * P) - Low
    S1 = (2 * P) - High
    R2 = P + (High - Low)
    S2 = P - (High - Low)
    R3 = High + 2*(P - Low)
    S3 = Low - 2*(High - P)

    round_to = 2
    return {k: round(v, round_to) for k, v in {
        "P": P, "R1": R1, "R2": R2, "R3": R3, "S1": S1, "S2": S2, "S3": S3
    }.items()}