import { Activity } from 'lucide-react';
import { useNewsStore } from '@/stores/newsStore';
import { TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

export default function NewsImpactChart() {
  const record = useNewsStore((s) => s.newsUpdate?.latestRecord);
  const feedback = record?.feedback;
  const points = feedback ? [feedback.pre_market_snapshot, ...feedback.post_market_snapshots] : [];
  const maxVolume = Math.max(1, ...points.map((point) => point.volume ?? 0));

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between gap-2 font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Activity className="h-4 w-4" />
          新闻冲击
        </h2>
        <span className="text-[10px]" style={{ color: TERMINAL.textDim }}>predicted vs realized</span>
      </div>

      {!feedback ? (
        <div className="h-32 grid place-items-center text-[11px] font-mono" style={{ color: TERMINAL.textDim }}>暂无冲击路径</div>
      ) : (
        <>
          <div className="h-32 flex items-end gap-2 px-2" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
            {points.map((point) => {
              const volumeHeight = Math.max(6, Math.round(((point.volume ?? 0) / maxVolume) * 96));
              const color = point.step === record?.article.published_step ? TERMINAL.blue : TERMINAL.amber;
              return (
                <div key={`${point.step}-${point.price}`} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1">
                  <div className="w-full" style={{ height: volumeHeight, backgroundColor: color, opacity: 0.82 }} />
                  <div className="text-[9px] font-mono tabular-nums" style={{ color: TERMINAL.textDim }}>T{point.step}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
            <Metric label="预测价格冲击" value={`${(feedback.realized_impact.predicted_price_impact * 100).toFixed(2)}%`} />
            <Metric label="1 step 实现" value={`${(feedback.realized_impact.price_change_1_step * 100).toFixed(2)}%`} />
            <Metric label="5 step 实现" value={`${(feedback.realized_impact.price_change_5_steps * 100).toFixed(2)}%`} />
            <Metric label="预测误差" value={`${(feedback.realized_impact.prediction_error_5_steps * 100).toFixed(2)}%`} />
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
      <div style={{ color: TERMINAL.textDim }}>{label}</div>
      <div className="mt-1 font-semibold tabular-nums" style={{ color: TERMINAL.text }}>{value}</div>
    </div>
  );
}
