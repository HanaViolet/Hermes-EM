import type { AgentGroupSummary } from '@/types/market';
import { AGENT_COLORS } from '@/components/market/marketTheme';
import { formatLargeNumber, TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

export default function AgentWealthDistributionPanel({ groups }: { groups: AgentGroupSummary[] }) {
  const max = Math.max(1, ...groups.map((group) => group.totalCash + group.totalMarketValue));
  const visibleGroups = groups.slice(0, 8);

  return (
    <section className="p-3 space-y-3 overflow-hidden" style={terminalPanel}>
      <div className="flex min-w-0 items-center justify-between gap-2 font-mono">
        <h2 className="min-w-0 text-sm font-semibold" style={{ color: TERMINAL.text }}>财富分布</h2>
        <span className="shrink-0 text-[10px] sm:text-[11px]" style={{ color: TERMINAL.textDim }}>现金 + 市值</span>
      </div>

      <div className="h-40 min-w-0">
        {visibleGroups.length === 0 ? (
          <div className="h-full flex-1 grid place-items-center text-xs font-mono" style={{ color: TERMINAL.textDim }}>暂无财富数据</div>
        ) : (
          <div className="grid h-full min-w-0 grid-cols-[repeat(auto-fit,minmax(30px,1fr))] items-end gap-1 sm:gap-1.5">
            {visibleGroups.map((group) => {
              const wealth = group.totalCash + group.totalMarketValue;
              const height = Math.max(10, (wealth / max) * 100);
              return (
                <div key={group.type} className="flex min-w-0 flex-col items-center gap-1 font-mono">
                  <div className="flex h-[104px] w-full items-end justify-center border-b" style={{ borderColor: TERMINAL.borderSoft }}>
                    <div
                      className="w-[72%] max-w-[48px] min-w-[14px]"
                      title={`${group.label}: ${formatLargeNumber(wealth)}`}
                      style={{
                        height: `${height}%`,
                        backgroundColor: AGENT_COLORS[group.type] ?? TERMINAL.blue,
                        border: `1px solid ${TERMINAL.borderSoft}`,
                        boxShadow: `inset 1px 1px 0 rgba(255,247,223,0.55), inset -1px -1px 0 rgba(61,43,31,0.16)`,
                      }}
                    />
                  </div>
                  <div
                    className="max-w-full px-0.5 text-center text-[9px] leading-[1.15] sm:text-[10px]"
                    title={`${group.label}: ${formatLargeNumber(wealth)}`}
                    style={{ color: TERMINAL.textDim, wordBreak: 'keep-all', overflowWrap: 'anywhere' }}
                  >
                    {group.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {visibleGroups.length > 0 && (
        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono sm:grid-cols-3" style={{ color: TERMINAL.textDim }}>
          {visibleGroups.slice(0, 3).map((group) => {
            const wealth = group.totalCash + group.totalMarketValue;
            return (
              <div key={`${group.type}-wealth`} className="min-w-0 truncate">
                <span style={{ color: AGENT_COLORS[group.type] ?? TERMINAL.blue }}>■</span>
                <span className="ml-1">{group.label}</span>
                <span className="ml-1 tabular-nums">{formatLargeNumber(wealth)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
