import { Newspaper } from 'lucide-react';
import { useNewsStore } from '@/stores/newsStore';
import { TERMINAL, terminalPanel } from '@/components/market/marketTerminal';
import NewsCard from './NewsCard';

export default function NewsFeed({ compact = false }: { compact?: boolean }) {
  const newsUpdate = useNewsStore((s) => s.newsUpdate);
  const selectedNewsId = useNewsStore((s) => s.selectedNewsId);
  const setSelectedNewsId = useNewsStore((s) => s.setSelectedNewsId);
  const news = newsUpdate?.news ?? [];

  return (
    <section className="p-3 space-y-2" style={terminalPanel}>
      <div className="flex items-center justify-between gap-2 font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Newspaper className="h-4 w-4" />
          新闻流
        </h2>
        <span className="text-[10px]" style={{ color: newsUpdate?.enabled ? TERMINAL.blue : TERMINAL.textDim }}>
          {newsUpdate?.enabled ? 'Engine ON' : 'Engine OFF'}
        </span>
      </div>

      <div className={`space-y-1.5 overflow-auto pr-1 ${compact ? 'max-h-72' : 'max-h-[420px]'}`}>
        {news.length === 0 ? (
          <div className="h-24 grid place-items-center text-[11px] font-mono" style={{ color: TERMINAL.textDim }}>
            等待虚拟金融新闻
          </div>
        ) : news.map((article) => (
          <NewsCard
            key={article.news_id}
            article={article}
            active={selectedNewsId === article.news_id}
            onSelect={() => setSelectedNewsId(article.news_id)}
          />
        ))}
      </div>
    </section>
  );
}
