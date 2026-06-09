import { PARCHMENT, PIXEL_CARD_RAISED } from '@/components/game/panels/panelUtils';
import type { MarketState } from '@/types/market';
import { formatMoney } from './marketTheme';

export default function VolumeChart({ marketState }: { marketState: MarketState | null }) {
  const series = marketState?.volumeSeries.slice(-48) ?? [];
  const maxVolume = Math.max(100, ...series.map((point) => point.volume));
  const turnover = marketState?.stock.turnover ?? 0;

  return (
    <section className="p-3 min-h-[190px]" style={PIXEL_CARD_RAISED}>
      <div className="flex items-center justify-between mb-3 font-mono">
        <h2 className="text-sm font-bold" style={{ color: PARCHMENT.text }}>成交量</h2>
        <span className="text-[11px] tabular-nums" style={{ color: PARCHMENT.textDim }}>
          成交额 {formatMoney(turnover)}
        </span>
      </div>
      <div className="h-32 flex items-end gap-1">
        {series.length === 0 ? (
          <div className="text-[11px] font-mono" style={{ color: PARCHMENT.textDim }}>等待成交</div>
        ) : series.map((point) => {
          const height = Math.max(3, Math.round((point.volume / maxVolume) * 100));
          return (
            <div
              key={`${point.tick}-${point.time}`}
              className="flex-1 min-w-[3px]"
              title={`${point.time} ${point.volume}`}
              style={{
                height: `${height}%`,
                backgroundColor: point.volume > 0 ? '#5C3D2E' : '#C4A26555',
                boxShadow: 'inset 1px 1px 0 0 #F5ECD740',
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
