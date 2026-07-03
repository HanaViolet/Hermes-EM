import { useMemo } from 'react';
import type { SocialPost } from '@/types/social';
import { TERMINAL } from '@/components/market/marketTerminal';
import PostCard from './PostCard';

interface PostFeedProps {
  posts: SocialPost[];
  title: string;
  emptyMsg?: string;
  onSelectAgent?: (agentId: string) => void;
}

export default function PostFeed({ posts, title, emptyMsg = '暂无帖子', onSelectAgent }: PostFeedProps) {
  const sorted = useMemo(() => [...posts].sort((a, b) => b.score - a.score), [posts]);

  return (
    <div className="flex flex-col h-full font-mono">
      <div
        className="px-3 py-2 text-xs font-bold flex items-center gap-2 shrink-0"
        style={{ backgroundColor: TERMINAL.panelSoft, borderBottom: `1px solid ${TERMINAL.border}`, color: TERMINAL.text }}
      >
        <span>{title}</span>
        <span className="ml-auto text-[10px]" style={{ color: TERMINAL.textDim }}>{sorted.length} 条</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-4 text-center text-xs" style={{ color: TERMINAL.textDim }}>{emptyMsg}</div>
        ) : (
          <div className="divide-y" style={{ borderColor: TERMINAL.borderSoft }}>
            {sorted.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                compact
                onClick={onSelectAgent ? () => onSelectAgent(post.agentId) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
