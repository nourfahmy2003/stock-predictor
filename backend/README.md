# Stock Forecast Backend (Notebook Runner)

This service executes your Jupyter notebook via **Papermill** and returns the forecast as JSON.

## Structure

```
stock-forecast-backend/
├─ app.py               # FastAPI + Papermill API
├─ requirements.txt
├─ Dockerfile
└─ notebooks/
   └─ LSTM-10day.ipynb  # <- copy your notebook here
```

## Notebook requirements

Add a **parameters** cell in your notebook:

```python
# parameters
TICKER = "AAPL"
CONTEXT = 100
LOOKBACK = 60
H_BACK = 20
H_FORE = 10
OUT_JSON = "forecast.json"
```

At the end of your notebook, after you build `forecast_df` (with columns `date`, `pred_return`, `pred_price`), write:

```python
import json
with open(OUT_JSON, "w") as f:
    json.dump(payload, f)
```

## Local run

```bash
pip install -r requirements.txt
python app.py  # or: uvicorn app:app --host 0.0.0.0 --port 8000
```

Test:
```
curl "http://localhost:8000/forecast?ticker=AAPL&look_back=60&horizon=10"
```

## Docker

```bash
docker build -t stock-forecast-backend .
docker run -p 8000:8000 \
  -e NOTEBOOK_PATH=notebooks/LSTM-10day.ipynb \
  --name stock-api stock-forecast-backend
```

## EC2 quick start

1. Launch an EC2 with at least 2 vCPU / 4 GB RAM (e.g., t3.medium or t4g.medium).
2. Open inbound port 8000 (or use Nginx on 80/443).
3. SSH and install Docker:
   ```bash
   sudo apt update && sudo apt install -y docker.io
   sudo usermod -aG docker $USER && newgrp docker
   ```
4. Copy this folder to the server, place your `.ipynb` in `notebooks/`, then:
   ```bash
   docker build -t stock-forecast-backend .
   docker run -d --restart unless-stopped -p 8000:8000 \
     -e NOTEBOOK_PATH=notebooks/LSTM-10day.ipynb \
     --name stock-api stock-forecast-backend
   ```
5. Test from your machine:
   ```bash
   curl "http://<EC2-PUBLIC-IP>:8000/forecast?ticker=BTC-USD&look_back=60&horizon=10"
   ```

## Notes
- Long runs (~3 min) are fine on a VM. If you front with Nginx, raise `proxy_read_timeout` to 600s.
- Keep TensorFlow version aligned with the one you trained on.
- Tighten CORS and add auth if exposing publicly.
