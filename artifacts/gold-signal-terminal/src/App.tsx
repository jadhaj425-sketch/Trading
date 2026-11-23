import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Activity,
  CalendarDays,
  Clock3,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

const intervals = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '10m', value: '10' },
  { label: '15m', value: '15' },
  { label: '30m', value: '30' },
  { label: '1h', value: '60' },
  { label: '4h', value: '240' },
  { label: '1d', value: 'D' },
];

const factors = [
  'Market structure · HH / HL, LH / LL',
  'Support & resistance',
  'Liquidity sweeps / stop hunts',
  'Order blocks · supply / demand',
  'Fair value gaps',
  'BOS / CHoCH',
  'Inducement',
  'Premium / discount',
  'Trendlines / channels',
  'Rejection · engulfing · inside bar',
  'Asian / London / New York highs & lows',
  'Opening range',
  'Wyckoff phases',
  'Fakeouts',
  'Mitigation / retest entries',
];

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
            {showPredictions ? 'Close predictions' : 'Predictions'}
          </button>
        </div>
      </section>
      <div className="notice" role="note" data-testid="notice-data-limitation">
        <ShieldAlert aria-hidden="true" />
        <div><strong>Analysis data not connected.</strong> TradingView embeds are for visual reference only; their data is not available to Aurum for programmatic analysis. Predictions will remain unavailable until a verified candle feed and event/news data source are connected.</div>
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
                <h2 id="predictions-title">XAU/USD technical review</h2>
                <p>Requested factors · evaluated only with verified machine-readable data</p>
              </div>
            </div>
            <span className="unavailable-badge" data-testid="status-predictions-unavailable">NO SIGNAL / UNAVAILABLE</span>
          </div>
          <div className="prediction-content">
            <div className="no-signal" role="status" data-testid="text-no-signal">
              <strong>No analysis has run.</strong> Aurum has no connected programmatic XAU/USD candle feed or CPI/news API. The embedded TradingView chart and calendar do not expose their data to this evaluation. This is a source limitation, not a market signal.
            </div>
            <div className="factor-heading"><span>Review checklist</span><span className="mono">15 FACTORS · NOT EVALUATED</span></div>
            <div className="factor-grid">
              {factors.map((factor, index) => (
                <div className="factor" key={factor} data-testid={`factor-not-evaluated-${index + 1}`}>
                  <span>{factor}</span><span>NOT EVALUATED</span>
                </div>
              ))}
            </div>
            <p className="disclaimer">No direction, entry, stop, target, event assessment, or confidence estimate is provided. Connect a verified data source before relying on automated technical or event-risk analysis.</p>
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
