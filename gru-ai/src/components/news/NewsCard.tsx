import { AlertTriangle, CheckCircle2, Radio, ShieldAlert } from 'lucide-react';
import type { SyntheticNewsArticle } from '@/types/market';
import { formatLargeNumber, TERMINAL } from '@/components/market/marketTerminal';

function tone(article: SyntheticNewsArticle) {
  if (article.source_type === 'clarification_notice') return { color: TERMINAL.blue, label: '澄清', icon: CheckCircle2 };
  if (article.impact_direction === 'up') return { color: TERMINAL.red, label: '利好', icon: Radio };
  if (article.impact_direction === 'down') return { color: TERMINAL.green, label: '利空', icon: ShieldAlert };
  if (article.impact_direction === 'uncertain') return { color: TERMINAL.amber, label: '传闻', icon: AlertTriangle };
  return { color: TERMINAL.neutral, label: '中性', icon: Radio };
}

export default function NewsCard({
  article,
  active,
  onSelect,
}: {
  article: SyntheticNewsArticle;
  active: boolean;
  onSelect: () => void;
}) {
  const view = tone(article);
  const Icon = view.icon;
  const elapsed = Math.max(0, article.duration_steps - Math.round(Math.log(Math.abs(article.current_impact / Math.max(0.001, article.impact_strength))) / Math.log(article.decay_rate || 0.8)));

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full p-2 text-left font-mono"
      style={{
        color: TERMINAL.text,
        backgroundColor: active ? '#FFF2C8' : TERMINAL.panelSoft,
        border: `1px ${article.impact_direction === 'uncertain' ? 'dashed' : 'solid'} ${active ? view.color : TERMINAL.borderSoft}`,
        boxShadow: active ? `inset 0 -2px 0 ${view.color}` : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] shrink-0" style={{ color: view.color }}>
          <Icon className="h-3 w-3" />
          {view.label}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: TERMINAL.textDim }}>T{article.published_step}</span>
      </div>
      <div className="mt-1 text-[12px] font-bold leading-snug line-clamp-2">{article.title}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]" style={{ color: TERMINAL.textDim }}>
        <span>{article.source_name}</span>
        <span>可信 {Math.round(article.credibility * 100)}%</span>
        <span>冲击 {Math.round(Math.abs(article.impact_strength) * 100)}%</span>
        <span>当前 {formatLargeNumber(Math.abs(article.current_impact) * 100)}%</span>
        <span>剩余 {Number.isFinite(elapsed) ? Math.max(0, elapsed) : article.duration_steps} step</span>
      </div>
    </button>
  );
}
