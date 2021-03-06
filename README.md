# Backtest
A web-based program for backtesing BTC trading algorithms. [See it in action](https://someuser-321.github.io/Backtest/)

Data should be supplied in a .csv file the following format [(Example hourly data scraped from a popular exchange)](https://github.com/someuser-321/Backtest/raw/master/example_OHLC_60m.csv):  
Timestamp,Open,High,Low,Close,Volume
  
- Timestamp: Unix time
- Open/High/Low/Close: Price in USD
- Volume: Volume of BTC transacted  
  
The example algorithm enters a long position when BTC is trading outside of the expected range, which is determined by a simple moving average and volatility over a recent time period.

Basic trading indicators such as the following are included, and can be used similarly to the Bollinger Band function used in the example:  
- SMA
- EMA
- RSI

The basic statistic functions are also included:  
- Sum
- Mean
- Median
- Variance
- StdDev

Chart library: [dygraphs](https://github.com/danvk/dygraphs)  
Background: [particles.js](https://github.com/VincentGarreau/particles.js/)
