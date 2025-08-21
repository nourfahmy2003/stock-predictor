import os
import json
import tempfile
import papermill as pm
from app.core.config import NOTEBOOK_PATH


def run_forecast_blocking(ticker: str, look_back: int, horizon: int) -> list[dict]:
    with tempfile.TemporaryDirectory() as tmp:
        out_nb = os.path.join(tmp, "out.ipynb")
        out_json = os.path.join(tmp, "forecast.json")
        params = {
            "TICKER": ticker,
            "LOOKBACK": look_back,
            "HORIZON": horizon,
            "OUTPUT_JSON": out_json,
        }
        pm.execute_notebook(
            NOTEBOOK_PATH,
            out_nb,
            parameters=params,
            kernel_name="python3",
            progress=False,
        )
        if not os.path.exists(out_json):
            raise RuntimeError(
                "Notebook completed but no OUTPUT_JSON found. Did you write forecast_df.to_json(OUTPUT_JSON)?"
            )
        with open(out_json) as f:
            data = json.load(f)
        return data
