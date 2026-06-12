import type { AgentGroupSummary } from '@/types/market';
import { AGENT_COLORS } from '@/components/market/marketTheme';
import { formatLargeNumber, TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

export default function AgentPositionDistributionPanel({ groups }: { groups: AgentGroupSummary[] }) {
  const total = Math.max(1, groups.reduce((sum, group) => sum + group.totalPosition, 0));

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold" style={{ color: TERMINAL.text }}>持仓分布</h2>
        <span className="text-[11px] tabular-nums" style={{ color: TERMINAL.textDim }}>
          {formatLargeNumber(total)} 股
        </span>
      </div>

      <div className="h-4 flex overflow-hidden" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
        {groups.map((group) => (
          <div
            key={group.type}
            title={`${group.label}: ${group.totalPosition}`}
            style={{
              width: `${Math.max(2, (group.totalPosition / total) * 100)}%`,
              backgroundColor: AGENT_COLORS[group.type] ?? TERMINAL.blue,
            }}
          />
        ))}
      </div>

      <div className="space-y-1.5">
        {groups.length === 0 ? (
          <div className="h-20 grid place-items-center text-xs font-mono" style={{ color: TERMINAL.textDim }}>暂无持仓</div>
        ) : groups.map((group) => {
          const ratio = group.totalPosition / total;
          return (
            <div key={group.type} className="grid grid-cols-[72px_1fr_64px] gap-2 items-center text-[11px] font-mono">
              <span className="truncate" style={{ color: TERMINAL.text }}>{group.label}</span>
              <div className="h-2" style={{ backgroundColor: TERMINAL.panelSoft }}>
                <div className="h-full" style={{ width: `${Math.max(1, ratio * 100)}%`, backgroundColor: AGENT_COLORS[group.type] ?? TERMINAL.blue }} />
              </div>
              <span className="text-right tabular-nums" style={{ color: TERMINAL.textDim }}>{Math.round(ratio * 100)}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
