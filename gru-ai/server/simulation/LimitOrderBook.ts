import type { Order, OrderBookLevel, OrderBookSnapshot } from './types.js';

function byBidPriority(a: Order, b: Order): number {
  if (b.price !== a.price) return b.price - a.price;
  return a.createdAtTick - b.createdAtTick || a.createdAt.localeCompare(b.createdAt);
}

function byAskPriority(a: Order, b: Order): number {
  if (a.price !== b.price) return a.price - b.price;
  return a.createdAtTick - b.createdAtTick || a.createdAt.localeCompare(b.createdAt);
}

function toLevels(orders: Order[], depth: number): OrderBookLevel[] {
  const grouped = new Map<number, { quantity: number; orderCount: number }>();
  for (const order of orders) {
    if (order.remainingQuantity <= 0) continue;
    const current = grouped.get(order.price) ?? { quantity: 0, orderCount: 0 };
    current.quantity += order.remainingQuantity;
    current.orderCount += 1;
    grouped.set(order.price, current);
  }
  return Array.from(grouped.entries())
    .map(([price, level]) => ({ price, quantity: level.quantity, orderCount: level.orderCount }))
    .slice(0, depth);
}

export class LimitOrderBook {
  private buyOrders: Order[] = [];
  private sellOrders: Order[] = [];
  private lastUpdatedTick = 0;

  addOrder(order: Order): void {
    if (order.side === 'buy') {
      this.buyOrders.push(order);
      this.buyOrders.sort(byBidPriority);
    } else {
      this.sellOrders.push(order);
      this.sellOrders.sort(byAskPriority);
    }
    this.lastUpdatedTick = order.createdAtTick;
  }

  cancelOrder(orderId: string, reason = 'cancelled'): Order | null {
    const order = this.findOrder(orderId);
    if (!order) return null;
    order.status = 'cancelled';
    order.cancelReason = reason;
    order.remainingQuantity = 0;
    this.compact();
    return order;
  }

  expireOrders(currentTick: number, maxAgeTicks: number, reason = '订单超时撤销'): Order[] {
    const expired: Order[] = [];
    for (const order of [...this.buyOrders, ...this.sellOrders]) {
      if (currentTick - order.createdAtTick < maxAgeTicks) continue;
      order.status = 'cancelled';
      order.cancelReason = reason;
      expired.push({ ...order });
      order.remainingQuantity = 0;
    }
    if (expired.length > 0) {
      this.lastUpdatedTick = currentTick;
      this.compact();
    }
    return expired;
  }

  getBestBid(): Order | undefined {
    this.compact();
    return this.buyOrders[0];
  }

  getBestAsk(): Order | undefined {
    this.compact();
    return this.sellOrders[0];
  }

  isMatchable(): boolean {
    const bid = this.getBestBid();
    const ask = this.getBestAsk();
    return !!bid && !!ask && bid.price >= ask.price;
  }

  snapshot(depth = 5): OrderBookSnapshot {
    this.compact();
    const bids = toLevels(this.buyOrders, depth);
    const asks = toLevels(this.sellOrders, depth);
    const bestBid = bids[0]?.price;
    const bestAsk = asks[0]?.price;
    return {
      bids,
      asks,
      bestBid,
      bestAsk,
      spread: bestBid !== undefined && bestAsk !== undefined ? Number((bestAsk - bestBid).toFixed(2)) : undefined,
      depth,
      lastUpdatedTick: this.lastUpdatedTick,
    };
  }

  reset(): void {
    this.buyOrders = [];
    this.sellOrders = [];
    this.lastUpdatedTick = 0;
  }

  compact(): void {
    this.buyOrders = this.buyOrders.filter((order) => order.remainingQuantity > 0 && order.status !== 'cancelled' && order.status !== 'filled');
    this.sellOrders = this.sellOrders.filter((order) => order.remainingQuantity > 0 && order.status !== 'cancelled' && order.status !== 'filled');
  }

  hasOpenOrder(orderId: string): boolean {
    return this.findOrder(orderId) !== null;
  }

  private findOrder(orderId: string): Order | null {
    return this.buyOrders.find((order) => order.id === orderId)
      ?? this.sellOrders.find((order) => order.id === orderId)
      ?? null;
  }
}
