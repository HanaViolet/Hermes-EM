import { Users } from 'lucide-react';
import { useMemo } from 'react';
import { useNewsStore } from '@/stores/newsStore';
import { AGENT_LABELS } from '@/components/market/marketTheme';
import { TERMINAL, terminalPanel } from '@/components/market/marketTerminal';
import type { AgentType } from '@/types/market';

export default function AgentReactionPanel() {
  const record = useNewsStore((s) => s.newsUpdate?.latestRecord);
  const rows = useMemo(() => {
    const groups = new Map<AgentType, { count: number; strength: number; buy: number; sell: number; hold: number }>();
    for (const exposure of record?.exposures ?? []) {
      if (!exposure.received) continue;
      const current = groups.get(exposure.agent_type) ?? { count: 0, strength: 0, buy: 0, sell: 0, hold: 0 };
      current.count += 1;
      current.strength += exposure.reaction_strength;
      current.buy += exposure.action_bias === 'buy' ? 1 : 0;
      current.sell += exposure.action_bias === 'sell' ? 1 : 0;
      current.hold += exposure.action_bias === 'hold' ? 1 : 0;
      groups.set(exposure.agent_type, current);
    }
    return Array.from(groups.entries()).map(([type, value]) => ({
      type,
      ...value,
      strength: value.count ? value.strength / value.count : 0,
    }));
  }, [record]);

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between gap-2 font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Users className="h-4 w-4" />
          Agent 新闻反应
        </h2>
        <span className="text-[10px]" style={{ color: TERMINAL.textDim }}>{record?.article.news_id ?? '--'}</span>
      </div>

      {rows.length === 0 ? (
        <div className="h-24 grid place-items-center text-[11px] font-mono" style={{ color: TERMINAL.textDim }}>暂无接收记录</div>
      ) : rows.map((row) => (
        <div key={row.type} className="font-mono text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold" style={{ color: TERMINAL.text }}>{AGENT_LABELS[row.type]}</span>
            <span className="tabular-nums" style={{ color: TERMINAL.textDim }}>{row.count} received · {Math.round(row.strength * 100)}%</span>
          </div>
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_44px] gap-2 items-center">
            <div className="h-2 flex" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
              <div style={{ width: `${row.buy / Math.max(1, row.count) * 100}%`, backgroundColor: TERMINAL.red }} />
              <div style={{ width: `${row.sell / Math.max(1, row.count) * 100}%`, backgroundColor: TERMINAL.green }} />
              <div style={{ width: `${row.hold / Math.max(1, row.count) * 100}%`, backgroundColor: TERMINAL.neutral }} />
            </div>
            <span className="tabular-nums" style={{ color: TERMINAL.textDim }}>B{row.buy}/S{row.sell}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
