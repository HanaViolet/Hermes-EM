import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useMarketStore } from '@/stores/marketStore';
import { useSimulationStore } from '@/stores/simulation-store';
import type { SimulatedStockSummary } from '@/types/market';
import { aShareColor, TERMINAL } from './marketTerminal';

function nextSymbol(count: number): string {
  return `SIM${String(count + 1).padStart(3, '0')}`;
}

function StockChip({
  stock,
  active,
  onClick,
}: {
  stock: SimulatedStockSummary;
  active: boolean;
  onClick: () => void;
}) {
  const color = aShareColor(stock.change);

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`stock-chip-${stock.symbol}`}
      className="h-8 min-w-[118px] px-2 text-left font-mono"
      style={{
        color: TERMINAL.text,
        backgroundColor: active ? '#FFF2C8' : TERMINAL.panelSoft,
        border: `1px solid ${active ? TERMINAL.blue : TERMINAL.borderSoft}`,
        boxShadow: active ? `inset 0 -2px 0 ${TERMINAL.blue}` : 'inset 1px 1px 0 #FFF7DF',
      }}
      title={`${stock.symbol} ${stock.name}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold">{stock.symbol}</span>
        <span className="text-[10px] tabular-nums" style={{ color }}>
          {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
        </span>
      </div>
      <div className="truncate text-[9px]" style={{ color: TERMINAL.textDim }}>{stock.name}</div>
    </button>
  );
}

export default function StockSelector() {
  const connected = useSimulationStore((s) => s.connected);
  const sendCommand = useSimulationStore((s) => s.sendCommand);
  const marketState = useMarketStore((s) => s.marketState);
  const stockList = useMarketStore((s) => s.stockList);
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const selectStock = useMarketStore((s) => s.selectStock);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ symbol: '', name: '', initialPrice: '10.00' });

  const stock = marketState?.stock;
  const visibleStocks = stockList.length > 0 || !stock ? stockList : [{
    symbol: stock.symbol,
    name: stock.name,
    board: stock.board,
    currentPrice: stock.currentPrice,
    previousClose: stock.previousClose,
    change: stock.change,
    changePct: stock.changePct,
    volume: stock.volume,
    turnover: stock.turnover,
    tick: marketState.status.tick,
    virtualTime: marketState.status.virtualTime,
    running: marketState.status.running,
  }];

  function openAddForm() {
    const symbol = nextSymbol(visibleStocks.length);
    setDraft({ symbol, name: `虚拟股票${visibleStocks.length + 1}`, initialPrice: '10.00' });
    setAdding(true);
  }

  function handleSelect(symbol: string) {
    selectStock(symbol);
    sendCommand({ command: 'select_stock', symbol });
  }

  function submitStock() {
    const price = Number(draft.initialPrice);
    const initialPrice = Number.isFinite(price) ? price : 10;
    sendCommand({
      command: 'add_stock',
      stock: {
        symbol: draft.symbol,
        name: draft.name,
        initialPrice,
        previousClose: initialPrice,
        board: 'main_board',
        totalShares: 100_000_000,
      },
    });
    setAdding(false);
  }

  return (
    <div className="min-w-0 flex-1 font-mono">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] shrink-0" style={{ color: TERMINAL.textDim }}>股票池</span>
        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
          {visibleStocks.map((item) => (
            <StockChip
              key={item.symbol}
              stock={item}
              active={(activeSymbol ?? stock?.symbol) === item.symbol}
              onClick={() => handleSelect(item.symbol)}
            />
          ))}
          <button
            type="button"
            onClick={openAddForm}
            disabled={!connected}
            data-testid="add-stock-open"
            className="h-8 px-2 inline-flex items-center gap-1 text-[11px] disabled:opacity-40"
            style={{
              color: TERMINAL.darkText,
              backgroundColor: TERMINAL.amber,
              border: `1px solid ${TERMINAL.border}`,
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            新增股票
          </button>
        </div>
      </div>

      {adding && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-[90px_minmax(120px,1fr)_90px_auto_auto] gap-1.5">
          <input
            value={draft.symbol}
            onChange={(event) => setDraft((value) => ({ ...value, symbol: event.target.value.toUpperCase() }))}
            data-testid="add-stock-symbol"
            className="h-8 px-2 text-[11px] outline-none"
            style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panel, border: `1px solid ${TERMINAL.borderSoft}` }}
            placeholder="代码"
          />
          <input
            value={draft.name}
            onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))}
            data-testid="add-stock-name"
            className="h-8 px-2 text-[11px] outline-none"
            style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panel, border: `1px solid ${TERMINAL.borderSoft}` }}
            placeholder="名称"
          />
          <input
            value={draft.initialPrice}
            onChange={(event) => setDraft((value) => ({ ...value, initialPrice: event.target.value }))}
            data-testid="add-stock-price"
            className="h-8 px-2 text-[11px] outline-none"
            style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panel, border: `1px solid ${TERMINAL.borderSoft}` }}
            placeholder="初始价"
            inputMode="decimal"
          />
          <button
            type="button"
            onClick={submitStock}
            data-testid="add-stock-confirm"
            className="h-8 px-3 inline-flex items-center justify-center gap-1 text-[11px]"
            style={{ color: '#fff', backgroundColor: TERMINAL.blue, border: `1px solid ${TERMINAL.blue}` }}
          >
            <Check className="h-3.5 w-3.5" />
            确认
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="h-8 px-2 inline-flex items-center justify-center"
            style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}
            aria-label="取消新增股票"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
