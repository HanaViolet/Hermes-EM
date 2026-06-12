import { Boxes, GraduationCap, RotateCcw } from 'lucide-react';
import { useMarketStore } from '@/stores/marketStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import { useSimulationStore } from '@/stores/simulation-store';
import type { ScenarioDifficulty } from '@/types/market';
import { TERMINAL, terminalPanel } from './marketTerminal';

const DIFFICULTY_LABEL: Record<ScenarioDifficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  expert: '专家',
};

const DIFFICULTY_COLOR: Record<ScenarioDifficulty, string> = {
  easy: TERMINAL.blue,
  medium: TERMINAL.amber,
  hard: TERMINAL.red,
  expert: TERMINAL.purple,
};

export default function ScenarioControlPanel() {
  const connected = useSimulationStore((s) => s.connected);
  const sendCommand = useSimulationStore((s) => s.sendCommand);
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const scenarioUpdate = useScenarioStore((s) => s.scenarioUpdate);
  const currentId = scenarioUpdate?.currentScenario.id;
  const scenarios = scenarioUpdate?.availableScenarios ?? [];

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold font-mono flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Boxes className="h-4 w-4" />
          场景控制
        </h2>
        <button
          type="button"
          disabled={!connected || !currentId}
          className="h-7 px-2 inline-flex items-center gap-1 text-[11px] font-mono disabled:opacity-40"
          style={{ color: TERMINAL.text, border: `1px solid ${TERMINAL.border}`, backgroundColor: TERMINAL.panelSoft }}
          onClick={() => currentId && sendCommand({ command: 'set_scenario', scenarioId: currentId, symbol: activeSymbol ?? undefined })}
        >
          <RotateCcw className="h-3 w-3" />
          重载
        </button>
      </div>

      <div className="space-y-1.5 max-h-72 overflow-auto pr-1">
        {scenarios.length === 0 ? (
          <div className="h-20 grid place-items-center text-xs font-mono" style={{ color: TERMINAL.textDim }}>
            等待场景清单
          </div>
        ) : scenarios.map((scenario) => {
          const active = scenario.id === currentId;
          return (
            <button
              key={scenario.id}
              type="button"
              disabled={!connected || active}
              onClick={() => sendCommand({ command: 'set_scenario', scenarioId: scenario.id, symbol: activeSymbol ?? undefined })}
              className="w-full p-2 text-left font-mono disabled:cursor-default"
              style={{
                backgroundColor: active ? TERMINAL.panelInset : TERMINAL.panelSoft,
                border: `1px solid ${active ? TERMINAL.blue : TERMINAL.borderSoft}`,
                color: TERMINAL.text,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold truncate">{scenario.name}</span>
                <span className="text-[10px] shrink-0" style={{ color: DIFFICULTY_COLOR[scenario.difficulty] }}>
                  {DIFFICULTY_LABEL[scenario.difficulty]}
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-snug line-clamp-2" style={{ color: TERMINAL.textDim }}>
                {scenario.description}
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: TERMINAL.textDim }}>
                <span>初始情绪 {Math.round((scenario.initialSentiment + 1) * 50)}%</span>
                <span>{scenario.newsEventCount} 条事件</span>
                {scenario.trainingEnabled && (
                  <span className="inline-flex items-center gap-1" style={{ color: TERMINAL.amber }}>
                    <GraduationCap className="h-3 w-3" />
                    训练
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
