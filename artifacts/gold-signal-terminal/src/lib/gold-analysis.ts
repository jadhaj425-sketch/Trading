import type { GoldCandle } from "@workspace/api-client-react";

export type TechnicalSnapshot = {
  bias: "Bullish alignment" | "Bearish alignment" | "Mixed signals";
  close: number;
  sma20: number;
  sma50: number;
  rsi14: number;
  changePercent: number;
  candleCount: number;
  asOf: Date;
};

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateRsi(closes: number[], period = 14): number {
  const window = closes.slice(-period - 1);
  const changes = window.slice(1).map((close, index) => close - window[index]);
  const gains = changes.map((change) => Math.max(change, 0));
  const losses = changes.map((change) => Math.max(-change, 0));
  const averageGain = average(gains);
  const averageLoss = average(losses);

  if (averageGain === 0 && averageLoss === 0) return 50;
  if (averageLoss === 0) return 100;
  return 100 - 100 / (1 + averageGain / averageLoss);
}

export function buildTechnicalSnapshot(
  candles: readonly GoldCandle[],
): TechnicalSnapshot | null {
  const completed = candles.filter((candle) => candle.complete);
  if (completed.length < 50) return null;

  const closes = completed.map((candle) => candle.close);
  const close = closes.at(-1);
  const previousClose = closes.at(-2);
  const lastCandle = completed.at(-1);
  if (close === undefined || previousClose === undefined || !lastCandle) return null;

  const sma20 = average(closes.slice(-20));
  const sma50 = average(closes.slice(-50));
  const rsi14 = calculateRsi(closes);
  const bullish =
    close > sma20 && sma20 > sma50 && rsi14 >= 50 && rsi14 < 70;
  const bearish =
    close < sma20 && sma20 < sma50 && rsi14 > 30 && rsi14 <= 50;

  return {
    bias: bullish
      ? "Bullish alignment"
      : bearish
        ? "Bearish alignment"
        : "Mixed signals",
    close,
    sma20,
    sma50,
    rsi14,
    changePercent: ((close - previousClose) / previousClose) * 100,
    candleCount: completed.length,
    asOf: new Date(String(lastCandle.time)),
  };
}
