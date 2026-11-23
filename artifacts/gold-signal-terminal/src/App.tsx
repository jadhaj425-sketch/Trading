import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetGoldCandles } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Activity,
  CalendarDays,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { buildTechnicalSnapshot } from '@/lib/gold-analysis';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

const intervals = [
  { label: '1m', value: '1', apiInterval: '1m' },
  { label: '5m', value: '5', apiInterval: '5m' },
  { label: '10m', value: '10', apiInterval: '10m' },
  { label: '15m', value: '15', apiInterval: '15m' },
  { label: '30m', value: '30', apiInterval: '30m' },
  { label: '1h', value: '60', apiInterval: '1h' },
  { label: '4h', value: '240', apiInterval: '4h' },
  { label: '1d', value: 'D', apiInterval: '1d' },
] as const;

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUtc(value: Date) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(value);
}

function TradingViewChart({ interval }: { interval: string }) {
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = widgetRef.current;
    if (!host) return;
    host.replaceChildren();
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.height = '100%';
    container.style.width = '100%';
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = 'calc(100% - 32px)';
    widget.style.width = '100%';
    const attribution = document.createElement('div');
    attribution.className = 'tradingview-widget-copyright';
    attribution.style.cssText = 'height:24px;display:flex;align-items:center;justify-content:center;font:10px sans-serif;color:#77818d';
    attribution.innerHTML = '<a href="https://www.tradingview.com/symbols/XAUUSD/" rel="noopener nofollow" target="_blank" style="color:#bba66f;text-decoration:none">XAUUSD chart</a><span style="margin-left:4px">by TradingView</span>';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: 'OANDA:XAUUSD',
      interval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      backgroundColor: '#11161e',
      gridColor: 'rgba(120, 136, 153, 0.12)',
      support_host: 'https://www.tradingview.com',
    });
    container.append(widget, attribution, script);
    host.append(container);
    return () => host.replaceChildren();
  }, [interval]);

  return <div ref={widgetRef} data-testid="chart-xauusd-widget" aria-label="TradingView OANDA XAU/USD advanced chart" />;
}

function EconomicCalendar() {
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = widgetRef.current;
    if (!host) return;
    host.replaceChildren();
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.height = '100%';
    container.style.width = '100%';
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = '100%';
    widget.style.width = '100%';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.textContent = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      locale: 'en',
      width: '100%',
      height: '100%',
      importanceFilter: '-1,0,1',
      countryFilter: 'us,eu,gb,jp,cn',
    });
    container.append(widget, script);
    host.append(container);
    return () => host.replaceChildren();
  }, []);

  return <div ref={widgetRef} data-testid="economic-calendar-widget" aria-label="TradingView economic calendar" />;
}

function Home() {
  const [interval, setInterval] = useState('15');
  const [showPredictions, setShowPredictions] = useState(false);
  const activeInterval = intervals.find((item) => item.value === interval) ?? intervals[3];
  const predictionsQuery = useGetGoldCandles(
    { interval: activeInterval.apiInterval, limit: 150 },
    { query: { enabled: false, retry: 0, staleTime: 30_000 } },
  );
  const snapshot = predictionsQuery.data
    ? buildTechnicalSnapshot(predictionsQuery.data.candles)
    : null;

  useEffect(() => {
    if (showPredictions) void predictionsQuery.refetch();
  }, [showPredictions, activeInterval.apiInterval]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < intervals.length) setInterval(intervals[index].value);
      if (event.key === 'Escape') setShowPredictions(false);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand" aria-label="Aurum gold market intelligence">
          <div className="brand-mark" aria-hidden="true"><span>A</span></div>
          <div>
            <div className="brand-name">AURUM</div>
            <div className="brand-caption">Market intelligence</div>
          </div>
        </div>
        <div className="header-right">
          <div className="desk-note"><span className="desk-dot" />Market hours vary by venue</div>
          <div className="source-chip">XAU / USD&nbsp;&nbsp;·&nbsp;&nbsp;DESK 01</div>
        </div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div>
          <div className="eyebrow">Metals / spot context</div>
          <h1 id="page-title">Gold, in focus<span className="hero-symbol">.</span></h1>
          <p>Live chart context and scheduled event risk for XAU/USD. Read the market clearly; decide for yourself.</p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="prediction-button"
            aria-expanded={showPredictions}
            aria-controls="predictions-panel"
            data-testid="button-predictions"
            onClick={() => setShowPredictions((value) => !value)}
          >
            <Sparkles aria-hidden="true" />
            {showPredictions ? 'Close predictions' : 'Run predictions'}
          </button>
        </div>
      </section>
      <div className="notice" role="note" data-testid="notice-data-limitation">
        <ShieldAlert aria-hidden="true" />
        <div><strong>Analysis uses a separate verified feed.</strong> TradingView embeds are visual references only; the technical review loads XAU/USD candles directly from the configured server-side market data source.</div>
      </div>

      <div className="workspace">
        <section className="panel chart-panel" aria-labelledby="chart-title">
          <div className="panel-head">
            <div className="instrument">
              <div className="gold-glyph" aria-hidden="true">Au</div>
              <div>
                <h2 id="chart-title">Gold Spot / U.S. Dollar</h2>
                <div className="instrument-meta"><span>OANDA:XAUUSD</span><span className="separator">/</span><span>Spot market</span></div>
              </div>
            </div>
            <div className="widget-source">TradingView · Advanced Chart</div>
          </div>
          <div className="timeframe-row">
            <div className="timeframes" role="group" aria-label="Chart timeframe">
              {intervals.map((item, index) => (
                <button
                  key={item.value}
                  type="button"
                  className={`tf-button${interval === item.value ? ' active' : ''}`}
                  aria-pressed={interval === item.value}
                  aria-label={`${item.label} chart interval, keyboard shortcut ${index + 1}`}
                  data-testid={`button-timeframe-${item.label}`}
                  onClick={() => setInterval(item.value)}
                >{item.label}</button>
              ))}
            </div>
            <span className="interval-note">Keys 1–8 switch interval</span>
          </div>
          <div className="chart-frame">
            <TradingViewChart interval={interval} />
          </div>
        </section>

        <section className="panel event-panel" aria-labelledby="events-title">
          <div className="panel-head">
            <div className="section-heading"><CalendarDays aria-hidden="true" /><h2 id="events-title">Economic calendar</h2></div>
            <span className="live-tag">SCHEDULED EVENTS</span>
          </div>
          <div className="event-copy">Upcoming macro releases and event timing from the embedded calendar. Review the source for current details.</div>
          <div className="calendar-frame"><EconomicCalendar /></div>
          <div className="calendar-foot">Calendar content is provided by <a href="https://www.tradingview.com/economic-calendar/" target="_blank" rel="noopener noreferrer" data-testid="link-tradingview-calendar">TradingView</a>. Aurum does not read or independently verify embedded events.</div>
        </section>
      </div>

      {showPredictions && (
        <section className="panel prediction-panel" id="predictions-panel" aria-labelledby="predictions-title" data-testid="panel-predictions">
          <div className="prediction-head">
            <div className="prediction-title">
              <div className="gold-glyph" aria-hidden="true"><Activity size={17} /></div>
              <div>
                <h2 id="predictions-title">XAU/USD technical outlook</h2>
                <p>{activeInterval.label} timeframe · verified completed candles only</p>
              </div>
            </div>
            <div className="prediction-head-actions">
              <span className={`unavailable-badge${snapshot ? ' available-badge' : ''}`} data-testid="status-predictions">
                {predictionsQuery.isFetching ? 'LOADING DATA' : predictionsQuery.isError ? 'UPDATE FAILED' : snapshot ? (predictionsQuery.data?.isStale ? 'STALE DATA' : 'DATA READY') : predictionsQuery.data ? 'INSUFFICIENT DATA' : 'WAITING'}
              </span>
              <button
                type="button"
                className="refresh-button"
                onClick={() => void predictionsQuery.refetch()}
                disabled={predictionsQuery.isFetching}
                aria-label="Refresh technical analysis"
                data-testid="button-refresh-predictions"
              >
                <RefreshCw aria-hidden="true" className={predictionsQuery.isFetching ? 'spinning' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div className="prediction-content">
            {predictionsQuery.isFetching && !predictionsQuery.data && (
              <div className="no-signal" role="status" data-testid="text-predictions-loading">
                <strong>Loading verified candles.</strong> The technical snapshot will appear when enough completed data is available.
              </div>
            )}
            {predictionsQuery.isError && (
              <div className="no-signal error-signal" role="alert" data-testid="text-predictions-error">
                <strong>Analysis is unavailable.</strong>{' '}
                {(predictionsQuery.error as { status?: number })?.status === 503
                  ? "Add TWELVE_DATA_API_KEY to the server's Replit Secrets, then retry."
                  : 'The verified candle feed could not be loaded. Check the server data source and retry.'}
              </div>
            )}
            {snapshot && predictionsQuery.data && (
              <>
                {predictionsQuery.data.isStale && (
                  <div className="no-signal stale-signal" role="status" data-testid="text-predictions-stale">
                    <strong>Latest candle data may be stale.</strong> Treat this snapshot as historical context only.
                  </div>
                )}
                <div className={`outlook-card outlook-${snapshot.bias === 'Bullish alignment' ? 'bullish' : snapshot.bias === 'Bearish alignment' ? 'bearish' : 'mixed'}`} data-testid="prediction-outlook">
                  <div>
                    <span className="outlook-label">Rule-based technical alignment</span>
                    <strong>{snapshot.bias}</strong>
                  </div>
                  <span className="outlook-interval mono">{activeInterval.label.toUpperCase()}</span>
                </div>
                <div className="analysis-metrics">
                  <div className="analysis-metric">
                    <span>Last close</span><strong>${formatPrice(snapshot.close)}</strong>
                  </div>
                  <div className="analysis-metric">
                    <span>20-candle average</span><strong>${formatPrice(snapshot.sma20)}</strong>
                  </div>
                  <div className="analysis-metric">
                    <span>50-candle average</span><strong>${formatPrice(snapshot.sma50)}</strong>
                  </div>
                  <div className="analysis-metric">
                    <span>RSI · 14</span><strong>{snapshot.rsi14.toFixed(1)}</strong>
                  </div>
                  <div className="analysis-metric">
                    <span>Previous candle</span><strong className={snapshot.changePercent >= 0 ? 'metric-positive' : 'metric-negative'}>{snapshot.changePercent >= 0 ? '+' : ''}{snapshot.changePercent.toFixed(2)}%</strong>
                  </div>
                  <div className="analysis-metric">
                    <span>Completed candles</span><strong>{snapshot.candleCount}</strong>
                  </div>
                </div>
                <div className="factor-heading"><span>Data source</span><span className="mono">{predictionsQuery.data.source.toUpperCase()} · {formatUtc(snapshot.asOf)} UTC</span></div>
              </>
            )}
            {!predictionsQuery.isFetching && !predictionsQuery.isError && !snapshot && (
              <div className="no-signal" role="status" data-testid="text-no-signal">
                <strong>Not enough completed candles yet.</strong> At least 50 are needed to calculate this technical snapshot. Refresh after the market data feed is available.
              </div>
            )}
            <p className="disclaimer">This is a rule-based technical snapshot of recent candles, not a price forecast or trading recommendation. It provides no entry, stop, target, probability, or CPI/news assessment.</p>
          </div>
        </section>
      )}

      <footer className="footer">
        <span>Aurum provides market context, not a prompt to trade.</span>
        <span className="mono"><Clock3 size={11} style={{ verticalAlign: '-2px', marginRight: 5 }} />Market availability varies by instrument and venue.</span>
      </footer>
    </main>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
