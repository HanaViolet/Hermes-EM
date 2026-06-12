import type { QuantAction, QuantObservation } from '../simulation/types.js';

export interface QuantAgentAdapter {
  decide(observation: QuantObservation): QuantAction | Promise<QuantAction>;
}
