# CLAUDE_TASKS.md

# 开发路线图

---

# Phase 1

市场最小闭环

目标：

能够形成价格。

完成：

* SimulationClock
* MarketState
* RetailAgent
* LimitOrderBook
* MatchingEngine

验收：

散户能够买卖。

价格能够变化。

---

# Phase 2

订单簿可视化

完成：

* OrderBookPanel
* RecentTradesPanel
* PriceChart

验收：

前端实时展示：

* 买一卖一
* 成交
* 价格

---

# Phase 3

完整Agent生态

新增：

* HotMoneyAgent
* MutualFundAgent
* QuantAgent
* NorthboundAgent
* NationalTeamAgent

验收：

不同Agent产生不同交易行为。

---

# Phase 4

新闻系统

新增：

NewsEventAgent

事件：

* 利好
* 利空
* 财报
* 政策

验收：

新闻影响交易行为。

---

# Phase 5

A股规则

新增：

* T+1
* 涨跌停
* 集合竞价

验收：

符合A股规则。

---

# Phase 6

市场沙盘

新增：

AgentMap

展示：

* 散户
* 游资
* 基金
* 北向资金
* 国家队

实时行为动画。

---

# Phase 7

资金流向

新增：

CapitalFlow

展示：

* 散户资金
* 游资资金
* 机构资金
* 北向资金
* 国家队资金

---

# Phase 8

最终演示版本

Dashboard展示：

顶部：

* 股票名称
* 当前价格
* 涨跌幅

中部：

* Agent Market
* K线
* 成交量

右侧：

* 订单簿
* 成交明细

底部：

* 多空力量
* 市场情绪
* 资金流向
* 新闻时间线

---

# 最终目标

用户打开系统后：

点击 Start

看到：

多个Agent围绕一只虚拟股票进行交易。

订单进入订单簿。

订单撮合成交。

价格形成。

情绪变化。

资金流动。

形成完整市场生态。
