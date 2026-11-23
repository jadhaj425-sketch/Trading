import { GetGoldCandlesQueryParams, GetGoldCandlesResponse } from "@workspace/api-zod";
import { Router, type IRouter } from "express";

const router: IRouter = Router();
const cache = new Map<
  string,
  {
    expiresAt: number;
    requestedLimit: number;
    payload: ReturnType<typeof GetGoldCandlesResponse.parse>;
  }
>();
const CACHE_TTL_MS = 30_000;
const MAX_PROVIDER_OUTPUT = 1_000;

const intervals = {
  "1m": { provider: "1min", milliseconds: 60_000 },
  "5m": { provider: "5min", milliseconds: 5 * 60_000 },
  "10m": { provider: "5min", milliseconds: 10 * 60_000 },
  "15m": { provider: "15min", milliseconds: 15 * 60_000 },
  "30m": { provider: "30min", milliseconds: 30 * 60_000 },
  "1h": { provider: "1h", milliseconds: 60 * 60_000 },
  "4h": { provider: "4h", milliseconds: 4 * 60 * 60_000 },
  "1d": { provider: "1day", milliseconds: 24 * 60 * 60_000 },
} as const;

type RequestedInterval = keyof typeof intervals;

type ProviderCandle = {
  datetime?: unknown;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
  volume?: unknown;
};

type ProviderResponse = {
  status?: unknown;
  values?: unknown;
};

type Candle = {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  complete: boolean;
};

function parseNumber(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCandleTime(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value.includes("T")
      ? value
      : value.replace(" ", "T");
  const withTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)
    ? normalized
    : `${normalized}Z`;
  const parsed = new Date(withTimezone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseProviderCandles(values: unknown[]): Candle[] {
  return values
    .map((value): Candle | null => {
      if (typeof value !== "object" || value === null) return null;
      const candle = value as ProviderCandle;
      const time = parseCandleTime(candle.datetime);
      const open = parseNumber(candle.open);
      const high = parseNumber(candle.high);
      const low = parseNumber(candle.low);
      const close = parseNumber(candle.close);
      const volume = parseNumber(candle.volume);
      if (
        !time ||
        open === null ||
        high === null ||
        low === null ||
        close === null ||
        high < Math.max(open, close, low) ||
        low > Math.min(open, close, high)
      ) {
        return null;
      }
      return { time, open, high, low, close, volume, complete: false };
    })
    .filter((candle): candle is Candle => candle !== null)
    .sort((left, right) => left.time.getTime() - right.time.getTime());
}

function aggregateTenMinuteCandles(candles: Candle[], now: number): Candle[] {
  const bucketSize = intervals["10m"].milliseconds;
  const buckets = new Map<number, Candle[]>();

  for (const candle of candles) {
    const bucketStart = Math.floor(candle.time.getTime() / bucketSize) * bucketSize;
    const bucket = buckets.get(bucketStart) ?? [];
    bucket.push(candle);
    buckets.set(bucketStart, bucket);
  }

  return [...buckets.entries()]
    .filter(([, bucket]) => bucket.length === 2)
    .map(([bucketStart, bucket]) => {
      const [first, last] = bucket;
      const complete = bucketStart + bucketSize <= now;
      return {
        time: new Date(bucketStart),
        open: first.open,
        high: Math.max(...bucket.map((candle) => candle.high)),
        low: Math.min(...bucket.map((candle) => candle.low)),
        close: last.close,
        volume:
          first.volume === null || last.volume === null
            ? null
            : first.volume + last.volume,
        complete,
      };
    });
}

router.get("/gold/candles", async (req, res) => {
  const parsedQuery = GetGoldCandlesQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: "Choose a supported candle interval and limit." });
    return;
  }

  const { interval, limit } = parsedQuery.data;
  const config = intervals[interval as RequestedInterval];
  const cacheKey = interval;
  const cached = cache.get(cacheKey);
  if (
    cached &&
    cached.expiresAt > Date.now() &&
    cached.requestedLimit >= limit
  ) {
    res.json(
      GetGoldCandlesResponse.parse({
        ...cached.payload,
        candles: cached.payload.candles.slice(-limit),
      }),
    );
    return;
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error:
        "Twelve Data is not configured. Add TWELVE_DATA_API_KEY to the server secrets to enable candle analysis.",
    });
    return;
  }

  const outputsize = interval === "10m"
    ? Math.min(limit * 2 + 2, MAX_PROVIDER_OUTPUT)
    : limit;
  const url = new URL("https://api.twelvedata.com/time_series");
  url.search = new URLSearchParams({
    symbol: "XAU/USD",
    interval: config.provider,
    outputsize: String(outputsize),
    timezone: "UTC",
    order: "asc",
    apikey: apiKey,
  }).toString();

  let providerResponse: Response;
  try {
    providerResponse = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  } catch {
    res.status(502).json({ error: "The verified candle feed could not be reached. Try again shortly." });
    return;
  }

  if (!providerResponse.ok) {
    res.status(502).json({ error: "The verified candle feed returned an error. Try again shortly." });
    return;
  }

  let providerData: ProviderResponse;
  try {
    providerData = (await providerResponse.json()) as ProviderResponse;
  } catch {
    res.status(502).json({ error: "The verified candle feed returned unreadable data." });
    return;
  }

  if (
    providerData.status === "error" ||
    !Array.isArray(providerData.values)
  ) {
    res.status(502).json({ error: "The verified candle feed returned no usable data." });
    return;
  }

  const now = Date.now();
  const providerCandles = parseProviderCandles(providerData.values);
  const candleData = interval === "10m"
    ? aggregateTenMinuteCandles(providerCandles, now)
    : providerCandles.map((candle) => ({
        ...candle,
        complete: candle.time.getTime() + config.milliseconds <= now,
      }));
  const candles = candleData.slice(-limit);
  const lastComplete = [...candles].reverse().find((candle) => candle.complete);
  const isStale =
    !lastComplete ||
    now - (lastComplete.time.getTime() + config.milliseconds) >
      config.milliseconds * 3;

  const payload = GetGoldCandlesResponse.parse({
    symbol: "XAU/USD",
    source: "Twelve Data",
    interval,
    fetchedAt: new Date(now),
    isStale,
    candles,
  });
  cache.set(cacheKey, {
    expiresAt: now + CACHE_TTL_MS,
    requestedLimit: limit,
    payload,
  });
  res.json(payload);
});

export default router;
