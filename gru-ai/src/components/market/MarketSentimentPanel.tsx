import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { PARCHMENT, PIXEL_CARD_RAISED } from '@/components/game/panels/panelUtils';
import type { MarketMetrics } from '@/types/market';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sentimentView(raw: number): { label: string; color: string; icon: typeof Activity } {
  if (raw > 0.15) return { label: '偏多', color: '#D94838', icon: TrendingUp };
  if (raw < -0.15) return { label: '偏空', color: '#138A4C', icon: TrendingDown };
  return { label: '中性', color: '#8B6914', icon: Activity };
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  const percent = Math.round(clamp01(value) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span style={{ color: PARCHMENT.text }}>{label}</span>
        <span className="tabular-nums" style={{ color: PARCHMENT.textDim }}>{percent}%</span>
      </div>
      <div className="h-2" style={{ backgroundColor: '#C4A26555', boxShadow: 'inset 1px 1px 0 0 #8B6914' }}>
        <div className="h-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function MarketSentimentPanel({ metrics }: { metrics: MarketMetrics | null }) {
  const raw = metrics?.marketSentiment ?? 0;
  const normalized = clamp01((raw + 1) / 2);
  const view = sentimentView(raw);
  const Icon = view.icon;

  return (
    <section className="p-3 space-y-3" style={PIXEL_CARD_RAISED}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-bold" style={{ color: PARCHMENT.text }}>市场情绪</h2>
        <span className="text-[11px] tabular-nums" style={{ color: PARCHMENT.textDim }}>
          波动 {(metrics?.volatility ?? 0).toFixed(2)}
        </span>
      </div>

      <div className="grid grid-cols-[68px_1fr] items-center gap-3">
        <div
          className="h-16 w-16 grid place-items-center"
          style={{
            color: view.color,
            backgroundColor: '#F5ECD780',
            boxShadow: 'inset -1px -1px 0 0 #A08040, inset 1px 1px 0 0 #FFF7DF',
          }}
        >
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0 font-mono">
          <div className="text-2xl font-bold tabular-nums" style={{ color: view.color }}>
            {Math.round(normalized * 100)}%
          </div>
          <div className="text-xs" style={{ color: PARCHMENT.textDim }}>
            {view.label} · 原始值 {raw.toFixed(2)}
          </div>
        </div>
      </div>

      <MiniBar label="多头力量" value={metrics?.bullPower ?? 0.5} color="#D94838" />
      <MiniBar label="空头力量" value={metrics?.bearPower ?? 0.5} color="#138A4C" />
      <MiniBar label="盘口倾斜" value={((metrics?.orderBookImbalance ?? 0) + 1) / 2} color="#5C3D2E" />

      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums">
        <div>
          <div style={{ color: PARCHMENT.textDim }}>买压</div>
          <div style={{ color: '#D94838' }}>{Math.round((metrics?.buyPressure ?? 0) * 100)}%</div>
        </div>
        <div>
          <div style={{ color: PARCHMENT.textDim }}>卖压</div>
          <div style={{ color: '#138A4C' }}>{Math.round((metrics?.sellPressure ?? 0) * 100)}%</div>
        </div>
      </div>
    </section>
  );
}
