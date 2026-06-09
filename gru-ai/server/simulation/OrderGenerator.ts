import { randomUUID } from 'node:crypto';
import type { AgentDecision, AgentState, Order, TickContext } from './types.js';

export class OrderGenerator {
  generate(decision: AgentDecision, agent: AgentState, context: TickContext): Order | null {
    if (decision.action === 'hold' || decision.action === 'cancel') return null;
    if (!decision.side || !decision.limitPrice || !decision.targetQuantity) return null;

    const quantity = Math.max(0, Math.floor(decision.targetQuantity / 100) * 100);
    if (quantity <= 0) return null;

    return {
      id: randomUUID(),
      agentId: agent.id,
      agentType: agent.type,
      side: decision.side,
      price: Number(decision.limitPrice.toFixed(2)),
      quantity,
      remainingQuantity: quantity,
      createdAtTick: context.tick,
      createdAt: new Date().toISOString(),
      status: 'open',
    };
  }
}
