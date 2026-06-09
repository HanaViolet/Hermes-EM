import { PARCHMENT, PIXEL_CARD_RAISED } from '@/components/game/panels/panelUtils';
import type { Trade } from '@/types/market';
import { AGENT_LABELS } from './marketTheme';

export default function RecentTradesPanel({ trades }: { trades: Trade[] }) {
  return (
    <section className="p-3" style={PIXEL_CARD_RAISED}>
      <div className="flex items-center justify-between mb-2 font-mono">
        <h2 className="text-sm font-bold" style={{ color: PARCHMENT.text }}>最近成交</h2>
        <span className="text-[11px]" style={{ color: PARCHMENT.textDim }}>{trades.length}</span>
      </div>
      <div className="grid grid-cols-[0.5fr_0.8fr_0.7fr_1fr] gap-2 text-[9px] font-mono uppercase mb-1" style={{ color: PARCHMENT.textDim }}>
        <span>方向</span>
        <span>价格</span>
        <span>数量</span>
        <span>对手</span>
      </div>
      <div className="space-y-1 max-h-52 overflow-hidden">
        {trades.length === 0 ? (
          <div className="text-[11px] font-mono" style={{ color: PARCHMENT.textDim }}>等待第一笔撮合</div>
        ) : trades.slice(0, 12).map((trade) => (
          <div key={trade.id} className="grid grid-cols-[0.5fr_0.8fr_0.7fr_1fr] gap-2 text-[11px] font-mono tabular-nums">
            <span style={{ color: trade.aggressorSide === 'buy' ? '#D94838' : '#138A4C' }}>
              {trade.aggressorSide === 'buy' ? 'B' : 'S'}
            </span>
            <span style={{ color: PARCHMENT.text }}>{trade.price.toFixed(2)}</span>
            <span style={{ color: PARCHMENT.textDim }}>{trade.quantity}</span>
            <span className="truncate" style={{ color: PARCHMENT.textDim }}>
              {AGENT_LABELS[trade.buyerAgentType]} / {AGENT_LABELS[trade.sellerAgentType]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
