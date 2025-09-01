# stock-predictor

## Development

When outbound requests to the NASDAQ/NYSE symbol lists are blocked, the frontend
can fall back to cached copies of the CSV data. Set the environment variables
`NASDAQ_SYMBOLS_FILE` and `OTHERLISTED_SYMBOLS_FILE` to the paths of local
`nasdaqtraded.txt` and `otherlisted.txt` files:

```
export NASDAQ_SYMBOLS_FILE=/path/to/nasdaqtraded.txt
export OTHERLISTED_SYMBOLS_FILE=/path/to/otherlisted.txt
```

If the network requires a proxy for outbound HTTP requests, configure standard
proxy environment variables before running the frontend:

```
export HTTPS_PROXY=http://proxy.example.com:8080
export HTTP_PROXY=http://proxy.example.com:8080
```

## Deployment

When deploying to platforms like Render, the backend must bind to the port
provided by the environment. Start the API server with:

```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

The sentiment analysis model loads lazily on the first request, keeping startup
memory usage low so the service can bind to the port quickly.

### Render Frontend Build Configuration

For successful builds on Render, set the following environment variables:

```
NODE_VERSION=20
TAILWIND_DISABLE_NATIVE=1
```

Ensure optional dependencies are installed by not setting `NPM_CONFIG_OPTIONAL=false`.
Tailwind CSS v4 is configured to use the WASM fallback via `@tailwindcss/postcss` and `autoprefixer` in `frontend/postcss.config.js`.
