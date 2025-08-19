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
