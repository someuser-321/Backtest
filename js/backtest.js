"use strict";

const calculateSum = (values) => values.reduce((x, y) => x + y, 0),
	  calculateMean = (values) => calculateSum(values) / values.length,
	  calculateMedian = (values) => values.sort((a, b) => a - b) && values[Math.floor(values.length / 2)],
	  calculateVariance = (values) => (mean => calculateMean(values.map(x => (x - mean) ** 2)))(calculateMean(values)),
	  calculateStddev = (values) => calculateVariance(values) ** 0.5,
	  calculateStatSeries = (values, period, statFn) =>
	  {
	  	  let statSeries = [];
	  	  for (let i = period - 1; i < values.length; i++)
	  	  {
	  	  	  const thisStat = statFn(values.slice(i - (period - 1), i));
	  	  	  statSeries.push(thisStat);
	  	  }
	  	  
	  	  return statSeries;
	  };
	
const calculateSMASeries = (values, period) => calculateStatSeries(values, period, calculateMean),
	  calculateStddevSeries = (values, period) => calculateStatSeries(values, period, calculateStddev);
	
const Strategy = (data, parameters, strategy) =>
{
	let state = {...parameters};
		
	state.dates = data.dates.slice(state.period - 1, data.dates.length);
	state.prices = data.prices.slice(state.period - 1, data.prices.length);
	state.highPrices = data.highs.slice(state.period - 1, data.highs.length);
	state.lowPrices = data.lows.slice(state.period - 1, data.lows.length);
	state.volumes = data.volumes.slice(state.period - 1, data.volumes.length);
    
    state.GetPrices = (period, offset = 0) =>
    {
        const startIdx = Math.max(state.idx - (period - 1) + offset, 0),
              endIdx = Math.max(state.idx + 1 + offset, 0);
              
        return state.prices.slice(startIdx, endIdx);
    };
    
    state.GetPrice = (offset) => state.GetPrices(1, offset)[0];
    
    state.SMA = (period, offset) => calculateMean(state.GetPrices(period, offset));
	
	state.EMA = (period, offset, alpha = 1 / period) =>  state.EMA_(state.GetPrices(period, offset), alpha);
	
	state.EMA_ = (prices, alpha = 1 / prices.length) => alpha * prices.reduce((acc, e, i) => acc + e * (1 - alpha) ** (prices.length - 1 - i), 0);
    
    state.BB = (period, k, offset) =>
    {
        const prices = state.GetPrices(period, offset);
        return calculateMean(prices) + k * calculateStddev(prices);
    };
	
	state.RS = (period, offset) =>
	{
		const prices = state.GetPrices(period + 1, offset),
			  U = [],
			  D = [];
			  
		for (let i = 1; i < prices.length; i++)
		{
			U.push(Math.max(prices[i] - prices[i - 1], 0));
			D.push(Math.max(prices[i - 1] - prices[i], 0));
		}
		
		return state.EMA_(U) / state.EMA_(D);
	};
	
	state.RSI = (period, offset) => 100 - 100 / (1 + state.RS(period, offset));
    
    state.enterLong = strategy.enterLong   || (() => false);
    state.enterShort = strategy.enterShort || (() => false);
    state.exitLong = strategy.exitLong	   || (() => false);
    state.exitShort = strategy.exitShort   || (() => false);
    state.step = strategy.step			   || (() => false);
		
	state.balance = state.prices[0];
	state.balances = [state.balance];
	state.longPosition = 0;
	state.longPositions = [state.longPosition];
	state.shortPosition = 0;
	state.shortPositions = [state.shortPosition];
	state.positionEntryPrice = null,
    state.maxPriceDuringPosition = 0;
    state.idx = 0;
	state._series = {
		OpenPrice: {
			label: "Open Price (USD)",
			axis: 1,
			logscale: true,
			data: []
		},
		HighPrice: {
			label: "High Price (USD)",
			axis: 1,
			logscale: true,
			data: []
		},
		LowPrice: {
			label: "Low Price (USD)",
			axis: 1,
			logscale: true,
			data: []
		},
		Balance: {
			label: "Balance (USD)",
			axis: 1,
			logscale: true,
			data: []
		},
		LongPosition: {
			label: "Long Position (mBTC)",
			axis: 1,
			data: []
		},
		ShortPosition: {
			label: "Short Position (mBTC)",
			axis: 1,
			data: []
		}
	};
	
    if (typeof(strategy.init) === "function")
    {
        strategy.init(state);
    }
    
	for (state.idx = 1; state.idx < state.dates.length; state.idx++)
	{
		let inLongPosition = state.longPosition > 0,
			inShortPosition = state.shortPosition > 0,
		    inAnyPosition = inLongPosition || inShortPosition;
			
        state.date = state.dates[state.idx];
		state.price = state.prices[state.idx];
		state.highPrice = state.highPrices[state.idx];
		state.lowPrice = state.lowPrices[state.idx];
              
        state.exitLongPrice = state.price;
        state.exitShortPrice = state.price;
			  
		const exitLongPosition = inLongPosition && state.exitLong(state),
			  exitShortPosition = inShortPosition && state.exitShort(state);
		
		if (exitLongPosition)
		{
			state.balance = (1 - state.tradeFees) * (state.longPosition * state.exitLongPrice +
												    (state.leverage - 1) * state.longPosition * (state.exitLongPrice - state.positionEntryPrice));
			state.longPosition = 0;
		}
		if (exitShortPosition)
		{
			state.balance = (1 - state.tradeFees) * (state.shortPosition * state.positionEntryPrice +
												    (state.leverage) * state.shortPosition * (state.positionEntryPrice - state.exitShortPrice));
			state.shortPosition = 0;
		}
		
		inLongPosition = state.longPosition > 0;
		inShortPosition = state.shortPosition > 0;
		inAnyPosition = inLongPosition || inShortPosition;
        
        const enterLongPosition = !inAnyPosition && state.enterLong(state),
			  enterShortPosition = !inAnyPosition && state.enterShort(state);
		
		if (enterLongPosition)
		{
			state.longPosition = (1 - state.tradeFees) * state.balance / state.price;
			state.positionEntryPrice = state.price;
			state.balance = 0;
		}
		else if (enterShortPosition)
		{
			state.shortPosition = (1 - state.tradeFees) * state.balance / state.price;
			state.positionEntryPrice = state.price;
			state.balance = 0;
		}
		
		inLongPosition = state.longPosition > 0;
		inShortPosition = state.shortPosition > 0;
		inAnyPosition = inLongPosition || inShortPosition;
		
		if (inLongPosition)
		{
			state.longPosition *= (1 - state.marginFees);
			state.balance = state.longPosition * state.price +
			                (state.leverage - 1) * state.longPosition * (state.price - state.positionEntryPrice);
		}
		else if (inShortPosition)
		{
			state.shortPosition *= (1 - state.marginFees);
			state.balance = state.shortPosition * state.positionEntryPrice +
						    (state.leverage) * state.shortPosition * (state.positionEntryPrice - state.price);
		}
		
		state._series.OpenPrice.data.push(state.price);
		state._series.HighPrice.data.push(state.highPrice);
		state._series.LowPrice.data.push(state.lowPrice);
		state._series.LongPosition.data.push(state.longPosition * 1000);
		state._series.ShortPosition.data.push(state.shortPosition * 1000);
		state._series.Balance.data.push(state.balance);
		
		state.step(state);
	}
	
	state.series = Object.assign(state._series, state.series);
	
	return state;
};

const backtest = (method, data, parameters) =>
{
    return method(data, parameters);
};

const GetStrategy = (data, parameters) =>
{
	const init = $("#txtInit").val(),
		  step = $("#txtStep").val(),
		  enterLong = $("#txtEnterLong").val(),
		  exitLong = $("#txtExitLong").val(),
		  enterShort = $("#txtEnterShort").val(),
		  exitShort = $("#txtExitShort").val();
		  
	const fnInit = new Function("_", init),
		  fnStep = new Function("_", step),
		  fnEnterLong = new Function("_", enterLong),
		  fnExitLong = new Function("_", exitLong),
		  fnEnterShort = new Function("_", enterShort),
		  fnExitShort = new Function("_", exitShort);
	
	const strategy = {
		init: fnInit,
		step: fnStep,
		enterLong: fnEnterLong,
		exitLong: fnExitLong,
		enterShort: fnEnterShort,
		exitShort: fnExitShort
	};
	
	return Strategy(data, parameters, strategy);
};

const scoreResults = (results) =>
{
	const balances = results.series.Balance.data,
		  prices = results.series.OpenPrice.data,
		  longPositions = results.series.LongPosition.data;
		
	let maxDrawdown = 0,
		drawdownMax = balances[0],
		drawdownMin = balances[0];
		
	for ( let i = 0; i < balances.length ; i++ )
	{
		const balance = balances[i];
        if (balance < drawdownMax)
		{
            drawdownMin = balance;
        }
		else
		{
            drawdownMax = balance;
		}
		
        maxDrawdown = Math.max(maxDrawdown, (drawdownMax - drawdownMin) / drawdownMax);
	}
	
	const benchmarkReturn = prices[prices.length - 1] / prices[0],
		  benchmarkCAGR = benchmarkReturn ** (1 / (balances.length / (365 * 24)));
	
	const totalReturn = balances[balances.length - 1] / balances[0],
		  totalCAGR = totalReturn ** (1 / (balances.length / (365 * 24)));
	
	const excessReturn = (totalReturn / benchmarkReturn) - 1,
		  excessCAGR = (1 + excessReturn) ** (1 / (balances.length / (365 * 24))) - 1;
	
	let timesInPosition = [],
		currentTimeInPosition = 0;
		
	for (let i = 0; i < longPositions.length; i++)
	{
		if (longPositions[i] > 0)
		{
			currentTimeInPosition++;
		}
		else
		{
			if (currentTimeInPosition > 0)
			{
				timesInPosition.push(currentTimeInPosition);
			}
			currentTimeInPosition = 0;
		}
	}
	
	const medianTimeInPosition = calculateMedian(timesInPosition),
		  meanTimeInPosition = calculateMean(timesInPosition);
		  
	const scores = {
		benchmarkReturn: benchmarkReturn,
		benchmarkCAGR: benchmarkCAGR,
		totalReturn: totalReturn,
		totalCAGR: totalCAGR,
		excessReturn: excessReturn,
		excessCAGR: excessCAGR,
		maxDrawdown: maxDrawdown,
		medianTimeInPosition: medianTimeInPosition,
		meanTimeInPosition: meanTimeInPosition
	};
	
	console.log(scores);
	
	return scores;
};

const doBacktests = (data) =>
{
	$("#lblFileInput div").text("Calculating...");
	
    const backtestMethod = GetStrategy,
          parameters = {
              period: 100,
              stddevBB: 1.0,
              leverage: 1.0,
              riskReward: 10.0,
              stopLoss: 0.01,
              
              tradeFees: 0.2 / 100,
              marginFees: 0.0025 / 100
          },
		  results = backtest(backtestMethod, data, parameters),
		  statistics = scoreResults(results);
	
	$("#lblFileInput div").text("Done");
	
	return {
        results: results,
        statistics: statistics
    };
};

const showResultsStats = (statistics) =>
{
    Object.keys(statistics).forEach(e => statistics[e] = statistics[e] * 100);
    
    const $txtBenchmarkReturn = $("#txtBenchmarkReturn"),
          $txtBenchmarkCAGR = $("#txtBenchmarkCAGR"),
          $txtStrategyReturn = $("#txtStrategyReturn"),
          $txtStrategyCAGR = $("#txtStrategyCAGR"),
          $txtExcessReturn = $("#txtExcessReturn"),
          $txtExcessCAGR = $("#txtExcessCAGR");
    
    $txtBenchmarkReturn.text(statistics.benchmarkReturn.toFixed(2));
    $txtBenchmarkCAGR.text(statistics.benchmarkCAGR.toFixed(2));
    $txtStrategyReturn.text((statistics.benchmarkReturn + statistics.excessReturn).toFixed(2));
    $txtStrategyCAGR.text((statistics.benchmarkCAGR + statistics.excessCAGR).toFixed(2));
    $txtExcessReturn.text(statistics.excessReturn.toFixed(2));
    $txtExcessCAGR.text(statistics.excessCAGR.toFixed(2));
}

const showResults = (res) =>
{
    const results = res.results;
	const seriesNames = Object.values(results._series);
	
	const data = results.dates.map((date, i) => [
		date,
		...seriesNames.map(e => e.data[i])
	]);

	let palette = ["#63cad0", "#f299c1", "#e5c447", "#b7f67f", "#02aded"],
		paletteCounter = 0;
			
	const chartLegendFormatter = (data) =>
	{
		paletteCounter = 0;
		
		const visibleSeries = data.series.filter(series => series.isVisible);
		const generateLegendItemHTML = (legendInfo) => `
			<span style="float: left; clear: left;">
				<b style="color: ${palette[paletteCounter++ % palette.length]};">${legendInfo.label}</b>
				${legendInfo.yHTML == null ? "" : ": " + legendInfo.yHTML}
			</span>
		`;
		
		// No selection
		if (data.x == null)
		{
			return data.series.reduce((html, legendInfo) => html + generateLegendItemHTML(legendInfo), "");
		}
		else
		{
			return visibleSeries.reduce((html, legendInfo) => html + generateLegendItemHTML(legendInfo), data.xHTML);
		}
	};

	const seriesOptions = seriesNames.reduce((acc, e) => {
		acc[e.label] = {
			axis: "y" + e.axis,
			logscale: false, //!!e.logscale,
			color: palette[paletteCounter++ % palette.length]
		};
		return acc;
	}, {});
	
	const options = {
		labels: [
			"Date",
			...seriesNames.map(e => e.label)
		],
		series: seriesOptions,
		legend: "always",
		legendFormatter: chartLegendFormatter,
		animatedZooms: true
	};
	
	$("#lblFileInput").css("display", "none");
	
	const $divChart = $("#divChart");
	$divChart.css("background-color", "#112d");
	
	new Dygraph($divChart[0], data, options);
    
    showResultsStats(res.statistics);
};

const SMACrossingStrategy = {
    init:
`_.leverage = 2;
_.series = {
    BB1: {
        label: "BB(50, 1)",
        axis: 1,
        data: []
    },
    BB2: {
        label: "BB(50, 0.75)",
        axis: 1,
        data: []
    }
};`,
    enterLong:
`return _.highPrice > _.BB(50, 1);`,
    exitLong:
`if (_.lowPrice < _.BB(50, 0.75)) {
    _.exitLongPrice  = _.BB(50, 0.75);
    return true;
}`,
    enterShort: "",
    exitShort: "",
    step:
`_.series.BB1.data.push(_.BB(50, 1));
_.series.BB2.data.push(_.BB(50, 0.75));`
};

const loadDefaultStrategy = () =>
{
	$("#txtInit").val(SMACrossingStrategy.init),
	$("#txtStep").val(SMACrossingStrategy.step),
	$("#txtEnterLong").val(SMACrossingStrategy.enterLong),
	$("#txtExitLong").val(SMACrossingStrategy.exitLong),
	$("#txtEnterShort").val(SMACrossingStrategy.enterShort),
	$("#txtExitShort").val(SMACrossingStrategy.exitShort);
};

let data = {};

const processData = (rawData) =>
{
	const dataStart = 0.7,
		  dataEnd = 1;
    
	let lines = rawData.split("\n").filter(x => x !== "");
		
	lines = lines.slice(dataStart * lines.length, dataEnd * lines.length);
	
	return lines.reduce((acc, e) => {
		const [date, price, high, low, close, volume] = e.split(",");
		
		acc.dates.push(new Date(parseInt(date) * 1000));
		
		acc.prices.push(parseFloat(price));
		acc.highs.push(parseFloat(high));
		acc.lows.push(parseFloat(low));
		acc.volumes.push(parseFloat(volume));
		
		return acc;
	}, {dates: [], prices: [], highs: [], lows: [], volumes: []});
};

const bindCallbacks = () =>
{
	loadParticles();
    loadDefaultStrategy();
	
	const $btnBacktest = $("#btnBacktest");
	$btnBacktest.click(() => showResults(doBacktests(data)));
	
	const elFileInput = $("#inpUploadDataset")[0];
	elFileInput.addEventListener("change", () =>
	{
		$("#lblFileInput div").text("Loading...");
		$("#divChartContainer").removeClass("fileInput");
		
		let fileReader = new FileReader();
		fileReader.onload = () =>
		{	
			data = processData(fileReader.result);
			$btnBacktest.click();
		}
		
		fileReader.readAsBinaryString(elFileInput.files[0]);
	});
};

$(document).ready(bindCallbacks);