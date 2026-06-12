import { Layers3 } from 'lucide-react';
import type { OrderBookSnapshot } from '@/types/market';
import { TERMINAL, terminalPanel } from './marketTerminal';

function cumulative(levels: OrderBookSnapshot['bids']): Array<{ price: number; quantity: number }> {
  let sum = 0;
  return levels.slice(0, 10).map((level) => {
    sum += level.quantity;
    return { price: level.price, quantity: sum };
  });
}

export default function MarketDepthChart({ orderBook }: { orderBook: OrderBookSnapshot | null }) {
  const bids = cumulative(orderBook?.bids ?? []);
  const asks = cumulative(orderBook?.asks ?? []);
  const max = Math.max(1, ...bids.map((level) => level.quantity), ...asks.map((level) => level.quantity));

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Layers3 className="h-4 w-4" />
          市场深度
        </h2>
        <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>
          深度 {orderBook?.depth ?? 0}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          {[...bids].reverse().map((level) => (
            <div key={`depth-bid-${level.price}`} className="grid grid-cols-[44px_1fr_54px] items-center gap-2 text-[10px] font-mono tabular-nums">
              <span style={{ color: TERMINAL.red }}>{level.price.toFixed(2)}</span>
              <div className="h-2" style={{ backgroundColor: TERMINAL.panelSoft }}>
                <div className="h-full ml-auto" style={{ width: `${Math.max(2, (level.quantity / max) * 100)}%`, backgroundColor: TERMINAL.red, opacity: 0.72 }} />
              </div>
              <span className="text-right" style={{ color: TERMINAL.textDim }}>{level.quantity}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {asks.map((level) => (
            <div key={`depth-ask-${level.price}`} className="grid grid-cols-[54px_1fr_44px] items-center gap-2 text-[10px] font-mono tabular-nums">
              <span style={{ color: TERMINAL.textDim }}>{level.quantity}</span>
              <div className="h-2" style={{ backgroundColor: TERMINAL.panelSoft }}>
                <div className="h-full" style={{ width: `${Math.max(2, (level.quantity / max) * 100)}%`, backgroundColor: TERMINAL.green, opacity: 0.72 }} />
              </div>
              <span className="text-right" style={{ color: TERMINAL.green }}>{level.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {bids.length === 0 && asks.length === 0 && (
        <div className="h-20 grid place-items-center text-xs font-mono" style={{ color: TERMINAL.textDim }}>
          等待委托进入订单簿
        </div>
      )}
    </section>
  );
}
