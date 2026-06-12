import { CandlestickChart, MoveHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MarketState } from '@/types/market';
import { aShareColor, formatLargeNumber, TERMINAL, terminalPanel } from './marketTerminal';

type PricePoint = MarketState['priceSeries'][number];
type VolumePoint = MarketState['volumeSeries'][number];

interface Candle {
  bucket: number;
  tick: number;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TICKS_PER_CANDLE = 8;
const MAX_HISTORY_CANDLES = 360;
const MIN_VISIBLE_CANDLES = 68;
const SVG_HEIGHT = 332;
const CHART_LEFT = 56;
const AXIS_WIDTH = 72;
const CANDLE_SLOT = 18;
const PRICE_TOP = 30;
const PRICE_BOTTOM = 216;
const VOLUME_TOP = 244;
const VOLUME_BOTTOM = 302;
const TIME_Y = 324;

function buildCandles(priceSeries: PricePoint[], volumeSeries: VolumePoint[]): Candle[] {
  if (priceSeries.length === 0) return [];

  const volumeByTick = new Map(volumeSeries.map((point) => [point.tick, point.volume]));
  const buckets = new Map<number, Candle>();

  for (const point of priceSeries) {
    const bucket = Math.floor(point.tick / TICKS_PER_CANDLE);
    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, {
        bucket,
        tick: point.tick,
        time: point.time,
        open: point.price,
        high: point.price,
        low: point.price,
        close: point.price,
        volume: volumeByTick.get(point.tick) ?? 0,
      });
      continue;
    }

    existing.tick = point.tick;
    existing.time = point.time;
    existing.high = Math.max(existing.high, point.price);
    existing.low = Math.min(existing.low, point.price);
    existing.close = point.price;
    existing.volume += volumeByTick.get(point.tick) ?? 0;
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.bucket - b.bucket)
    .slice(-MAX_HISTORY_CANDLES);
}

function movingAveragePath(
  candles: Candle[],
  period: number,
  priceToY: (price: number) => number,
  xForIndex: (index: number) => number,
): string {
  const points = candles
    .map((_, index) => {
      if (index + 1 < period) return null;
      const window = candles.slice(index + 1 - period, index + 1);
      const average = window.reduce((sum, candle) => sum + candle.close, 0) / period;
      return { index, average };
    })
    .filter((point): point is { index: number; average: number } => point !== null);

  if (points.length === 0) return '';
  return points
    .map((point, pathIndex) => {
      const x = xForIndex(point.index);
      const y = priceToY(point.average);
      return `${pathIndex === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function closePricePath(
  candles: Candle[],
  priceToY: (price: number) => number,
  xForIndex: (index: number) => number,
): string {
  if (candles.length === 0) return '';
  return candles
    .map((candle, index) => {
      const x = xForIndex(index);
      const y = priceToY(candle.close);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function priceLabel(value: number): string {
  return value.toFixed(2);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-mono" style={{ color: TERMINAL.textDim }}>{label}</div>
      <div className="text-xs font-semibold font-mono tabular-nums truncate" style={{ color: tone ?? TERMINAL.text }}>{value}</div>
    </div>
  );
}

export default function PriceChartPanel({ marketState }: { marketState: MarketState | null }) {
  const [followLatest, setFollowLatest] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const priceSeries = marketState?.priceSeries ?? [];
  const volumeSeries = marketState?.volumeSeries ?? [];
  const candles = useMemo(() => buildCandles(priceSeries, volumeSeries), [priceSeries, volumeSeries]);
  const current = marketState?.stock.currentPrice ?? 0;
  const previousClose = marketState?.stock.previousClose ?? current;
  const change = marketState?.stock.change ?? 0;
  const currentColor = aShareColor(change);
  const chartSlots = Math.max(MIN_VISIBLE_CANDLES, candles.length || 1);
  const plotWidth = chartSlots * CANDLE_SLOT;
  const chartRight = CHART_LEFT + plotWidth;
  const chartWidth = chartRight + AXIS_WIDTH;
  const dataOffset = Math.max(0, chartSlots - candles.length);
  const xForIndex = (index: number) => CHART_LEFT + (dataOffset + index) * CANDLE_SLOT + CANDLE_SLOT / 2;
  const candleWidth = 11;

  const visibleHigh = Math.max(current || previousClose, ...candles.map((candle) => candle.high));
  const visibleLow = Math.min(current || previousClose, ...candles.map((candle) => candle.low));
  const visibleMid = (visibleHigh + visibleLow) / 2;
  const minimumRange = Math.max(0.08, (current || previousClose || 10) * 0.008);
  const visibleRange = Math.max(visibleHigh - visibleLow, minimumRange);
  const maxPrice = visibleMid + visibleRange * 0.6;
  const minPrice = visibleMid - visibleRange * 0.6;
  const priceRange = Math.max(0.01, maxPrice - minPrice);
  const maxVolume = Math.max(1, ...candles.map((candle) => candle.volume));
  const priceToY = (price: number) => PRICE_TOP + ((maxPrice - price) / priceRange) * (PRICE_BOTTOM - PRICE_TOP);
  const volumeToHeight = (volume: number) => {
    if (volume <= 0) return 0;
    return Math.max(5, (volume / maxVolume) * (VOLUME_BOTTOM - VOLUME_TOP));
  };
  const previousCloseVisible = previousClose >= minPrice && previousClose <= maxPrice;
  const prevCloseY = priceToY(Math.max(minPrice, Math.min(maxPrice, previousClose)));
  const currentPriceVisible = current >= minPrice && current <= maxPrice;
  const currentY = priceToY(Math.max(minPrice, Math.min(maxPrice, current || previousClose)));
  const ma5 = movingAveragePath(candles, 5, priceToY, xForIndex);
  const ma10 = movingAveragePath(candles, 10, priceToY, xForIndex);
  const closePath = closePricePath(candles, priceToY, xForIndex);
  const firstTime = candles[0]?.time ?? '--';
  const midTime = candles[Math.floor(candles.length / 2)]?.time ?? '--';
  const lastTime = candles[candles.length - 1]?.time ?? '--';
  const latest = candles[candles.length - 1];
  const latestUp = latest ? latest.close >= latest.open : change >= 0;
  const priceTicks = Array.from({ length: 5 }, (_, index) => maxPrice - (priceRange / 4) * index);
  const gridIndexes = Array.from({ length: Math.floor(chartSlots / 8) + 1 }, (_, index) => index * 8).filter((index) => index <= chartSlots);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !followLatest) return;
    node.scrollLeft = node.scrollWidth;
  }, [chartWidth, candles.length, followLatest]);

  function handleScroll() {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromRight = node.scrollWidth - node.clientWidth - node.scrollLeft;
    setFollowLatest(distanceFromRight < 12);
  }

  function scrollToLatest() {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollLeft = node.scrollWidth;
    setFollowLatest(true);
  }

  return (
    <section className="p-3 min-h-0 flex flex-col" style={terminalPanel}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold font-mono flex items-center gap-2" style={{ color: TERMINAL.text }}>
            <CandlestickChart className="h-4 w-4" />
            价格 / 成交量
          </h2>
          <p className="mt-1 text-[11px] font-mono leading-relaxed" style={{ color: TERMINAL.textDim }}>
            A股K线 · 每 {TICKS_PER_CANDLE} tick 成一根 · 最新数据靠右，横向滚动回看历史
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 lg:w-[560px]">
          <Stat label="最新价" value={current ? current.toFixed(2) : '--'} tone={currentColor} />
          <Stat label="涨跌幅" value={marketState ? `${change >= 0 ? '+' : ''}${marketState.stock.changePct.toFixed(2)}%` : '--'} tone={currentColor} />
          <Stat label="开盘" value={marketState ? marketState.stock.open.toFixed(2) : '--'} />
          <Stat label="最高 / 最低" value={marketState ? `${marketState.stock.high.toFixed(2)} / ${marketState.stock.low.toFixed(2)}` : '--'} />
          <Stat label="成交量" value={marketState ? formatLargeNumber(marketState.stock.volume) : '--'} />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px]" style={{ color: TERMINAL.textDim }}>
        <span className="inline-flex items-center gap-1">
          <MoveHorizontal className="h-3 w-3" />
          当前保留 {candles.length} 根K线，拖动或横向滚动查看更早数据
        </span>
        <button
          type="button"
          onClick={scrollToLatest}
          className="h-7 px-2 text-[10px] font-mono"
          style={{
            color: followLatest ? '#ffffff' : TERMINAL.text,
            backgroundColor: followLatest ? TERMINAL.blue : TERMINAL.panelSoft,
            border: `1px solid ${followLatest ? TERMINAL.blue : TERMINAL.borderSoft}`,
          }}
        >
          {followLatest ? '跟随最新' : '回到最新'}
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="market-chart-scroll mt-2 h-[336px] overflow-x-auto overflow-y-hidden"
        style={{
          backgroundColor: '#F5ECD7',
          border: `1px solid ${TERMINAL.borderSoft}`,
          boxShadow: 'inset 0 0 0 2px rgba(255, 247, 223, 0.72)',
          scrollbarColor: `${TERMINAL.border} ${TERMINAL.panelSoft}`,
          scrollbarWidth: 'thin',
        }}
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${SVG_HEIGHT}`}
          className="h-full block"
          style={{ width: `${chartWidth}px`, minWidth: '100%' }}
          role="img"
          aria-label={`${marketState?.stock.name ?? '虚拟股票'}A股K线成交量图`}
        >
          <rect x="0" y="0" width={chartWidth} height={SVG_HEIGHT} fill="#F5ECD7" />
          <rect x={CHART_LEFT} y={PRICE_TOP} width={plotWidth} height={PRICE_BOTTOM - PRICE_TOP} fill="#FFF8E4" opacity="0.78" />
          <rect x={CHART_LEFT} y={VOLUME_TOP} width={plotWidth} height={VOLUME_BOTTOM - VOLUME_TOP} fill="#FFF8E4" opacity="0.58" />

          {priceTicks.map((price) => {
            const y = priceToY(price);
            return <line key={price} x1={CHART_LEFT} x2={chartRight} y1={y} y2={y} stroke={TERMINAL.borderSoft} strokeWidth="1" opacity="0.64" />;
          })}
          {[VOLUME_TOP, VOLUME_BOTTOM].map((y) => (
            <line key={y} x1={CHART_LEFT} x2={chartRight} y1={y} y2={y} stroke={TERMINAL.borderSoft} strokeWidth="1" opacity="0.58" />
          ))}
          {gridIndexes.map((index) => {
            const x = CHART_LEFT + index * CANDLE_SLOT;
            return (
              <line key={`grid-${index}`} x1={x} x2={x} y1={PRICE_TOP} y2={VOLUME_BOTTOM} stroke={TERMINAL.borderSoft} strokeWidth="1" opacity="0.26" />
            );
          })}
          <line x1={CHART_LEFT} x2={CHART_LEFT} y1={PRICE_TOP} y2={VOLUME_BOTTOM} stroke={TERMINAL.borderSoft} strokeWidth="1.2" opacity="0.7" />
          <line x1={chartRight} x2={chartRight} y1={PRICE_TOP} y2={VOLUME_BOTTOM} stroke={TERMINAL.borderSoft} strokeWidth="1.2" opacity="0.7" />

          {previousCloseVisible ? (
            <line x1={CHART_LEFT} x2={chartRight} y1={prevCloseY} y2={prevCloseY} stroke={TERMINAL.neutral} strokeWidth="1.4" strokeDasharray="7 5" opacity="0.72" />
          ) : (
            <text x={CHART_LEFT} y={previousClose > maxPrice ? PRICE_TOP - 9 : PRICE_BOTTOM + 15} fontSize="11" fill={TERMINAL.neutral} fontFamily="monospace">
              昨收 {previousClose.toFixed(2)} {previousClose > maxPrice ? '↑' : '↓'}
            </text>
          )}

          {currentPriceVisible && current > 0 && (
            <g>
              <line x1={CHART_LEFT} x2={chartRight} y1={currentY} y2={currentY} stroke={currentColor} strokeWidth="1.2" strokeDasharray="5 5" opacity="0.5" />
              <rect x={chartRight + 7} y={currentY - 11} width="56" height="21" fill={currentColor} opacity="0.96" />
              <text x={chartRight + 35} y={currentY + 4} textAnchor="middle" fontSize="12" fill="#FFF7DF" fontFamily="monospace" fontWeight="700">
                {current.toFixed(2)}
              </text>
            </g>
          )}

          {candles.map((candle, index) => {
            const x = xForIndex(index);
            const up = candle.close >= candle.open;
            const color = up ? TERMINAL.red : TERMINAL.green;
            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);
            const highY = priceToY(candle.high);
            const lowY = priceToY(candle.low);
            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(7, Math.abs(openY - closeY));
            const volumeHeight = volumeToHeight(candle.volume);

            return (
              <g key={`${candle.bucket}-${candle.tick}`}>
                <rect
                  x={x - candleWidth / 2}
                  y={VOLUME_BOTTOM - Math.max(1, volumeHeight)}
                  width={candleWidth}
                  height={Math.max(1, volumeHeight)}
                  fill={color}
                  opacity={volumeHeight > 0 ? 0.52 : 0.12}
                />
                <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth="1.8" strokeLinecap="square" />
                <rect
                  x={x - candleWidth / 2}
                  y={bodyY}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={up ? '#F9D5CA' : color}
                  stroke={color}
                  strokeWidth="1.6"
                />
              </g>
            );
          })}

          {closePath && <path d={closePath} fill="none" stroke={TERMINAL.textDim} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />}
          {ma5 && <path d={ma5} fill="none" stroke={TERMINAL.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />}
          {ma10 && <path d={ma10} fill="none" stroke={TERMINAL.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />}

          {priceTicks.map((price) => (
            <text key={`label-${price}`} x={chartRight + 8} y={priceToY(price) + 4} fontSize="11" fill={TERMINAL.textDim} fontFamily="monospace">
              {priceLabel(price)}
            </text>
          ))}
          {previousCloseVisible && (
            <text x={CHART_LEFT + 6} y={prevCloseY - 6} fontSize="11" fill={TERMINAL.neutral} fontFamily="monospace">
              昨收 {previousClose.toFixed(2)}
            </text>
          )}

          <text x={CHART_LEFT} y={TIME_Y} fontSize="11" fill={TERMINAL.textDim} fontFamily="monospace">{firstTime}</text>
          <text x={(CHART_LEFT + chartRight) / 2} y={TIME_Y} textAnchor="middle" fontSize="11" fill={TERMINAL.textDim} fontFamily="monospace">{midTime}</text>
          <text x={chartRight} y={TIME_Y} textAnchor="end" fontSize="11" fill={TERMINAL.textDim} fontFamily="monospace">{lastTime}</text>
          <text x={CHART_LEFT} y="18" fontSize="11" fill={TERMINAL.amber} fontFamily="monospace" fontWeight="700">MA5</text>
          <text x={CHART_LEFT + 42} y="18" fontSize="11" fill={TERMINAL.blue} fontFamily="monospace" fontWeight="700">MA10</text>
          <text x={chartRight} y="18" textAnchor="end" fontSize="11" fill={latestUp ? TERMINAL.red : TERMINAL.green} fontFamily="monospace" fontWeight="700">
            {latest ? `${latest.open.toFixed(2)} / ${latest.high.toFixed(2)} / ${latest.low.toFixed(2)} / ${latest.close.toFixed(2)}` : '--'}
          </text>
          <text x={CHART_LEFT} y={VOLUME_TOP - 9} fontSize="11" fill={TERMINAL.textDim} fontFamily="monospace">
            VOL {latest ? formatLargeNumber(latest.volume) : '--'}
          </text>

          {candles.length < 2 && (
            <text x={(CHART_LEFT + chartRight) / 2} y="150" textAnchor="middle" fontSize="14" fill={TERMINAL.textDim} fontFamily="monospace">
              等待K线形成
            </text>
          )}
        </svg>
      </div>
    </section>
  );
}
