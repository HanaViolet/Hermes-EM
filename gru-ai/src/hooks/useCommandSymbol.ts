import { useMarketStore } from '@/stores/marketStore';

export function useCommandSymbol(): string | undefined {
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const marketState = useMarketStore((s) => s.marketState);
  return activeSymbol ?? marketState?.stock.symbol;
}
