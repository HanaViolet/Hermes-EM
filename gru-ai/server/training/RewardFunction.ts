import type { RewardMode } from '../simulation/types.js';

export class RewardFunction {
  constructor(private readonly mode: RewardMode = 'risk_adjusted') {}

  calculate(wealthChange: number, drawdownPenalty: number, volatilityPenalty: number, transactionCost: number): number {
    if (this.mode === 'profit_only') return wealthChange;
    if (this.mode === 'drawdown_penalty') return wealthChange - 0.25 * drawdownPenalty - transactionCost;
    if (this.mode === 'market_making') return wealthChange - 0.05 * volatilityPenalty - 0.5 * transactionCost;
    if (this.mode === 'sharpe_like') return wealthChange - 0.15 * volatilityPenalty - transactionCost;
    return wealthChange - 0.1 * drawdownPenalty - 0.05 * volatilityPenalty - transactionCost;
  }
}
