import { EventEmitter } from 'node:events';
import { SimulationEngine } from './SimulationEngine.js';
import { ScenarioLoader } from './scenarios/ScenarioLoader.js';
import type { ManualNewsRequest, NewsEngineConfig, NewsEventTemplate } from '../news/types.js';
import type {
  MarketScenario,
  MarketState,
  NewStockConfig,
  SimulatedStockSummary,
  SimulationCommand,
  SimulationStatus,
} from './types.js';

function cloneScenario(scenario: MarketScenario): MarketScenario {
  return JSON.parse(JSON.stringify(scenario)) as MarketScenario;
}

function normalizeSymbol(symbol: string | undefined, fallback: string): string {
  const cleaned = (symbol ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return cleaned || fallback;
}

function nextSymbol(index: number): string {
  return `SIM${String(index).padStart(3, '0')}`;
}

function numberOr(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function stockSummary(state: MarketState): SimulatedStockSummary {
  return {
    symbol: state.stock.symbol,
    name: state.stock.name,
    board: state.stock.board,
    currentPrice: state.stock.currentPrice,
    previousClose: state.stock.previousClose,
    change: state.stock.change,
    changePct: state.stock.changePct,
    volume: state.stock.volume,
    turnover: state.stock.turnover,
    tick: state.status.tick,
    virtualTime: state.status.virtualTime,
    running: state.status.running,
  };
}

export class SimulationManager extends EventEmitter {
  private readonly scenarioLoader = new ScenarioLoader();
  private readonly engines = new Map<string, SimulationEngine>();
  private activeSymbol = '';

  constructor() {
    super();
    this.addStock({
      symbol: 'SIM001',
      name: '模拟科技',
      initialPrice: 10,
      previousClose: 10,
      totalShares: 100_000_000,
    });
  }

  getActiveSymbol(): string {
    return this.activeSymbol;
  }

  getState(): MarketState {
    return this.getActiveEngine().getState();
  }

  getStatus(): SimulationStatus {
    return this.getActiveEngine().getStatus();
  }

  getScenarioUpdate() {
    return this.getActiveEngine().getScenarioUpdate();
  }

  getTrainingUpdate() {
    return this.getActiveEngine().getTrainingUpdate();
  }

  getNewsUpdate(symbol = this.activeSymbol) {
    return this.engines.get(symbol)?.getNewsUpdate() ?? this.getActiveEngine().getNewsUpdate();
  }

  getNewsRecord(newsId: string, symbol = this.activeSymbol) {
    return this.engines.get(symbol)?.getNewsRecord(newsId);
  }

  getActiveNewsForAgent(agentId: string, symbol = this.activeSymbol) {
    return this.engines.get(symbol)?.getActiveNewsForAgent(agentId) ?? [];
  }

  listNewsTemplates(symbol = this.activeSymbol) {
    return this.engines.get(symbol)?.listNewsTemplates() ?? [];
  }

  addNewsTemplate(templateConfig: NewsEventTemplate, symbol = this.activeSymbol): void {
    this.engines.get(symbol)?.addNewsTemplate(templateConfig);
  }

  updateNewsConfig(partial: Partial<NewsEngineConfig>, symbol = this.activeSymbol) {
    return this.engines.get(symbol)?.updateNewsConfig(partial);
  }

  clearNews(symbol = this.activeSymbol): void {
    this.engines.get(symbol)?.clearNews();
  }

  generateSyntheticNews(request?: ManualNewsRequest, symbol = this.activeSymbol) {
    return this.engines.get(symbol)?.generateSyntheticNews(request);
  }

  getStockList(): { activeSymbol: string; stocks: SimulatedStockSummary[] } {
    return {
      activeSymbol: this.activeSymbol,
      stocks: Array.from(this.engines.values()).map((engine) => stockSummary(engine.getState())),
    };
  }

  addStock(config: NewStockConfig = {}): MarketState {
    const fallbackSymbol = nextSymbol(this.engines.size + 1);
    let symbol = normalizeSymbol(config.symbol, fallbackSymbol);
    if (this.engines.has(symbol)) {
      symbol = fallbackSymbol;
      let suffix = this.engines.size + 1;
      while (this.engines.has(symbol)) {
        suffix += 1;
        symbol = nextSymbol(suffix);
      }
    }

    const base = cloneScenario(this.scenarioLoader.getDefault());
    const initialPrice = numberOr(config.initialPrice, 10 + this.engines.size * 2, 1, 9999);
    const previousClose = numberOr(config.previousClose, initialPrice, 1, 9999);
    base.stock = {
      symbol,
      name: (config.name ?? '').trim() || `虚拟股票${this.engines.size + 1}`,
      previousClose,
      initialPrice,
      board: config.board ?? 'main_board',
      totalShares: Math.round(numberOr(config.totalShares, 100_000_000, 1_000_000, 10_000_000_000)),
    };

    const engine = new SimulationEngine(base);
    this.wireEngine(symbol, engine);
    this.engines.set(symbol, engine);
    this.activeSymbol = symbol;
    this.emitActiveSnapshot();
    return engine.getState();
  }

  selectStock(symbol: string | undefined): boolean {
    if (!symbol || !this.engines.has(symbol)) return false;
    this.activeSymbol = symbol;
    this.emitActiveSnapshot();
    return true;
  }

  handleCommand(command: SimulationCommand): void {
    if (command.command === 'add_stock') {
      this.addStock(command.stock);
      return;
    }

    if (command.command === 'select_stock') {
      this.selectStock(command.symbol);
      return;
    }

    const symbol = command.symbol && this.engines.has(command.symbol) ? command.symbol : this.activeSymbol;
    const engine = this.engines.get(symbol);
    if (!engine) return;

    if ((command.command === 'set_scenario' || command.command === 'training_reset') && command.scenarioId) {
      const activeStock = engine.getState().stock;
      const scenario = cloneScenario(this.scenarioLoader.get(command.scenarioId));
      scenario.stock = {
        symbol: activeStock.symbol,
        name: activeStock.name,
        previousClose: activeStock.previousClose,
        initialPrice: activeStock.open || activeStock.previousClose,
        board: activeStock.board,
        totalShares: activeStock.totalShares,
      };
      engine.reset(scenario);
      return;
    }

    engine.handleCommand(command);
  }

  destroy(): void {
    for (const engine of this.engines.values()) {
      engine.destroy();
    }
    this.removeAllListeners();
  }

  private getActiveEngine(): SimulationEngine {
    const engine = this.engines.get(this.activeSymbol);
    if (!engine) throw new Error('No active simulation stock');
    return engine;
  }

  private wireEngine(symbol: string, engine: SimulationEngine): void {
    engine.on('state', (payload: MarketState) => {
      this.emit('stock_list', this.getStockList());
      if (symbol === this.activeSymbol) {
        this.emit('state', payload);
      }
    });

    engine.on('status', (payload: SimulationStatus) => {
      this.emit('stock_list', this.getStockList());
      if (symbol === this.activeSymbol) {
        this.emit('status', payload);
      }
    });

    engine.on('scenario', (payload) => {
      if (symbol === this.activeSymbol) {
        this.emit('scenario', payload);
      }
    });

    engine.on('training', (payload) => {
      if (symbol === this.activeSymbol) {
        this.emit('training', payload);
      }
    });

    engine.on('news', (payload) => {
      if (symbol === this.activeSymbol) {
        this.emit('news', payload);
      }
    });
  }

  private emitActiveSnapshot(): void {
    this.emit('stock_list', this.getStockList());
    this.emit('state', this.getState());
    this.emit('status', this.getStatus());
    this.emit('scenario', this.getScenarioUpdate());
    this.emit('training', this.getTrainingUpdate());
    this.emit('news', this.getNewsUpdate());
  }
}
