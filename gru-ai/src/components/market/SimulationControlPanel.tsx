import { Download, Gauge, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMarketStore } from '@/stores/marketStore';
import { useSimulationStore } from '@/stores/simulation-store';
import type { SimulationStatus } from '@/types/market';
import { TERMINAL, terminalPanel } from './marketTerminal';

const SPEEDS = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '5x', value: 5 },
  { label: '10x', value: 10 },
  { label: 'Max', value: 16 },
];

function ControlButton({
  children,
  disabled,
  onClick,
  active,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-9 px-3 inline-flex items-center justify-center gap-2 text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        color: active ? '#ffffff' : TERMINAL.text,
        backgroundColor: active ? TERMINAL.blue : TERMINAL.panelSoft,
        border: `1px solid ${active ? TERMINAL.blue : TERMINAL.border}`,
      }}
    >
      {children}
    </button>
  );
}

export default function SimulationControlPanel({ connected, status }: { connected: boolean; status: SimulationStatus | null }) {
  const sendCommand = useSimulationStore((s) => s.sendCommand);
  const marketState = useMarketStore((s) => s.marketState);
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const running = status?.running ?? false;
  const speed = status?.speed ?? 1;
  const commandSymbol = activeSymbol ?? marketState?.stock.symbol;

  function exportData() {
    if (!marketState) return;
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      market_snapshots: [marketState],
      trades: marketState.recentTrades,
      events: marketState.events,
      agent_snapshots: marketState.agents,
      experiment_summary: {
        symbol: marketState.stock.symbol,
        scenario: marketState.scenario.name,
        tick: marketState.status.tick,
        price: marketState.stock.currentPrice,
      },
    }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${marketState.stock.symbol.toLowerCase()}-experiment-${marketState.status.tick}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold font-mono" style={{ color: TERMINAL.text }}>仿真控制</h2>
        <span className="text-[11px] font-mono" style={{ color: connected ? TERMINAL.blue : TERMINAL.green }}>
          {connected ? 'WS 已连接' : 'WS 未连接'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ControlButton disabled={!connected} active={running} onClick={() => sendCommand(running ? { command: 'pause', symbol: commandSymbol } : { command: 'start', symbol: commandSymbol })}>
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {running ? '暂停' : '开始'}
        </ControlButton>
        <ControlButton disabled={!connected || running} onClick={() => sendCommand({ command: 'step', symbol: commandSymbol })}>
          <StepForward className="h-3.5 w-3.5" />
          单步
        </ControlButton>
        <ControlButton disabled={!connected} onClick={() => sendCommand({ command: 'reset', symbol: commandSymbol })}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </ControlButton>
        <ControlButton disabled={!marketState} onClick={exportData}>
          <Download className="h-3.5 w-3.5" />
          导出
        </ControlButton>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono" style={{ color: TERMINAL.textDim }}>
          <Gauge className="h-3.5 w-3.5" />
          切换速度
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {SPEEDS.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={!connected}
              onClick={() => sendCommand({ command: 'set_speed', speed: item.value, symbol: commandSymbol })}
              className="h-8 text-[11px] font-mono disabled:opacity-40"
              style={{
                color: speed === item.value ? TERMINAL.darkText : TERMINAL.text,
                backgroundColor: speed === item.value ? TERMINAL.amber : TERMINAL.panelSoft,
                border: `1px solid ${speed === item.value ? TERMINAL.amber : TERMINAL.borderSoft}`,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
