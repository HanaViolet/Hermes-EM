import type { QuantObservation } from '../simulation/types.js';
import type { SimulationEngine } from '../simulation/SimulationEngine.js';

export class ObservationBuilder {
  build(engine: SimulationEngine): QuantObservation {
    return engine.observe();
  }
}
