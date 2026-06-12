import { FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNewsStore } from '@/stores/newsStore';
import { useMarketStore } from '@/stores/marketStore';
import { AGENT_LABELS } from '@/components/market/marketTheme';
import { TERMINAL, terminalPanel } from '@/components/market/marketTerminal';
import { API_BASE } from '@/lib/api';
import type { SyntheticNewsRecord } from '@/types/market';

export default function NewsDetailPanel() {
  const newsUpdate = useNewsStore((s) => s.newsUpdate);
  const selectedNewsId = useNewsStore((s) => s.selectedNewsId);
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const [fetchedRecord, setFetchedRecord] = useState<SyntheticNewsRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const latestRecord = useMemo(
    () => newsUpdate?.latestRecord?.article.news_id === selectedNewsId
      ? newsUpdate.latestRecord
      : undefined,
    [newsUpdate, selectedNewsId],
  );
  const record = latestRecord ?? fetchedRecord ?? undefined;
  const article = record?.article ?? newsUpdate?.news.find((item) => item.news_id === selectedNewsId) ?? newsUpdate?.news[0] ?? null;
  const event = record?.event;
  const received = record?.exposures.filter((item) => item.received) ?? [];

  useEffect(() => {
    if (!selectedNewsId || latestRecord) {
      setFetchedRecord(null);
      setLoadingDetail(false);
      return;
    }

    const controller = new AbortController();
    const query = activeSymbol ? `?symbol=${encodeURIComponent(activeSymbol)}` : '';
    setLoadingDetail(true);

    fetch(`${API_BASE}/api/news/${encodeURIComponent(selectedNewsId)}${query}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SyntheticNewsRecord | null) => {
        if (!controller.signal.aborted) {
          setFetchedRecord(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFetchedRecord(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingDetail(false);
        }
      });

    return () => controller.abort();
  }, [activeSymbol, latestRecord, selectedNewsId]);

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between gap-2 font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <FileText className="h-4 w-4" />
          新闻详情
        </h2>
        <span className="text-[10px]" style={{ color: TERMINAL.textDim }}>{loadingDetail ? '载入中' : article?.news_id ?? '--'}</span>
      </div>

      {!article ? (
        <div className="h-32 grid place-items-center text-[11px] font-mono" style={{ color: TERMINAL.textDim }}>暂无新闻详情</div>
      ) : (
        <>
          <div className="font-mono">
            <h3 className="text-sm font-bold leading-snug" style={{ color: TERMINAL.text }}>{article.title}</h3>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: TERMINAL.textDim }}>{article.content}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
            <Metric label="来源" value={article.source_name} />
            <Metric label="可信度" value={`${Math.round(article.credibility * 100)}%`} />
            <Metric label="当前冲击" value={`${Math.round(Math.abs(article.current_impact) * 100)}%`} />
            <Metric label="持续" value={`${article.duration_steps} step`} />
          </div>

          {event && (
            <div className="p-2 font-mono text-[10px] max-h-40 overflow-auto" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}`, color: TERMINAL.textDim }}>
              <div style={{ color: TERMINAL.text }}>event JSON</div>
              <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify({
                event_id: event.event_id,
                event_type: event.event_type,
                category: event.event_category,
                direction: event.event_direction,
                strength: event.event_strength,
                causal_reason: event.causal_reason,
                affected_agent_types: event.affected_agent_types,
              }, null, 2)}</pre>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
            <Metric label="接收 Agent" value={String(received.length)} color={TERMINAL.blue} />
            <Metric label="买倾向" value={String(received.filter((item) => item.action_bias === 'buy').length)} color={TERMINAL.red} />
            <Metric label="卖倾向" value={String(received.filter((item) => item.action_bias === 'sell').length)} color={TERMINAL.green} />
            <Metric label="一致性" value={record?.consistency.passed ? '通过' : '调整'} color={record?.consistency.passed ? TERMINAL.blue : TERMINAL.amber} />
          </div>

          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 8).map((tag) => (
              <span key={tag} className="px-1.5 py-1 text-[10px] font-mono" style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
                {AGENT_LABELS[tag as keyof typeof AGENT_LABELS] ?? tag}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-2" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
      <div style={{ color: TERMINAL.textDim }}>{label}</div>
      <div className="mt-1 font-semibold tabular-nums truncate" style={{ color: color ?? TERMINAL.text }}>{value}</div>
    </div>
  );
}
