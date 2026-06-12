import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import type { MarketMetrics } from '@/types/market';
import { TERMINAL, terminalPanel } from './marketTerminal';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function view(raw: number) {
  if (raw > 0.18) return { label: '偏多', color: TERMINAL.red, icon: TrendingUp };
  if (raw < -0.18) return { label: '偏空', color: TERMINAL.green, icon: TrendingDown };
  return { label: '中性', color: TERMINAL.amber, icon: Activity };
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  const percent = Math.round(clamp01(value) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span style={{ color: TERMINAL.text }}>{label}</span>
        <span className="tabular-nums" style={{ color: TERMINAL.textDim }}>{percent}%</span>
      </div>
      <div className="h-2" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
        <div className="h-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function MarketSentimentPanel({ metrics }: { metrics: MarketMetrics | null }) {
  const raw = metrics?.marketSentiment ?? 0;
  const normalized = clamp01((raw + 1) / 2);
  const current = view(raw);
  const Icon = current.icon;

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold" style={{ color: TERMINAL.text }}>市场情绪</h2>
        <span className="text-[11px] tabular-nums" style={{ color: TERMINAL.textDim }}>
          原始 {raw.toFixed(2)}
        </span>
      </div>

      <div className="grid grid-cols-[70px_1fr] items-center gap-3">
        <div className="h-16 w-16 grid place-items-center" style={{ color: current.color, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.border}` }}>
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0 font-mono">
          <div className="text-3xl font-bold tabular-nums" style={{ color: current.color }}>
            {Math.round(normalized * 100)}%
          </div>
          <div className="text-xs" style={{ color: TERMINAL.textDim }}>{current.label} · 情绪刻度 0-100</div>
        </div>
      </div>

      <MiniBar label="多头力量" value={metrics?.bullPower ?? 0.5} color={TERMINAL.red} />
      <MiniBar label="空头力量" value={metrics?.bearPower ?? 0.5} color={TERMINAL.green} />
      <MiniBar label="盘口倾斜" value={((metrics?.orderBookImbalance ?? 0) + 1) / 2} color={TERMINAL.blue} />

      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums">
        <div className="p-2" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
          <div style={{ color: TERMINAL.textDim }}>买压</div>
          <div style={{ color: TERMINAL.red }}>{Math.round((metrics?.buyPressure ?? 0) * 100)}%</div>
        </div>
        <div className="p-2" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
          <div style={{ color: TERMINAL.textDim }}>卖压</div>
          <div style={{ color: TERMINAL.green }}>{Math.round((metrics?.sellPressure ?? 0) * 100)}%</div>
        </div>
      </div>
    </section>
  );
}
