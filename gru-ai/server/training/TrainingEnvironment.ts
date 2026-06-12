import type { QuantAction, QuantObservation, TrainingStepResult } from '../simulation/types.js';
import type { SimulationEngine } from '../simulation/SimulationEngine.js';
import { ActionExecutor } from './ActionExecutor.js';
import { ObservationBuilder } from './ObservationBuilder.js';

export class TrainingEnvironment {
  private readonly observations = new ObservationBuilder();
  private readonly actions = new ActionExecutor();

  constructor(private readonly engine: SimulationEngine) {}

  reset(scenarioId: string): QuantObservation {
    this.engine.handleCommand({ command: 'training_reset', scenarioId });
    return this.observe();
  }

  step(action: QuantAction): TrainingStepResult {
    const before = this.engine.getTrainingUpdate();
    this.actions.execute(this.engine, action);
    const after = this.engine.getTrainingUpdate();
    return {
      observation: after.observation,
      reward: Number((after.cumulativeReward - before.cumulativeReward).toFixed(2)),
      done: after.done,
    };
  }

  observe(): QuantObservation {
    return this.observations.build(this.engine);
  }

  getReward(): number {
    return this.engine.getTrainingUpdate().reward;
  }

  isDone(): boolean {
    return this.engine.getTrainingUpdate().done;
  }
}
