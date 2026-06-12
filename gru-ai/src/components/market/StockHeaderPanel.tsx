import { Activity, Clock } from 'lucide-react';
import type { MarketState } from '@/types/market';
import { aShareColor, formatLargeNumber, phaseLabel, TERMINAL, terminalPanel } from './marketTerminal';

function Field({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-mono uppercase" style={{ color: TERMINAL.textDim }}>{label}</div>
      <div className="text-[13px] font-mono tabular-nums leading-tight break-keep" style={{ color: color ?? TERMINAL.text }}>{value}</div>
    </div>
  );
}

export default function StockHeaderPanel({ marketState }: { marketState: MarketState | null }) {
  const stock = marketState?.stock;
  const status = marketState?.status;
  const scenario = marketState?.scenario;
  const change = stock?.change ?? 0;
  const color = aShareColor(change);

  return (
    <section className="p-4" style={terminalPanel}>
      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_280px] gap-4 items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" style={{ color: TERMINAL.blue }} />
            <span className="text-xl font-bold font-mono" style={{ color: TERMINAL.text }}>{stock?.symbol ?? 'SIM001'}</span>
            <span className="text-lg font-semibold" style={{ color: TERMINAL.text }}>{stock?.name ?? '模拟科技'}</span>
          </div>
          <div className="mt-1 text-xs font-mono" style={{ color: TERMINAL.textDim }}>A 股多虚拟股票 ABM 模拟市场 · 独立订单簿 · 非真实行情 · 非投资建议</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-x-5 gap-y-3">
          <Field label="当前价" value={stock ? stock.currentPrice.toFixed(2) : '--'} color={color} />
          <Field label="涨跌额" value={stock ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}` : '--'} color={color} />
          <Field label="涨跌幅" value={stock ? `${stock.changePct >= 0 ? '+' : ''}${stock.changePct.toFixed(2)}%` : '--'} color={color} />
          <Field label="开/高/低" value={stock ? `${stock.open.toFixed(2)} / ${stock.high.toFixed(2)} / ${stock.low.toFixed(2)}` : '--'} />
          <Field label="涨停/跌停" value={stock ? `${stock.upperLimit.toFixed(2)} / ${stock.lowerLimit.toFixed(2)}` : '--'} />
          <Field label="成交额" value={stock ? `${formatLargeNumber(stock.turnover)}元` : '--'} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="交易阶段" value={status ? phaseLabel(status.phase) : '--'} color={TERMINAL.amber} />
          <Field label="成交量" value={stock ? `${formatLargeNumber(stock.volume)}股` : '--'} />
          <Field label="仿真时间" value={status?.virtualTime ?? '--'} />
          <Field label="当前场景" value={scenario?.name ?? '普通交易日'} color={TERMINAL.purple} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] font-mono" style={{ color: TERMINAL.textDim }}>
        <Clock className="h-3.5 w-3.5" />
        <span>前收 {stock?.previousClose.toFixed(2) ?? '--'} · 换手 {(marketState?.metrics.turnoverRate ? marketState.metrics.turnoverRate * 100 : 0).toFixed(3)}%</span>
      </div>
    </section>
  );
}
