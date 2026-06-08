# AGENTS.md

# 项目名称

Single Stock A-Share ABM Simulation

单股票A股多智能体市场仿真系统

---

# 项目目标

本项目不是模拟整个A股市场。

本项目只模拟：

一只虚拟股票

例如：

```text
ABM科技
ABM Tech
```

所有Agent围绕这一只股票进行交易。

通过模拟不同投资者的买卖行为，展示：

* 价格发现过程
* 多空博弈
* 情绪周期
* 主力行为
* 资金流向
* 涨停板现象
* 集合竞价
* T+1机制

---

# 核心原则

Agent不能直接修改价格。

价格只能来自：

订单簿撮合。

---

# Agent列表

## RetailAgent

散户

特点：

* 追涨杀跌
* 情绪驱动

---

## HotMoneyAgent

游资

特点：

* 打板
* 接力
* 热点炒作

---

## MutualFundAgent

公募基金

特点：

* 长周期
* 大资金

---

## QuantAgent

量化基金

特点：

* 高频
* 均值回归

---

## NorthboundAgent

北向资金

特点：

* 价值投资

---

## NationalTeamAgent

国家队

特点：

* 护盘

---

## NewsEventAgent

新闻事件Agent

负责生成：

* 利好
* 利空
* 政策
* 财报

---

# Agent行为约束

允许：

* 买入
* 卖出
* 撤单
* 观望

禁止：

* 修改价格
* 修改订单簿
* 修改市场状态

---

# 开发原则

优先保证：

真实市场机制

而非复杂AI能力

Agent逻辑可简单

订单簿必须真实
