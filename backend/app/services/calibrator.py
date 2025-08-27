# app/services/calibrator.py
import os, json
from typing import Callable, Dict

CAL_DIR = os.path.join(os.getenv("MODELS_DIR", "models"), "calibrators")
os.makedirs(CAL_DIR, exist_ok=True)

def save_calibrator(ticker: str, A: float, B: float):
    path = os.path.join(CAL_DIR, f"{ticker.upper()}.json")
    with open(path, "w") as f:
        json.dump({"A": A, "B": B}, f)

def load_calibrator(ticker: str) -> Dict[str, float]:
    path = os.path.join(CAL_DIR, f"{ticker.upper()}.json")
    if not os.path.exists(path):
        return {"A": 1.0, "B": 0.0}
    with open(path) as f:
        return json.load(f)

def apply_calibrator(score: float, calib: Dict[str, float]) -> float:
    from scipy.special import expit as sigmoid
    return float(sigmoid(calib["A"] * score + calib["B"]))

def ensure_calibrator(ticker: str, fit_fn: Callable[[str], Dict[str, float]] | None = None) -> Dict[str, float]:
    """
    Load {A,B} if present. If missing and fit_fn is provided, fit and save it.
    """
    path = os.path.join(CAL_DIR, f"{ticker.upper()}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    if fit_fn is None:
        return {"A": 1.0, "B": 0.0}
    cal = fit_fn(ticker)
    # make sure we persist what fit_fn produced
    if not os.path.exists(path):
        with open(path, "w") as f:
            json.dump(cal, f)
    return cal
