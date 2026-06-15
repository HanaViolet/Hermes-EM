import { randomUUID } from 'node:crypto';
import { LimitOrderBook } from './LimitOrderBook.js';
import type { Order, OrderSide, TickContext, Trade } from './types.js';

function aggressorSide(buy: Order, sell: Order): OrderSide {
  if (buy.createdAtTick === sell.createdAtTick) {
    return buy.createdAt > sell.createdAt ? 'buy' : 'sell';
  }
  return buy.createdAtTick > sell.createdAtTick ? 'buy' : 'sell';
}

function executionPrice(buy: Order, sell: Order): number {
  if (buy.createdAtTick === sell.createdAtTick) {
    return buy.createdAt > sell.createdAt ? sell.price : buy.price;
  }
  return buy.createdAtTick > sell.createdAtTick ? sell.price : buy.price;
}

export class MatchingEngine {
  match(book: LimitOrderBook, context: TickContext): Trade[] {
    const trades: Trade[] = [];

    while (book.isMatchable()) {
      const buy = book.getBestBid();
      const sell = book.getBestAsk();
      if (!buy || !sell) break;

      const quantity = Math.min(buy.remainingQuantity, sell.remainingQuantity);
      const price = executionPrice(buy, sell);
      const amount = Number((price * quantity).toFixed(2));

      buy.remainingQuantity -= quantity;
      sell.remainingQuantity -= quantity;
      buy.status = buy.remainingQuantity === 0 ? 'filled' : 'partially_filled';
      sell.status = sell.remainingQuantity === 0 ? 'filled' : 'partially_filled';

      book.markDirty();

      trades.push({
        id: randomUUID(),
        buyOrderId: buy.id,
        sellOrderId: sell.id,
        buyerAgentId: buy.agentId,
        sellerAgentId: sell.agentId,
        buyerAgentType: buy.agentType,
        sellerAgentType: sell.agentType,
        price,
        quantity,
        amount,
        tick: context.tick,
        timestamp: new Date().toISOString(),
        aggressorSide: aggressorSide(buy, sell),
      });
    }

    return trades;
  }

  matchAtPrice(book: LimitOrderBook, context: TickContext, auctionPrice: number): Trade[] {
    const trades: Trade[] = [];

    while (true) {
      const buy = book.getBestBid();
      const sell = book.getBestAsk();
      if (!buy || !sell || buy.price < auctionPrice || sell.price > auctionPrice) break;

      const quantity = Math.min(buy.remainingQuantity, sell.remainingQuantity);
      const amount = Number((auctionPrice * quantity).toFixed(2));
      buy.remainingQuantity -= quantity;
      sell.remainingQuantity -= quantity;
      buy.status = buy.remainingQuantity === 0 ? 'filled' : 'partially_filled';
      sell.status = sell.remainingQuantity === 0 ? 'filled' : 'partially_filled';

      book.markDirty();

      trades.push({
        id: randomUUID(),
        buyOrderId: buy.id,
        sellOrderId: sell.id,
        buyerAgentId: buy.agentId,
        sellerAgentId: sell.agentId,
        buyerAgentType: buy.agentType,
        sellerAgentType: sell.agentType,
        price: auctionPrice,
        quantity,
        amount,
        tick: context.tick,
        timestamp: new Date().toISOString(),
        aggressorSide: aggressorSide(buy, sell),
      });
    }

    return trades;
  }
}
