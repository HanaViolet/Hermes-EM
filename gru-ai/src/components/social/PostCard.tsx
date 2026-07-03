import type { SocialPost } from '@/types/social';
import { TERMINAL } from '@/components/market/marketTerminal';

const POST_TYPE_LABEL: Record<SocialPost['postType'], string> = {
  opinion: '观点',
  rumor: '传闻',
  analysis: '分析',
  alert: '预警',
};

const POST_TYPE_COLOR: Record<SocialPost['postType'], string> = {
  opinion: TERMINAL.blue,
  rumor: TERMINAL.amber,
  analysis: TERMINAL.green,
  alert: TERMINAL.red,
};

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

interface PostCardProps {
  post: SocialPost;
  compact?: boolean;
  onClick?: () => void;
}

export default function PostCard({ post, compact = false, onClick }: PostCardProps) {
  const sentimentColor = post.sentiment > 0.2 ? TERMINAL.red : post.sentiment < -0.2 ? TERMINAL.green : TERMINAL.textDim;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundColor: TERMINAL.panel,
        border: `1px solid ${TERMINAL.borderSoft}`,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
      }}
      className="w-full p-3 font-mono"
    >
      <div className="flex items-center gap-2 mb-1.5 min-w-0">
        <span className="text-[10px] px-1.5 py-0.5 font-bold shrink-0" style={{ backgroundColor: POST_TYPE_COLOR[post.postType], color: '#fff' }}>
          {POST_TYPE_LABEL[post.postType]}
        </span>
        <span className="text-xs font-bold truncate" style={{ color: TERMINAL.text }}>{post.agentName}</span>
        <span className="text-[10px] shrink-0" style={{ color: TERMINAL.textDim }}>{AGENT_TYPE_LABEL[post.agentType] ?? post.agentType}</span>
        <span className="ml-auto text-[10px] shrink-0" style={{ color: sentimentColor }}>
          情绪 {post.sentiment > 0 ? '+' : ''}{(post.sentiment * 100).toFixed(0)}%
        </span>
        <span className="text-[10px] shrink-0" style={{ color: TERMINAL.textDim }}>T{post.tick}</span>
      </div>

      <p className={`text-xs leading-relaxed ${compact ? 'line-clamp-2' : ''}`} style={{ color: TERMINAL.text }}>
        {post.content}
      </p>

      <div className="flex items-center gap-4 mt-2" style={{ color: TERMINAL.textDim }}>
        <InteractionStat label="点赞" count={post.likes} />
        <InteractionStat label="收藏" count={post.collects} />
        <InteractionStat label="转发" count={post.reposts} />
        <InteractionStat label="评论" count={post.comments.length} />
        <span className="ml-auto text-[10px]" style={{ color: TERMINAL.amber }}>热度 {post.score.toFixed(2)}</span>
      </div>
    </button>
  );
}

function InteractionStat({ count, label }: { count: number; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px]" title={label}>
      <span>{label}</span>
      <span>{count}</span>
    </span>
  );
}
