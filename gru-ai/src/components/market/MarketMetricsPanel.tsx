import { Gauge } from 'lucide-react';
import type { MarketMetrics } from '@/types/market';
import { formatLargeNumber, TERMINAL, terminalPanel } from './marketTerminal';

function MetricCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="p-2 font-mono" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
      <div className="text-[10px]" style={{ color: TERMINAL.textDim }}>{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums" style={{ color: tone ?? TERMINAL.text }}>{value}</div>
    </div>
  );
}

export default function MarketMetricsPanel({ metrics }: { metrics: MarketMetrics | null }) {
  const flow = metrics?.capitalFlowTotal ?? 0;
  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Gauge className="h-4 w-4" />
          市场指标
        </h2>
        <span className="text-[11px] tabular-nums" style={{ color: TERMINAL.textDim }}>
          Fill {(metrics?.fillRate ?? 0).toFixed(2)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCell label="波动率" value={(metrics?.volatility ?? 0).toFixed(3)} tone={TERMINAL.amber} />
        <MetricCell label="换手率" value={`${((metrics?.turnoverRate ?? 0) * 100).toFixed(3)}%`} />
        <MetricCell label="流动性深度" value={formatLargeNumber(metrics?.liquidityDepth ?? 0)} tone={TERMINAL.blue} />
        <MetricCell label="最大回撤" value={`${((metrics?.maxDrawdown ?? 0) * 100).toFixed(2)}%`} tone={TERMINAL.green} />
        <MetricCell label="主动买入" value={`${Math.round((metrics?.activeBuyRatio ?? 0) * 100)}%`} tone={TERMINAL.red} />
        <MetricCell label="主动卖出" value={`${Math.round((metrics?.activeSellRatio ?? 0) * 100)}%`} tone={TERMINAL.green} />
        <MetricCell label="涨停触达" value={String(metrics?.limitUpTouches ?? 0)} tone={TERMINAL.red} />
        <MetricCell label="跌停触达" value={String(metrics?.limitDownTouches ?? 0)} tone={TERMINAL.green} />
      </div>

      <div className="p-2 font-mono" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
        <div className="flex items-center justify-between text-[11px]">
          <span style={{ color: TERMINAL.textDim }}>全市场净流入</span>
          <span className="tabular-nums" style={{ color: flow >= 0 ? TERMINAL.red : TERMINAL.green }}>
            {formatLargeNumber(flow)}
          </span>
        </div>
      </div>
    </section>
  );
}
