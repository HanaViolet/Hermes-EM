import type { MarketEvent, MarketState, Trade } from '../simulation/types.js';

export class SimulationStore {
  private snapshots: MarketState[] = [];
  private trades: Trade[] = [];
  private events: MarketEvent[] = [];

  saveSnapshot(snapshot: MarketState): void {
    this.snapshots = [...this.snapshots, snapshot].slice(-500);
    this.trades = Array.from(
      new Map([...snapshot.recentTrades, ...this.trades].map((trade) => [trade.id, trade])).values(),
    ).slice(0, 500);
    this.events = Array.from(
      new Map([...snapshot.events, ...this.events].map((event) => [event.id, event])).values(),
    ).slice(0, 500);
  }

  getLatestSnapshot(): MarketState | null {
    return this.snapshots.at(-1) ?? null;
  }

  clear(): void {
    this.snapshots = [];
    this.trades = [];
    this.events = [];
  }
}
