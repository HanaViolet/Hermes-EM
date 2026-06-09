import CapitalFlowPanel from '@/components/market/CapitalFlowPanel';
import MarketSentimentPanel from '@/components/market/MarketSentimentPanel';
import NewsPanel from '@/components/market/NewsPanel';
import OrderBookPanel from '@/components/market/OrderBookPanel';
import PriceChart from '@/components/market/PriceChart';
import RecentTradesPanel from '@/components/market/RecentTradesPanel';
import VolumeChart from '@/components/market/VolumeChart';
import { PARCHMENT, PIXEL_CARD } from '@/components/game/panels/panelUtils';
import type { MarketState } from '@/types/market';
import { formatMoney } from '@/components/market/marketTheme';

function StatCell({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' | 'neutral' }) {
  const color = tone === 'up' ? '#D94838' : tone === 'down' ? '#138A4C' : PARCHMENT.text;
  return (
    <div className="p-2" style={PIXEL_CARD}>
      <div className="text-[9px] font-mono uppercase" style={{ color: PARCHMENT.textDim }}>{label}</div>
      <div className="text-sm font-bold font-mono tabular-nums mt-1" style={{ color }}>{value}</div>
    </div>
  );
}

export default function MarketOverview({ marketState }: { marketState: MarketState | null }) {
  const stock = marketState?.stock ?? null;
  const up = (stock?.change ?? 0) >= 0;

  return (
    <div className="space-y-3">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCell label="当前价" value={stock ? stock.currentPrice.toFixed(2) : '--'} tone={up ? 'up' : 'down'} />
        <StatCell label="涨跌额" value={stock ? `${up ? '+' : ''}${stock.change.toFixed(2)}` : '--'} tone={up ? 'up' : 'down'} />
        <StatCell label="成交量" value={stock ? String(stock.volume) : '--'} />
        <StatCell label="成交额" value={stock ? formatMoney(stock.turnover) : '--'} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-3">
        <div className="space-y-3 min-w-0">
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-3">
            <PriceChart marketState={marketState} />
            <VolumeChart marketState={marketState} />
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <MarketSentimentPanel metrics={marketState?.metrics ?? null} />
            <NewsPanel events={marketState?.events ?? []} />
            <CapitalFlowPanel metrics={marketState?.metrics ?? null} />
          </section>
        </div>

        <aside className="space-y-3 min-w-0">
          <OrderBookPanel orderBook={marketState?.orderBook ?? null} />
          <RecentTradesPanel trades={marketState?.recentTrades ?? []} />
        </aside>
      </section>
    </div>
  );
}
