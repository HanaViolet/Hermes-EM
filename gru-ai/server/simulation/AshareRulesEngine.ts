import type { AgentState, Order, OrderBookSnapshot, RuleValidationResult, StockState, Trade } from './types.js';

function roundToTick(price: number): number {
  return Number((Math.round(price * 100) / 100).toFixed(2));
}

export class AshareRulesEngine {
  normalizeOrder(order: Order): Order {
    return {
      ...order,
      price: roundToTick(order.price),
      quantity: Math.floor(order.quantity / 100) * 100,
      remainingQuantity: Math.floor(order.remainingQuantity / 100) * 100,
    };
  }

  validateOrder(order: Order, agent: AgentState, stock: StockState): RuleValidationResult {
    const normalized = this.normalizeOrder(order);

    if (normalized.quantity < stock.lotSize || normalized.remainingQuantity < stock.lotSize) {
      return { ok: false, reason: '订单数量必须至少一手（100股）' };
    }

    if (normalized.price < stock.lowerLimit || normalized.price > stock.upperLimit) {
      return { ok: false, reason: '委托价格超出涨跌停范围' };
    }

    if (normalized.side === 'buy') {
      const requiredCash = normalized.price * normalized.quantity;
      if (agent.cash < requiredCash) {
        return { ok: false, reason: '可用现金不足' };
      }
    }

    if (normalized.side === 'sell' && agent.availablePosition < normalized.quantity) {
      return { ok: false, reason: '可卖持仓不足或受 T+1 限制' };
    }

    return { ok: true, order: normalized };
  }

  applyTradesToAgents(trades: Trade[], agents: Map<string, AgentState>): void {
    for (const trade of trades) {
      const buyer = agents.get(trade.buyerAgentId);
      const seller = agents.get(trade.sellerAgentId);

      if (buyer) {
        const previousValue = buyer.avgCost * buyer.position;
        buyer.cash = Number((buyer.cash - trade.amount).toFixed(2));
        buyer.position += trade.quantity;
        buyer.todayBought += trade.quantity;
        buyer.avgCost = buyer.position > 0
          ? Number(((previousValue + trade.amount) / buyer.position).toFixed(2))
          : 0;
        buyer.capitalFlow = Number((buyer.capitalFlow + trade.amount).toFixed(2));
        buyer.status = 'filled';
        buyer.lastAction = 'buy';
        buyer.openOrderIds = buyer.openOrderIds.filter((id) => id !== trade.buyOrderId);
      }

      if (seller) {
        seller.cash = Number((seller.cash + trade.amount).toFixed(2));
        seller.position -= trade.quantity;
        seller.avgCost = seller.position > 0 ? seller.avgCost : 0;
        seller.capitalFlow = Number((seller.capitalFlow - trade.amount).toFixed(2));
        seller.status = 'filled';
        seller.lastAction = 'sell';
        seller.openOrderIds = seller.openOrderIds.filter((id) => id !== trade.sellOrderId);
      }
    }
  }

  resetDailyAvailability(agents: Map<string, AgentState>): void {
    for (const agent of agents.values()) {
      agent.availablePosition = agent.position;
      agent.todayBought = 0;
    }
  }

  calculateAuctionPrice(orderBook: OrderBookSnapshot, referencePrice: number): number | null {
    const candidates = Array.from(new Set([
      ...orderBook.bids.map((level) => level.price),
      ...orderBook.asks.map((level) => level.price),
      referencePrice,
    ])).sort((a, b) => a - b);

    let best: { price: number; volume: number; distance: number } | null = null;
    for (const price of candidates) {
      const buyVolume = orderBook.bids
        .filter((level) => level.price >= price)
        .reduce((sum, level) => sum + level.quantity, 0);
      const sellVolume = orderBook.asks
        .filter((level) => level.price <= price)
        .reduce((sum, level) => sum + level.quantity, 0);
      const volume = Math.min(buyVolume, sellVolume);
      if (volume <= 0) continue;
      const distance = Math.abs(price - referencePrice);
      if (!best || volume > best.volume || (volume === best.volume && distance < best.distance)) {
        best = { price, volume, distance };
      }
    }

    return best ? roundToTick(best.price) : null;
  }
}
