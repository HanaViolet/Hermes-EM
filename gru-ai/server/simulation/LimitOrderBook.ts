import type { Order, OrderBookLevel, OrderBookSnapshot } from './types.js';

function byBidPriority(a: Order, b: Order): number {
  if (b.price !== a.price) return b.price - a.price;
  return a.createdAtTick - b.createdAtTick || a.createdAt.localeCompare(b.createdAt);
}

function byAskPriority(a: Order, b: Order): number {
  if (a.price !== b.price) return a.price - b.price;
  return a.createdAtTick - b.createdAtTick || a.createdAt.localeCompare(b.createdAt);
}

function findInsertIndex(orders: Order[], order: Order, compare: (a: Order, b: Order) => number): number {
  let lo = 0;
  let hi = orders.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (compare(orders[mid], order) <= 0) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
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
  private dirty = false;
  private cachedSnapshot: OrderBookSnapshot | null = null;
  private cachedDepth = 0;

  addOrder(order: Order): void {
    if (order.side === 'buy') {
      const idx = findInsertIndex(this.buyOrders, order, byBidPriority);
      this.buyOrders.splice(idx, 0, order);
    } else {
      const idx = findInsertIndex(this.sellOrders, order, byAskPriority);
      this.sellOrders.splice(idx, 0, order);
    }
    this.lastUpdatedTick = order.createdAtTick;
    this.invalidateSnapshot();
  }

  cancelOrder(orderId: string, reason = 'cancelled'): Order | null {
    const order = this.findOrder(orderId);
    if (!order) return null;
    order.status = 'cancelled';
    order.cancelReason = reason;
    order.remainingQuantity = 0;
    this.markDirty();
    this.compact();
    return order;
  }

  expireOrders(currentTick: number, maxAgeTicks: number, reason = '订单超时撤销'): Order[] {
    const expired: Order[] = [];
    for (const order of this.buyOrders) {
      if (currentTick - order.createdAtTick < maxAgeTicks) continue;
      order.status = 'cancelled';
      order.cancelReason = reason;
      expired.push({ ...order });
      order.remainingQuantity = 0;
    }
    for (const order of this.sellOrders) {
      if (currentTick - order.createdAtTick < maxAgeTicks) continue;
      order.status = 'cancelled';
      order.cancelReason = reason;
      expired.push({ ...order });
      order.remainingQuantity = 0;
    }
    if (expired.length > 0) {
      this.lastUpdatedTick = currentTick;
      this.markDirty();
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
    if (this.cachedSnapshot && this.cachedDepth === depth) {
      return this.cachedSnapshot;
    }
    this.compact();
    const bids = toLevels(this.buyOrders, depth);
    const asks = toLevels(this.sellOrders, depth);
    const bestBid = bids[0]?.price;
    const bestAsk = asks[0]?.price;
    this.cachedSnapshot = {
      bids,
      asks,
      bestBid,
      bestAsk,
      spread: bestBid !== undefined && bestAsk !== undefined ? Number((bestAsk - bestBid).toFixed(2)) : undefined,
      depth,
      lastUpdatedTick: this.lastUpdatedTick,
    };
    this.cachedDepth = depth;
    return this.cachedSnapshot;
  }

  reset(): void {
    this.buyOrders = [];
    this.sellOrders = [];
    this.lastUpdatedTick = 0;
    this.dirty = false;
    this.invalidateSnapshot();
  }

  compact(): void {
    if (!this.dirty) return;
    this.buyOrders = this.buyOrders.filter((order) => order.remainingQuantity > 0 && order.status !== 'cancelled' && order.status !== 'filled');
    this.sellOrders = this.sellOrders.filter((order) => order.remainingQuantity > 0 && order.status !== 'cancelled' && order.status !== 'filled');
    this.dirty = false;
  }

  /** Mark the book as needing compaction and invalidate any cached snapshot. */
  markDirty(): void {
    this.dirty = true;
    this.invalidateSnapshot();
  }

  hasOpenOrder(orderId: string): boolean {
    return this.findOrder(orderId) !== null;
  }

  private findOrder(orderId: string): Order | null {
    this.compact();
    return this.buyOrders.find((order) => order.id === orderId)
      ?? this.sellOrders.find((order) => order.id === orderId)
      ?? null;
  }

  private invalidateSnapshot(): void {
    this.cachedSnapshot = null;
  }
}
