import { Gauge, Newspaper, Pause, Play, RotateCcw, StepForward, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PARCHMENT, PIXEL_CARD } from '@/components/game/panels/panelUtils';
import { useMarketStore } from '@/stores/marketStore';
import { useSimulationStore } from '@/stores/simulation-store';
import type { SimulationStatus } from '@/types/market';

const SPEEDS = [0.5, 1, 2, 4, 8];

export default function SimulationControls({
  connected,
  status,
}: {
  connected: boolean;
  status: SimulationStatus | null;
}) {
  const sendCommand = useSimulationStore((s) => s.sendCommand);
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const running = status?.running ?? false;
  const speed = status?.speed ?? 1;

  return (
    <section className="p-2 flex items-center gap-2 flex-wrap" style={PIXEL_CARD}>
      <Button
        type="button"
        size="sm"
        disabled={!connected}
        className="h-8 gap-1.5 font-mono text-xs"
        onClick={() => sendCommand(running ? { command: 'pause', symbol: activeSymbol ?? undefined } : { command: 'start', symbol: activeSymbol ?? undefined })}
      >
        {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {running ? 'Pause' : 'Start'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={!connected || running}
        className="h-8 gap-1.5 font-mono text-xs"
        onClick={() => sendCommand({ command: 'step', symbol: activeSymbol ?? undefined })}
      >
        <StepForward className="h-3.5 w-3.5" />
        Step
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={!connected}
        className="h-8 gap-1.5 font-mono text-xs"
        onClick={() => sendCommand({ command: 'reset', symbol: activeSymbol ?? undefined })}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={!connected}
        className="h-8 gap-1.5 font-mono text-xs"
        onClick={() => sendCommand({ command: 'inject_news', newsImpact: 0.55, symbol: activeSymbol ?? undefined })}
        title="注入利好新闻"
      >
        <Newspaper className="h-3.5 w-3.5" />
        <TrendingUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={!connected}
        className="h-8 gap-1.5 font-mono text-xs"
        onClick={() => sendCommand({ command: 'inject_news', newsImpact: -0.55, symbol: activeSymbol ?? undefined })}
        title="注入利空新闻"
      >
        <Newspaper className="h-3.5 w-3.5" />
        <TrendingDown className="h-3.5 w-3.5" />
      </Button>

      <div className="flex items-center gap-1 ml-auto min-w-0">
        <Gauge className="h-3.5 w-3.5 shrink-0" style={{ color: PARCHMENT.textDim }} />
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            disabled={!connected}
            className="h-7 min-w-8 px-2 font-mono text-[11px] disabled:opacity-40"
            style={{
              color: speed === value ? '#F5ECD7' : PARCHMENT.text,
              backgroundColor: speed === value ? '#5C3D2E' : '#EEDCB0',
              borderRadius: '2px',
              boxShadow: speed === value
                ? 'inset 1px 1px 0 0 #2A1A10, inset -1px -1px 0 0 #7A5A42'
                : 'inset -1px -1px 0 0 #A08040, inset 1px 1px 0 0 #F5ECD7',
            }}
            onClick={() => sendCommand({ command: 'set_speed', speed: value, symbol: activeSymbol ?? undefined })}
          >
            {value}x
          </button>
        ))}
      </div>
    </section>
  );
}
