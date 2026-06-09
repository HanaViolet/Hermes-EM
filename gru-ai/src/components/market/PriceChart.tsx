import { PARCHMENT, PIXEL_CARD_RAISED } from '@/components/game/panels/panelUtils';
import type { MarketState } from '@/types/market';

function buildPath(series: MarketState['priceSeries']): string {
  if (series.length === 0) return '';
  const prices = series.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(0.01, max - min);
  return series
    .map((point, index) => {
      const x = series.length === 1 ? 0 : (index / (series.length - 1)) * 100;
      const y = 88 - ((point.price - min) / range) * 70;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export default function PriceChart({ marketState }: { marketState: MarketState | null }) {
  const path = marketState ? buildPath(marketState.priceSeries) : '';
  const current = marketState?.stock.currentPrice ?? 100;
  const previousClose = marketState?.stock.previousClose ?? 100;
  const up = current >= previousClose;

  return (
    <section className="p-3 min-h-[220px]" style={PIXEL_CARD_RAISED}>
      <div className="flex items-center justify-between mb-3 font-mono">
        <h2 className="text-sm font-bold" style={{ color: PARCHMENT.text }}>价格走势</h2>
        <span className="text-[11px] tabular-nums" style={{ color: PARCHMENT.textDim }}>
          前收 {previousClose.toFixed(2)}
        </span>
      </div>
      <svg viewBox="0 0 100 100" className="w-full h-40 block" role="img" aria-label="ABM科技价格走势">
        <rect x="0" y="0" width="100" height="100" fill="#F5ECD7" opacity="0.38" />
        {[20, 40, 60, 80].map((y) => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#C4A265" strokeWidth="0.35" opacity="0.45" />
        ))}
        <line x1="0" x2="100" y1="52" y2="52" stroke="#8B6914" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
        {path && (
          <path
            d={path}
            fill="none"
            stroke={up ? '#D94838' : '#138A4C'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </section>
  );
}
