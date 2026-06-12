import { ListChecks } from 'lucide-react';
import type { Trade } from '@/types/market';
import { AGENT_LABELS } from './marketTheme';
import { formatLargeNumber, TERMINAL, terminalPanel } from './marketTerminal';

export default function TradeTapePanel({ trades }: { trades: Trade[] }) {
  return (
    <section className="p-3" style={terminalPanel}>
      <div className="flex items-center justify-between mb-2 font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <ListChecks className="h-4 w-4" />
          成交明细
        </h2>
        <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>{trades.length}</span>
      </div>

      <div className="grid grid-cols-[34px_54px_54px_1fr] gap-2 text-[10px] font-mono mb-1" style={{ color: TERMINAL.textDim }}>
        <span>方向</span>
        <span>价格</span>
        <span>数量</span>
        <span>买/卖方</span>
      </div>
      <div className="space-y-1 max-h-[248px] overflow-auto pr-1">
        {trades.length === 0 ? (
          <div className="h-28 grid place-items-center text-xs font-mono" style={{ color: TERMINAL.textDim }}>
            等待第一笔撮合成交
          </div>
        ) : trades.slice(0, 18).map((trade) => (
          <div key={trade.id} className="grid grid-cols-[34px_54px_54px_1fr] gap-2 text-[11px] font-mono tabular-nums">
            <span style={{ color: trade.aggressorSide === 'buy' ? TERMINAL.red : TERMINAL.green }}>
              {trade.aggressorSide === 'buy' ? 'B' : 'S'}
            </span>
            <span style={{ color: TERMINAL.text }}>{trade.price.toFixed(2)}</span>
            <span style={{ color: TERMINAL.textDim }}>{formatLargeNumber(trade.quantity)}</span>
            <span className="truncate" style={{ color: TERMINAL.textDim }}>
              {AGENT_LABELS[trade.buyerAgentType]} / {AGENT_LABELS[trade.sellerAgentType]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
