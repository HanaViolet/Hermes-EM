import type { AgentSnapshot } from '@/types/market';
import { AGENT_LABELS } from '@/components/market/marketTheme';
import { formatLargeNumber, TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

function RankingList({ title, agents, positive }: { title: string; agents: AgentSnapshot[]; positive: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-mono" style={{ color: TERMINAL.textDim }}>{title}</div>
      {agents.length === 0 ? (
        <div className="text-xs font-mono" style={{ color: TERMINAL.textDim }}>暂无排行</div>
      ) : agents.slice(0, 5).map((agent, index) => (
        <div key={agent.id} className="grid grid-cols-[22px_1fr_64px] gap-2 items-center text-[11px] font-mono">
          <span style={{ color: TERMINAL.textDim }}>{index + 1}</span>
          <span className="truncate" style={{ color: TERMINAL.text }}>
            {AGENT_LABELS[agent.type]} · {agent.name}
          </span>
          <span className="text-right tabular-nums" style={{ color: positive ? TERMINAL.red : TERMINAL.green }}>
            {(agent.returnRate * 100).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AgentProfitRankingPanel({
  topProfitAgents,
  topLossAgents,
}: {
  topProfitAgents: AgentSnapshot[];
  topLossAgents: AgentSnapshot[];
}) {
  const best = topProfitAgents[0];
  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold" style={{ color: TERMINAL.text }}>收益排行</h2>
        <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>
          最高 {best ? formatLargeNumber(best.totalWealth) : '--'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankingList title="盈利前列" agents={topProfitAgents} positive />
        <RankingList title="亏损前列" agents={topLossAgents} positive={false} />
      </div>
    </section>
  );
}
