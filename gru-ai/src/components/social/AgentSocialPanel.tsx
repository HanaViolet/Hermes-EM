import type { ReactNode } from 'react';
import type { AgentSocialProfile, SocialPost } from '@/types/social';
import { TERMINAL } from '@/components/market/marketTerminal';
import PostCard from './PostCard';

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

interface AgentSocialPanelProps {
  profile: AgentSocialProfile | null;
  feed: SocialPost[];
}

export default function AgentSocialPanel({ profile, feed }: AgentSocialPanelProps) {
  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center text-xs font-mono" style={{ color: TERMINAL.textDim }}>
        点击拓扑图节点查看 Agent 社交档案
      </div>
    );
  }

  const influencePct = (profile.influenceScore * 100).toFixed(1);

  return (
    <div className="flex flex-col h-full font-mono text-xs overflow-hidden">
      <div className="px-3 py-2 shrink-0" style={{ backgroundColor: TERMINAL.panelSoft, borderBottom: `1px solid ${TERMINAL.border}` }}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: TERMINAL.text }}>{profile.agentName}</span>
          <span className="text-[10px] px-1.5 py-0.5" style={{ backgroundColor: TERMINAL.blue, color: '#fff' }}>
            {AGENT_TYPE_LABEL[profile.agentType] ?? profile.agentType}
          </span>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-[10px] mb-0.5" style={{ color: TERMINAL.textDim }}>
            <span>影响力</span>
            <span style={{ color: TERMINAL.amber }}>{influencePct}%</span>
          </div>
          <div className="h-1.5" style={{ backgroundColor: TERMINAL.panelInset }}>
            <div className="h-full transition-all" style={{ width: `${influencePct}%`, backgroundColor: TERMINAL.amber }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 shrink-0" style={{ borderBottom: `1px solid ${TERMINAL.borderSoft}` }}>
        <Stat label="发帖" value={profile.postCount} />
        <Stat label="获赞" value={profile.totalLikes} />
        <Stat label="粉丝" value={profile.followers.length} />
        <Stat label="关注" value={profile.following.length} />
      </div>

      <PanelHeader>推荐 Feed</PanelHeader>
      <div className="flex-1 overflow-y-auto">
        {feed.length === 0 ? (
          <Empty>暂无推荐内容</Empty>
        ) : (
          <div className="divide-y" style={{ borderColor: TERMINAL.borderSoft }}>
            {feed.slice(0, 10).map((post) => <PostCard key={post.id} post={post} compact />)}
          </div>
        )}
      </div>

      <PanelHeader borderTop>历史发帖 ({profile.ownPosts.length})</PanelHeader>
      <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '40%' }}>
        {profile.ownPosts.length === 0 ? (
          <Empty>尚未发帖</Empty>
        ) : (
          <div className="divide-y" style={{ borderColor: TERMINAL.borderSoft }}>
            {profile.ownPosts.map((post) => <PostCard key={post.id} post={post} compact />)}
          </div>
        )}
      </div>
    </div>
  );
}

function PanelHeader({ children, borderTop = false }: { children: ReactNode; borderTop?: boolean }) {
  return (
    <div
      className="shrink-0 px-2 py-1.5"
      style={{
        borderTop: borderTop ? `1px solid ${TERMINAL.border}` : undefined,
        borderBottom: `1px solid ${TERMINAL.borderSoft}`,
      }}
    >
      <span className="text-[10px] font-bold" style={{ color: TERMINAL.textDim }}>{children}</span>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="p-3 text-center" style={{ color: TERMINAL.textDim }}>{children}</div>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center py-2" style={{ borderRight: `1px solid ${TERMINAL.borderSoft}` }}>
      <span className="font-bold text-sm" style={{ color: TERMINAL.text }}>{value}</span>
      <span className="text-[10px]" style={{ color: TERMINAL.textDim }}>{label}</span>
    </div>
  );
}
