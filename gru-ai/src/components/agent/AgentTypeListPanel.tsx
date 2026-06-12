import type { AgentGroupSummary, AgentType } from '@/types/market';
import { AGENT_COLORS, AGENT_LABELS } from '@/components/market/marketTheme';
import { TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

export default function AgentTypeListPanel({
  groups,
  selectedType,
  onSelect,
}: {
  groups: AgentGroupSummary[];
  selectedType: AgentType | null;
  onSelect: (type: AgentType) => void;
}) {
  return (
    <section className="p-3 space-y-2" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold" style={{ color: TERMINAL.text }}>Agent 类型</h2>
        <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>{groups.length}</span>
      </div>

      <div className="space-y-1.5">
        {groups.length === 0 ? (
          <div className="h-20 grid place-items-center text-xs font-mono" style={{ color: TERMINAL.textDim }}>
            等待 Agent 入场
          </div>
        ) : groups.map((group) => {
          const active = group.type === selectedType;
          return (
            <button
              key={group.type}
              type="button"
              onClick={() => onSelect(group.type)}
              className="w-full p-2 text-left font-mono"
              style={{
                backgroundColor: active ? TERMINAL.panelInset : TERMINAL.panelSoft,
                border: `1px solid ${active ? (AGENT_COLORS[group.type] ?? TERMINAL.blue) : TERMINAL.borderSoft}`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold truncate" style={{ color: TERMINAL.text }}>
                  {group.label || AGENT_LABELS[group.type]}
                </span>
                <span className="text-[10px]" style={{ color: AGENT_COLORS[group.type] ?? TERMINAL.blue }}>
                  {group.sentimentEmoji} {group.count}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span style={{ color: TERMINAL.textDim }}>{group.strategyStatus}</span>
                <span style={{ color: group.tradingBias === 'buy' ? TERMINAL.red : group.tradingBias === 'sell' ? TERMINAL.green : TERMINAL.neutral }}>
                  {group.latestAction.toUpperCase()}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
