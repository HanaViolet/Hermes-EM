import { Bot, CircleDot, HandCoins, Users } from 'lucide-react';
import type { AgentUpdateMessage, StockState } from '@/types/market';
import { formatLargeNumber, TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-3 font-mono" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
      <div className="text-[10px]" style={{ color: TERMINAL.textDim }}>{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums" style={{ color: color ?? TERMINAL.text }}>{value}</div>
    </div>
  );
}

export default function AgentOverviewPanel({
  overview,
  tick,
  simulationTime,
  stock,
}: {
  overview?: AgentUpdateMessage['overview'];
  tick?: number;
  simulationTime?: string;
  stock?: StockState | null;
}) {
  const sentiment = overview?.averageSentiment ?? 0;

  return (
    <section className="p-4 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between gap-3 font-mono">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: TERMINAL.text }}>
            <Bot className="h-5 w-5" />
            Agent 状态
          </h1>
          <p className="mt-1 text-xs" style={{ color: TERMINAL.textDim }}>
            {stock ? `${stock.symbol} ${stock.name}` : '等待股票快照'} · 多类资金行为、情绪、收益和训练观测
          </p>
        </div>
        <div className="text-right text-xs" style={{ color: TERMINAL.textDim }}>
          <div>T{tick ?? 0}</div>
          <div>{simulationTime ?? '--'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        <Stat label="总 Agent" value={String(overview?.totalAgents ?? 0)} color={TERMINAL.blue} />
        <Stat label="活跃实体" value={String(overview?.activeAgents ?? 0)} />
        <Stat label="买入中" value={String(overview?.buyingAgents ?? 0)} color={TERMINAL.red} />
        <Stat label="卖出中" value={String(overview?.sellingAgents ?? 0)} color={TERMINAL.green} />
        <Stat label="观望中" value={String(overview?.holdingAgents ?? 0)} color={TERMINAL.neutral} />
        <Stat label="平均收益" value={`${((overview?.averageReturn ?? 0) * 100).toFixed(2)}%`} color={(overview?.averageReturn ?? 0) >= 0 ? TERMINAL.red : TERMINAL.green} />
        <Stat label="平均情绪" value={`${Math.round((sentiment + 1) * 50)}%`} color={sentiment >= 0 ? TERMINAL.red : TERMINAL.green} />
        <Stat label="羊群指数" value={`${Math.round((overview?.herdingIndex ?? 0) * 100)}%`} color={TERMINAL.amber} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="p-2 flex items-center gap-2 font-mono" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
          <Users className="h-4 w-4" style={{ color: TERMINAL.blue }} />
          <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>总市值</span>
          <span className="ml-auto text-xs tabular-nums" style={{ color: TERMINAL.text }}>{formatLargeNumber(overview?.totalMarketValue ?? 0)}</span>
        </div>
        <div className="p-2 flex items-center gap-2 font-mono" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
          <HandCoins className="h-4 w-4" style={{ color: TERMINAL.amber }} />
          <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>总现金</span>
          <span className="ml-auto text-xs tabular-nums" style={{ color: TERMINAL.text }}>{formatLargeNumber(overview?.totalCash ?? 0)}</span>
        </div>
        <div className="p-2 flex items-center gap-2 font-mono" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
          <CircleDot className="h-4 w-4" style={{ color: TERMINAL.purple }} />
          <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>当前行为</span>
          <span className="ml-auto text-xs tabular-nums" style={{ color: TERMINAL.text }}>
            B{overview?.buyingAgents ?? 0} / S{overview?.sellingAgents ?? 0} / H{overview?.holdingAgents ?? 0}
          </span>
        </div>
      </div>
    </section>
  );
}
