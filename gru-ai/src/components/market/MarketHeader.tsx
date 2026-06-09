import { Activity, Wifi, WifiOff } from 'lucide-react';
import type { SimulationStatus, StockState } from '@/types/market';

const HEADER = {
  bg: '#5C3D2E',
  bgLight: '#6B4C3B',
  text: '#F5ECD7',
  textDim: '#C4A265',
  border: '#3D2B1F',
  buttonBg: '#4A2F20',
} as const;

function phaseLabel(phase: SimulationStatus['phase']): string {
  switch (phase) {
    case 'call_auction':
      return '集合竞价';
    case 'continuous':
      return '连续竞价';
    case 'midday_break':
      return '午间休市';
    case 'closed':
      return '已收盘';
    default:
      return '盘前';
  }
}

export default function MarketHeader({
  connected,
  status,
  stock,
}: {
  connected: boolean;
  status: SimulationStatus | null;
  stock: StockState | null;
}) {
  const up = (stock?.change ?? 0) >= 0;

  return (
    <header
      className="px-3 sm:px-4 py-2 flex items-center justify-between gap-3 select-none"
      style={{
        backgroundColor: HEADER.bg,
        color: HEADER.text,
        imageRendering: 'pixelated',
        borderBottom: `2px solid ${HEADER.border}`,
        boxShadow: `inset 0 1px 0 0 ${HEADER.bgLight}`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="font-mono font-bold text-sm sm:text-base shrink-0" style={{ color: HEADER.textDim }}>
          ABM科技
        </div>
        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px]" style={{ color: HEADER.text }}>
          <span>{stock?.symbol ?? 'ABM'}</span>
          <span style={{ color: HEADER.textDim }}>虚拟仿真 · 非投资建议</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 font-mono">
        <div
          className="flex items-center gap-1.5 px-2 py-1"
          style={{
            backgroundColor: HEADER.buttonBg,
            borderRadius: '2px',
            boxShadow: 'inset -1px -1px 0 0 #2A1A10, inset 1px 1px 0 0 #7A5A42',
          }}
        >
          <Activity className="h-3.5 w-3.5" style={{ color: HEADER.textDim }} />
          <span className="text-sm font-bold tabular-nums">
            {stock ? stock.currentPrice.toFixed(2) : '--'}
          </span>
          <span
            className="text-[11px] tabular-nums"
            style={{ color: up ? '#FF6B5A' : '#3AD17A' }}
          >
            {stock ? `${up ? '+' : ''}${stock.changePct.toFixed(2)}%` : '--'}
          </span>
        </div>

        <div className="hidden md:flex px-2 py-1 text-[11px]" style={{ color: HEADER.textDim }}>
          {status ? `${phaseLabel(status.phase)} ${status.virtualTime}` : '等待连接'}
        </div>

        <div className="flex items-center gap-1 text-[11px]" style={{ color: connected ? '#86EFAC' : '#FCA5A5' }}>
          {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{connected ? 'Online' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
