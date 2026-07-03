import { useMemo, useState } from 'react';
import { TERMINAL, terminalPanel } from '@/components/market/marketTerminal';
import AgentSocialPanel from '@/components/social/AgentSocialPanel';
import { MOCK_SOCIAL_STATE } from '@/components/social/mockSocialData';
import PostFeed from '@/components/social/PostFeed';
import TopologyGraph from '@/components/social/TopologyGraph';
import { useSocialStore } from '@/stores/socialStore';
import type { AgentSocialProfile, GraphLink, GraphNode, SocialMetrics } from '@/types/social';

const AGENT_TYPE_LABEL: Record<string, string> = {
  retail: '散户',
  hot_money: '游资',
  mutual_fund: '公募',
  quant: '量化',
  northbound: '北向',
  national_team: '国家队',
  news: '新闻',
  training_quant: 'Hermes',
};

export default function SocialNetworkPage() {
  const liveSocialState = useSocialStore((state) => state.socialState);
  const selectedAgentId = useSocialStore((state) => state.selectedAgentId);
  const selectAgent = useSocialStore((state) => state.selectAgent);
  const [tab, setTab] = useState<'hotlist' | 'feed'>('hotlist');

  const isMock = !liveSocialState || liveSocialState.posts.length === 0;
  const socialState = isMock ? MOCK_SOCIAL_STATE : liveSocialState;

  const { nodes, links } = useMemo<{ nodes: GraphNode[]; links: GraphLink[] }>(() => {
    const graphNodes = Object.values(socialState.profiles).map((profile) => ({
      id: profile.agentId,
      name: profile.agentName,
      type: profile.agentType,
      influenceScore: profile.influenceScore,
      followers: profile.followers.length,
      following: profile.following.length,
      postCount: profile.postCount,
    }));
    const graphLinks = socialState.relations.map((relation) => ({
      source: relation.followerId,
      target: relation.followeeId,
      weight: relation.weight,
    }));
    return { nodes: graphNodes, links: graphLinks };
  }, [socialState]);

  const selectedProfile = selectedAgentId ? socialState.profiles[selectedAgentId] ?? null : null;
  const selectedFeed = selectedProfile?.feed ?? [];
  const hotPosts = useMemo(() => socialState.posts.slice(0, 80), [socialState.posts]);

  return (
    <main className="min-h-screen font-mono" style={{ backgroundColor: TERMINAL.page }}>
      <div
        className="px-4 py-2 text-xs flex items-center gap-3"
        style={{ backgroundColor: TERMINAL.panelSoft, borderBottom: `1px solid ${TERMINAL.border}` }}
      >
        <span className="font-bold" style={{ color: TERMINAL.text }}>社交网络</span>
        <span style={{ color: TERMINAL.textDim }}>Tick {socialState.tick}</span>
        <span style={{ color: TERMINAL.textDim }}>
          {Object.keys(socialState.profiles).length} 个 Agent / {socialState.relations.length} 条关系 / {socialState.posts.length} 条帖子
        </span>
        {isMock && (
          <span className="px-2 py-0.5 text-[10px]" style={{ backgroundColor: TERMINAL.amber, color: '#fff' }}>
            MOCK 演示数据
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 p-3" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <MetricStrip metrics={socialState.metrics} />

        <section style={{ ...terminalPanel }} className="overflow-hidden">
          <div
            className="px-3 py-1.5 text-[10px] font-bold"
            style={{ backgroundColor: TERMINAL.panelSoft, borderBottom: `1px solid ${TERMINAL.borderSoft}`, color: TERMINAL.textDim }}
          >
            Agent 关注拓扑 / 节点大小表示影响力 / 箭头表示关注方向 / 支持拖拽与缩放
          </div>
          <div className="w-full overflow-hidden" style={{ height: 320 }}>
            <TopologyGraph nodes={nodes} links={links} selectedId={selectedAgentId} onSelectAgent={selectAgent} width={1200} height={300} />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" style={{ minHeight: 480 }}>
          <section style={{ ...terminalPanel, overflow: 'hidden', minHeight: 480 }}>
            <AgentSocialPanel profile={selectedProfile} feed={selectedFeed} />
          </section>

          <section style={{ ...terminalPanel, overflow: 'hidden', minHeight: 480 }}>
            <div className="flex shrink-0" style={{ borderBottom: `1px solid ${TERMINAL.border}` }}>
              {(['hotlist', 'feed'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTab(mode)}
                  className="flex-1 text-[11px] py-2 font-bold transition-colors"
                  style={{
                    backgroundColor: tab === mode ? TERMINAL.blue : TERMINAL.panelSoft,
                    color: tab === mode ? '#fff' : TERMINAL.text,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {mode === 'hotlist' ? '全站热榜' : '关注 Feed'}
                </button>
              ))}
            </div>
            <div style={{ height: 'calc(100% - 36px)', overflow: 'hidden' }}>
              {tab === 'hotlist' ? (
                <PostFeed
                  posts={hotPosts}
                  title="全站热榜"
                  emptyMsg="仿真运行后，Agent 发帖会出现在这里"
                  onSelectAgent={selectAgent}
                />
              ) : (
                <PostFeed
                  posts={selectedFeed}
                  title={selectedProfile ? `${selectedProfile.agentName} 的推荐 Feed` : '请先选择 Agent'}
                  emptyMsg={selectedProfile ? '推荐 Feed 为空' : '点击拓扑图选择 Agent'}
                  onSelectAgent={selectAgent}
                />
              )}
            </div>
          </section>

          <section style={{ ...terminalPanel, overflow: 'hidden', minHeight: 480 }}>
            <InfluenceRanking profiles={Object.values(socialState.profiles)} selectedId={selectedAgentId} onSelect={selectAgent} />
          </section>
        </div>
      </div>
    </main>
  );
}

function MetricStrip({ metrics }: { metrics: SocialMetrics }) {
  const cards = [
    { label: '平均情绪', value: `${(metrics.averageSentiment * 100).toFixed(0)}%`, color: metrics.averageSentiment >= 0 ? TERMINAL.red : TERMINAL.green },
    { label: '传闻热度', value: metrics.rumorHeat.toFixed(2), color: TERMINAL.amber },
    { label: '预警热度', value: metrics.alertHeat.toFixed(2), color: TERMINAL.red },
    { label: '互动量', value: String(metrics.totalInteractions), color: TERMINAL.blue },
    { label: '平均影响力', value: `${(metrics.averageInfluence * 100).toFixed(0)}%`, color: TERMINAL.text },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {cards.map((card) => (
        <div key={card.label} style={{ ...terminalPanel }} className="px-3 py-2">
          <div className="text-[10px]" style={{ color: TERMINAL.textDim }}>{card.label}</div>
          <div className="text-lg font-bold" style={{ color: card.color }}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}

function InfluenceRanking({
  profiles,
  selectedId,
  onSelect,
}: {
  profiles: AgentSocialProfile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const sorted = useMemo(() => [...profiles].sort((a, b) => b.influenceScore - a.influenceScore), [profiles]);

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-3 py-2 text-xs font-bold shrink-0"
        style={{ backgroundColor: TERMINAL.panelSoft, borderBottom: `1px solid ${TERMINAL.border}`, color: TERMINAL.text }}
      >
        影响力排行
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-4 text-center text-xs" style={{ color: TERMINAL.textDim }}>等待数据...</div>
        ) : (
          sorted.map((profile, index) => (
            <button
              key={profile.agentId}
              type="button"
              onClick={() => onSelect(profile.agentId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left"
              style={{
                borderBottom: `1px solid ${TERMINAL.borderSoft}`,
                backgroundColor: profile.agentId === selectedId ? TERMINAL.panelInset : 'transparent',
                color: TERMINAL.text,
                cursor: 'pointer',
              }}
            >
              <span className="text-[10px] w-5 text-right shrink-0" style={{ color: TERMINAL.textDim }}>#{index + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate">{profile.agentName}</span>
                  <span className="text-[9px] shrink-0" style={{ color: TERMINAL.textDim }}>{AGENT_TYPE_LABEL[profile.agentType] ?? profile.agentType}</span>
                </div>
                <div className="h-1 mt-1" style={{ backgroundColor: TERMINAL.panelInset }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${(profile.influenceScore * 100).toFixed(1)}%`,
                      backgroundColor: index < 3 ? TERMINAL.amber : TERMINAL.blue,
                    }}
                  />
                </div>
              </div>
              <span className="text-[10px] shrink-0" style={{ color: TERMINAL.amber }}>
                {(profile.influenceScore * 100).toFixed(0)}%
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
