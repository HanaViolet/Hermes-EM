import { useMemo, useState } from 'react';
import AgentBehaviorTimeline from '@/components/agent/AgentBehaviorTimeline';
import AgentDetailPanel from '@/components/agent/AgentDetailPanel';
import AgentGroupCards from '@/components/agent/AgentGroupCards';
import AgentMarketMap from '@/components/market/AgentMarketMap';
import AgentOverviewPanel from '@/components/agent/AgentOverviewPanel';
import AgentPositionDistributionPanel from '@/components/agent/AgentPositionDistributionPanel';
import AgentProfitRankingPanel from '@/components/agent/AgentProfitRankingPanel';
import AgentSentimentHeatmap from '@/components/agent/AgentSentimentHeatmap';
import AgentStrategyPanel from '@/components/agent/AgentStrategyPanel';
import AgentTypeListPanel from '@/components/agent/AgentTypeListPanel';
import AgentWealthDistributionPanel from '@/components/agent/AgentWealthDistributionPanel';
import AgentReactionPanel from '@/components/news/AgentReactionPanel';
import NewsFeed from '@/components/news/NewsFeed';
import TrainingStatusPanel from '@/components/training/TrainingStatusPanel';
import { useMarketStore } from '@/stores/marketStore';
import { useTrainingStore } from '@/stores/trainingStore';
import type { AgentSnapshot, AgentType, MarketState } from '@/types/market';
import { AGENT_LABELS, sentimentEmoji, sentimentLabel } from '@/components/market/marketTheme';
import { TERMINAL } from '@/components/market/marketTerminal';

function buildSnapshots(marketState: MarketState | null): AgentSnapshot[] {
  const price = marketState?.stock.currentPrice ?? 0;
  return (marketState?.agents ?? []).map((agent) => {
    const marketValue = agent.position * price;
    const totalWealth = agent.cash + marketValue;
    const baseCapital = Math.max(1, agent.groupSize ?? 1) * 1_000_000;
    return {
      ...agent,
      marketValue,
      totalWealth,
      returnRate: (totalWealth - baseCapital) / baseCapital,
      sentimentLabel: sentimentLabel(agent.sentiment),
      sentimentEmoji: sentimentEmoji(agent.sentiment),
    };
  });
}

export default function AgentStatusPage() {
  const marketState = useMarketStore((s) => s.marketState);
  const trainingUpdate = useTrainingStore((s) => s.trainingUpdate);
  const [userSelectedType, setUserSelectedType] = useState<AgentType | null>(null);

  const groups = useMemo(() => marketState?.groups ?? [], [marketState]);
  const behaviorEvents = marketState?.behaviorEvents ?? [];

  const selectedType = useMemo(() => {
    if (userSelectedType && groups.some((group) => group.type === userSelectedType)) {
      return userSelectedType;
    }
    return groups[0]?.type ?? null;
  }, [groups, userSelectedType]);

  const snapshots = useMemo(() => buildSnapshots(marketState), [marketState]);
  const selectedGroup = groups.find((group) => group.type === selectedType) ?? groups[0] ?? null;
  const selectedAgent = snapshots.find((agent) => agent.type === selectedType) ?? snapshots[0] ?? null;
  const profitAgents = marketState?.topProfitAgents ?? [...snapshots].sort((a, b) => b.returnRate - a.returnRate).slice(0, 8);
  const lossAgents = marketState?.topLossAgents ?? [...snapshots].sort((a, b) => a.returnRate - b.returnRate).slice(0, 8);

  return (
    <main className="min-h-[calc(100dvh-56px)] p-3 sm:p-4" style={{ backgroundColor: TERMINAL.page }}>
      <div className="mx-auto max-w-[1800px] space-y-3">
        <AgentOverviewPanel
          overview={marketState?.overview}
          tick={marketState?.status.tick}
          simulationTime={marketState?.status.virtualTime}
          stock={marketState?.stock ?? null}
        />

        <section className="grid grid-cols-1 2xl:grid-cols-[280px_minmax(0,1fr)_360px] gap-3">
          <aside className="space-y-3 min-w-0">
            <AgentTypeListPanel groups={groups} selectedType={selectedType} onSelect={setUserSelectedType} />
            <AgentDetailPanel agent={selectedAgent} />
            <AgentStrategyPanel group={selectedGroup} />
          </aside>

          <div className="space-y-3 min-w-0">
            <AgentMarketMap agents={marketState?.agents ?? []} variant="full" />
            <AgentGroupCards groups={groups} agents={snapshots} behaviorEvents={behaviorEvents} />
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <AgentSentimentHeatmap groups={groups} />
              <AgentProfitRankingPanel topProfitAgents={profitAgents} topLossAgents={lossAgents} />
            </section>
          </div>

          <aside className="space-y-3 min-w-0">
            <TrainingStatusPanel trainingUpdate={trainingUpdate} />
            <NewsFeed compact />
            <AgentReactionPanel />
            <AgentPositionDistributionPanel groups={groups} />
            <AgentWealthDistributionPanel groups={groups} />
            <AgentBehaviorTimeline events={behaviorEvents} />
          </aside>
        </section>

        <section className="p-3 font-mono text-[11px]" style={{ backgroundColor: TERMINAL.panelSoft, color: TERMINAL.textDim, border: `1px solid ${TERMINAL.borderSoft}` }}>
          {selectedGroup
            ? `${selectedGroup.label || AGENT_LABELS[selectedGroup.type]} 当前处于 ${selectedGroup.strategyStatus}，最近动作 ${selectedGroup.latestAction}。`
            : 'Agent 状态页等待仿真快照。'}
        </section>
      </div>
    </main>
  );
}
