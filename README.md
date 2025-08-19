# stock-predictor

## Development

When network access to the NASDAQ/NYSE symbol lists is restricted, the
frontend can read cached copies of the data. Set the environment variables
`NASDAQ_SYMBOLS_FILE` and `OTHERLISTED_SYMBOLS_FILE` to the paths of local
`nasdaqtraded.txt` and `otherlisted.txt` files to enable this behavior.
