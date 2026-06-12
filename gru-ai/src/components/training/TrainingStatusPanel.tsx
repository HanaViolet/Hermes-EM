import { Brain, Play, RotateCcw, StepForward } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMarketStore } from '@/stores/marketStore';
import { useSimulationStore } from '@/stores/simulation-store';
import type { TrainingUpdateMessage } from '@/types/market';
import { formatLargeNumber, TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

function SmallButton({
  label,
  disabled,
  onClick,
  tone = TERMINAL.blue,
  icon,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  tone?: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-8 px-2 inline-flex items-center justify-center gap-1 text-[11px] font-mono disabled:opacity-40"
      style={{ color: tone, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}
    >
      {icon}
      {label}
    </button>
  );
}

export default function TrainingStatusPanel({ trainingUpdate }: { trainingUpdate: TrainingUpdateMessage | null }) {
  const connected = useSimulationStore((s) => s.connected);
  const sendCommand = useSimulationStore((s) => s.sendCommand);
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const observation = trainingUpdate?.observation;

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between gap-2 font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Brain className="h-4 w-4" />
          训练观测
        </h2>
        <span className="text-[11px]" style={{ color: trainingUpdate?.done ? TERMINAL.amber : TERMINAL.textDim }}>
          Episode {trainingUpdate?.episode ?? 0} / Step {trainingUpdate?.step ?? 0}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <SmallButton
          label="重置"
          disabled={!connected}
          onClick={() => sendCommand({ command: 'training_reset', symbol: activeSymbol ?? undefined })}
          icon={<RotateCcw className="h-3.5 w-3.5" />}
        />
        <SmallButton
          label="单步"
          disabled={!connected}
          onClick={() => sendCommand({ command: 'step', symbol: activeSymbol ?? undefined })}
          icon={<StepForward className="h-3.5 w-3.5" />}
          tone={TERMINAL.amber}
        />
        <SmallButton
          label="Hold"
          disabled={!connected}
          onClick={() => sendCommand({ command: 'external_action', action: { type: 'hold' }, symbol: activeSymbol ?? undefined })}
          icon={<Play className="h-3.5 w-3.5" />}
          tone={TERMINAL.neutral}
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <SmallButton
          label="Buy"
          disabled={!connected}
          onClick={() => sendCommand({ command: 'external_action', action: { type: 'buy', orderType: 'limit', quantity: 100 }, symbol: activeSymbol ?? undefined })}
          icon={<Play className="h-3.5 w-3.5" />}
          tone={TERMINAL.red}
        />
        <SmallButton
          label="Sell"
          disabled={!connected}
          onClick={() => sendCommand({ command: 'external_action', action: { type: 'sell', orderType: 'limit', quantity: 100 }, symbol: activeSymbol ?? undefined })}
          icon={<Play className="h-3.5 w-3.5" />}
          tone={TERMINAL.green}
        />
        <SmallButton
          label="运行"
          disabled={!connected}
          onClick={() => sendCommand({ command: 'start', symbol: activeSymbol ?? undefined })}
          icon={<Play className="h-3.5 w-3.5" />}
          tone={TERMINAL.blue}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        <div className="p-2" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
          <div style={{ color: TERMINAL.textDim }}>即时奖励</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: (trainingUpdate?.reward ?? 0) >= 0 ? TERMINAL.red : TERMINAL.green }}>
            {(trainingUpdate?.reward ?? 0).toFixed(4)}
          </div>
        </div>
        <div className="p-2" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
          <div style={{ color: TERMINAL.textDim }}>累计奖励</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: (trainingUpdate?.cumulativeReward ?? 0) >= 0 ? TERMINAL.red : TERMINAL.green }}>
            {(trainingUpdate?.cumulativeReward ?? 0).toFixed(4)}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex justify-between gap-2">
          <span style={{ color: TERMINAL.textDim }}>训练 Agent 财富</span>
          <span className="tabular-nums" style={{ color: TERMINAL.text }}>{formatLargeNumber(trainingUpdate?.trainingAgent.totalWealth ?? 0)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span style={{ color: TERMINAL.textDim }}>盘口不平衡</span>
          <span className="tabular-nums" style={{ color: TERMINAL.text }}>{(observation?.orderBook.imbalance ?? 0).toFixed(3)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span style={{ color: TERMINAL.textDim }}>短/长均线</span>
          <span className="tabular-nums" style={{ color: TERMINAL.text }}>
            {(observation?.price.movingAverageShort ?? 0).toFixed(2)} / {(observation?.price.movingAverageLong ?? 0).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span style={{ color: TERMINAL.textDim }}>最近新闻</span>
          <span className="tabular-nums" style={{ color: observation?.news.hasRecentNews ? TERMINAL.amber : TERMINAL.textDim }}>
            {observation?.news.hasRecentNews ? observation.news.latestSentimentImpact.toFixed(2) : '无'}
          </span>
        </div>
      </div>
    </section>
  );
}
