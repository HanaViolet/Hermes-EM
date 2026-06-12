import type { AgentGroupSummary } from '@/types/market';
import { TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

function color(value: number): string {
  if (value > 0.45) return TERMINAL.red;
  if (value > 0.15) return '#F87171';
  if (value < -0.45) return TERMINAL.green;
  if (value < -0.15) return '#4ADE80';
  return TERMINAL.amber;
}

export default function AgentSentimentHeatmap({ groups }: { groups: AgentGroupSummary[] }) {
  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold" style={{ color: TERMINAL.text }}>情绪热力图</h2>
        <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>-1 到 +1</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {groups.length === 0 ? (
          <div className="h-20 grid place-items-center text-xs font-mono col-span-full" style={{ color: TERMINAL.textDim }}>
            等待情绪样本
          </div>
        ) : groups.map((group) => {
          const intensity = Math.max(0.25, Math.abs(group.averageSentiment));
          return (
            <div
              key={group.type}
              className="h-20 p-2 flex flex-col justify-between font-mono"
              style={{
                backgroundColor: color(group.averageSentiment),
                opacity: 0.45 + intensity * 0.45,
                border: `1px solid ${TERMINAL.borderSoft}`,
              }}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#2A1A10]">
                <span>{group.label}</span>
                <span>{group.sentimentEmoji}</span>
              </div>
              <div className="text-lg font-bold tabular-nums text-[#2A1A10]">{Math.round((group.averageSentiment + 1) * 50)}%</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
