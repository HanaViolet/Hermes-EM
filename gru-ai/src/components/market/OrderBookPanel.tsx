import { BookOpen } from 'lucide-react';
import type { OrderBookLevel, OrderBookSnapshot } from '@/types/market';
import { TERMINAL, terminalPanel } from './marketTerminal';

function BookRow({ level, side, maxQuantity }: { level: OrderBookLevel; side: 'bid' | 'ask'; maxQuantity: number }) {
  const width = Math.max(4, Math.round((level.quantity / maxQuantity) * 100));
  const color = side === 'bid' ? TERMINAL.red : TERMINAL.green;

  return (
    <div className="relative overflow-hidden px-1 py-0.5">
      <div
        className="absolute inset-y-0 opacity-20"
        style={{
          width: `${width}%`,
          right: side === 'ask' ? 0 : undefined,
          left: side === 'bid' ? 0 : undefined,
          backgroundColor: color,
        }}
      />
      <div className="relative grid grid-cols-[1fr_1fr_0.7fr] gap-2 text-[11px] font-mono tabular-nums">
        <span style={{ color }}>{level.price.toFixed(2)}</span>
        <span style={{ color: TERMINAL.text }}>{level.quantity}</span>
        <span style={{ color: TERMINAL.textDim }}>{level.orderCount}</span>
      </div>
    </div>
  );
}

export default function OrderBookPanel({ orderBook }: { orderBook: OrderBookSnapshot | null }) {
  const asks = [...(orderBook?.asks ?? [])].reverse();
  const bids = orderBook?.bids ?? [];
  const maxQuantity = Math.max(1, ...asks.map((level) => level.quantity), ...bids.map((level) => level.quantity));

  return (
    <section className="p-3" style={terminalPanel}>
      <div className="flex items-center justify-between mb-2 font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <BookOpen className="h-4 w-4" />
          五档订单簿
        </h2>
        <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>
          Spread {orderBook?.spread?.toFixed(2) ?? '--'}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_1fr_0.7fr] gap-2 text-[9px] font-mono uppercase mb-1" style={{ color: TERMINAL.textDim }}>
        <span>价格</span>
        <span>数量</span>
        <span>单数</span>
      </div>
      <div className="space-y-1 min-h-[84px]">
        {asks.length === 0 ? (
          <div className="text-[11px] font-mono" style={{ color: TERMINAL.textDim }}>暂无卖盘</div>
        ) : asks.map((level) => <BookRow key={`ask-${level.price}`} level={level} side="ask" maxQuantity={maxQuantity} />)}
      </div>
      <div className="my-2 h-px" style={{ backgroundColor: TERMINAL.borderSoft }} />
      <div className="space-y-1 min-h-[84px]">
        {bids.length === 0 ? (
          <div className="text-[11px] font-mono" style={{ color: TERMINAL.textDim }}>暂无买盘</div>
        ) : bids.map((level) => <BookRow key={`bid-${level.price}`} level={level} side="bid" maxQuantity={maxQuantity} />)}
      </div>
    </section>
  );
}
