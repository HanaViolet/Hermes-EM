import type { AgentGroupSummary } from '@/types/market';
import { TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

export default function AgentStrategyPanel({ group }: { group: AgentGroupSummary | null }) {
  const params = Object.entries(group?.strategyParams ?? {});

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold" style={{ color: TERMINAL.text }}>策略参数</h2>
        <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>{group?.label ?? '--'}</span>
      </div>

      <div className="p-2 font-mono" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
        <div className="text-[10px]" style={{ color: TERMINAL.textDim }}>当前策略</div>
        <div className="mt-1 text-xs" style={{ color: TERMINAL.text }}>{group?.strategyStatus ?? '等待选择 Agent 类型'}</div>
      </div>

      <div className="space-y-1.5">
        {params.length === 0 ? (
          <div className="h-20 grid place-items-center text-xs font-mono" style={{ color: TERMINAL.textDim }}>
            暂无策略参数
          </div>
        ) : params.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-2 text-[11px] font-mono">
            <span className="truncate" style={{ color: TERMINAL.textDim }}>{key}</span>
            <span className="text-right tabular-nums" style={{ color: TERMINAL.text }}>{String(value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
