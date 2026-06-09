# 单股票 A股多智能体市场仿真系统阶段完成报告

## Phase 1：基础市场闭环

任务分配：

* 后端负责仿真时钟、市场状态、订单簿、撮合引擎和基础散户 Agent。
* 前端负责 WebSocket 连接、启动/暂停/步进控制和最小 Dashboard。

落地文件：

* `server/simulation/SimulationClock.ts`
* `server/simulation/MarketState.ts`
* `server/simulation/LimitOrderBook.ts`
* `server/simulation/MatchingEngine.ts`
* `server/simulation/OrderGenerator.ts`
* `server/simulation/SimulationEngine.ts`
* `server/agents/BaseInvestorAgent.ts`
* `server/agents/RetailAgent.ts`
* `server/websocket/simulationSocket.ts`
* `src/hooks/useSimulationWebSocket.ts`
* `src/stores/simulation-store.ts`
* `src/pages/MarketSimulation.tsx`

验收结果：

* 点击 Start 后，ABM科技可以产生订单、撮合成交并形成价格。
* Agent 不能直接修改价格，只能生成订单或观望。

## Phase 2：订单簿可视化

任务分配：

* 后端负责输出五档订单簿、最近成交和价格/成交量序列。
* 前端负责价格走势、成交量、订单簿深度条和最近成交面板。

落地文件：

* `src/components/market/PriceChart.tsx`
* `src/components/market/VolumeChart.tsx`
* `src/components/market/OrderBookPanel.tsx`
* `src/components/market/RecentTradesPanel.tsx`

验收结果：

* 页面实时展示当前价、成交量、成交额、订单簿、成交明细。
* 最近成交显示买方/卖方 Agent 类型，价格来源可追踪到订单撮合。

## Phase 3：完整 Agent 生态

任务分配：

* 后端负责差异化资金主体决策。
* 前端负责用统一 Agent 状态展示各类主体的现金、持仓、情绪、资金流。

落地文件：

* `server/agents/HotMoneyAgent.ts`
* `server/agents/MutualFundAgent.ts`
* `server/agents/QuantAgent.ts`
* `server/agents/NorthboundAgent.ts`
* `server/agents/NationalTeamAgent.ts`
* `src/components/market/AgentMarketMap.tsx`

验收结果：

* 散户、游资、公募、量化、北向、国家队产生不同频率、价格和数量的委托。
* 每个 Agent 最多保留一个未完成委托，避免无约束叠单。

## Phase 4：新闻系统

任务分配：

* 后端负责 NewsEventAgent、新闻冲击、情绪传导。
* 前端负责新闻注入按钮和事件时间线。

落地文件：

* `server/agents/NewsEventAgent.ts`
* `server/simulation/MarketEnvironment.ts`
* `src/components/market/MarketEventTimeline.tsx`
* `src/components/market/SimulationControls.tsx`

验收结果：

* 可手动注入利好/利空新闻。
* 新闻只改变市场环境和 Agent 情绪，不直接改价格。

## Phase 5：A股规则

任务分配：

* 后端负责 T+1 可卖约束、100 股一手、0.01 tick、涨跌停、集合竞价。
* 前端负责显示交易阶段、涨跌停事件和规则拒单。

落地文件：

* `server/simulation/AshareRulesEngine.ts`
* `server/simulation/SimulationClock.ts`
* `server/simulation/SimulationEngine.ts`
* `server/simulation/MarketState.ts`

验收结果：

* 卖出只能使用 `availablePosition`，当日买入进入 `todayBought`，不计入可卖。
* 价格委托限制在 ABM科技虚拟涨跌停区间。
* 集合竞价阶段统一价格成交，连续竞价阶段按订单簿撮合。

## Phase 6：市场沙盘可视化

任务分配：

* 前端复用 gru-ai 原有 `CanvasOffice` 像素办公室渲染器。
* AgentMap 负责把资金主体映射到原有像素 Agent、状态和气泡。

落地文件：

* `src/components/market/AgentMarketMap.tsx`
* `src/components/game/types.ts`

验收结果：

* Dashboard 保留 gru-ai 原有 Agent 可视化风格。
* Canvas 沙盘非空白，并随 Agent 状态显示工作/等待/观望。

## Phase 7：资金流向

任务分配：

* 后端按成交买卖双方更新 Agent `capitalFlow`。
* 前端按资金类型汇总并展示净流入/净流出。

落地文件：

* `server/simulation/AshareRulesEngine.ts`
* `server/simulation/MarketState.ts`
* `src/components/market/CapitalFlowPanel.tsx`
* `src/components/market/MarketMetricsPanel.tsx`

验收结果：

* 可查看散户、游资、公募、量化、北向、国家队的资金流向。
* 多头力量、空头力量、市场情绪、盘口倾斜和买卖压力实时更新。

## Phase 8：最终演示版本

任务分配：

* 后端负责统一 `SimulationEngine`、WebSocket 状态广播和存储去重。
* 前端负责将 Header、Controls、Chart、AgentMap、OrderBook、Trades、Metrics、CapitalFlow、Timeline 集成到单页 Dashboard。

落地文件：

* `server/index.ts`
* `server/storage/simulationStore.ts`
* `src/router.tsx`
* `src/pages/MarketSimulation.tsx`
* `src/components/market/MarketHeader.tsx`

验收结果：

* `/` 默认进入 ABM科技单股票市场仿真 Dashboard。
* 原 gru-ai 办公室页面保留在 `/office`。
* 页面标注“虚拟仿真 · 非投资建议”。
* 未接入真实行情、真实交易接口或投资建议能力。

## 验证记录

* `npm run type-check` 通过。
* `npm run build` 通过。
* 浏览器动态验收通过：启动仿真后价格变化、成交生成、订单簿更新、新闻进入事件线、Canvas 沙盘非空白。
* 验收截图：`/private/tmp/gru-ai-market-simulation-final.png`
