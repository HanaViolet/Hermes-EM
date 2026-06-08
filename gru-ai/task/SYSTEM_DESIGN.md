# SYSTEM_DESIGN.md

# 系统架构设计

---

# 总体架构

```text
SimulationClock
      ↓

MarketEnvironment
      ↓

NewsEventAgent
      ↓

InvestorAgents
      ↓

OrderGenerator
      ↓

AshareRulesEngine
      ↓

LimitOrderBook
      ↓

MatchingEngine
      ↓

MarketState
      ↓

WebSocket
      ↓

Dashboard
```

---

# 仿真对象

仅模拟：

```text
一只虚拟股票
```

例如：

```ts
{
  symbol: "ABM",
  name: "ABM科技",
  previousClose: 100,
  currentPrice: 100
}
```

---

# 市场环境

维护：

```ts
currentPrice
volume
turnover

marketSentiment

bullPower
bearPower

volatility

capitalFlow
```

---

# A股规则

## Tick

```text
0.01元
```

---

## 一手

```text
100股
```

---

## T+1

当天买入：

不能卖出

---

## 涨跌停

主板：

```text
±10%
```

---

# 限价订单簿

维护：

```ts
buyOrders[]
sellOrders[]
```

买单：

```text
价格高优先
时间早优先
```

卖单：

```text
价格低优先
时间早优先
```

---

# 撮合引擎

规则：

```text
BestBid >= BestAsk
```

则成交。

成交后：

更新：

```text
价格
成交量
成交额
```

---

# 市场指标

计算：

```text
BullPower

BearPower

MarketSentiment

OrderBookImbalance

CapitalFlow
```

---

# WebSocket

每个Tick推送：

```ts
MarketState
```

前端实时刷新。

---

# 数据流

```text
Agent
 ↓

Decision

 ↓

Order

 ↓

OrderBook

 ↓

Matching

 ↓

Trade

 ↓

MarketState

 ↓

Dashboard
```
