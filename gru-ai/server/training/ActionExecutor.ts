import type { QuantAction } from '../simulation/types.js';
import type { SimulationEngine } from '../simulation/SimulationEngine.js';

export class ActionExecutor {
  execute(engine: SimulationEngine, action: QuantAction): void {
    engine.handleCommand({ command: 'external_action', action });
  }
}
