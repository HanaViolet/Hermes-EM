# ClawLibrary × 算法交易 Agent：完整策略映射文档

## 1. 项目定位

本项目计划将 **ClawLibrary** 改造为一个用于算法交易作业二的可视化前端。作业主题对应“量化交易 Agent 构建问题”，目标是搭建一个能够观察市场、分析信号、进行风险检查、生成交易决策并输出结果的交易 Agent 系统。

ClawLibrary 原本是一个 2D 像素游戏风格的资产控制室，核心能力包括：

- 将不同类型资产映射到不同房间；
- 在界面中浏览、预览资产；
- 实时展示系统正在访问、使用或处理的资源；
- 将运行状态和具体房间关联；
- 通过角色移动与房间状态联动来呈现工作流；
- 使用协议数据和实时遥测驱动界面更新。

因此，本项目不需要重做前端，而是将“OpenClaw 资源房间”重新映射为“量化交易 Agent 的工作模块”，把原有的房间、角色、状态、遥测协议改造成交易策略可视化系统。

---

## 2. 总体映射思路

原始 ClawLibrary 的核心逻辑是：

> 资源类型 → 房间区域 → 角色访问 → 状态展示 → 输出预览

改造为算法交易系统后，对应为：

> 市场数据 → Agent 模块 → 策略处理 → 交易动作 → 绩效反馈

也就是说，前端中的“房间”不再代表文档、图像、代码等资源，而是代表交易系统中的不同功能区。角色不再代表普通访问行为，而是代表交易 Agent 当前正在执行的策略步骤。

---

## 3. 房间功能映射

| ClawLibrary 原房间 | 改造后的交易系统模块 | 作用说明 |
|---|---|---|
| 文档归档 | Market Data Room / 市场数据室 | 存放历史行情、实时行情、K线数据、成交量数据 |
| 图像工坊 | Chart Room / 图表分析室 | 展示价格走势、均线、收益率、回撤、交易点位 |
| 记忆库 | Strategy Memory / 策略记忆库 | 存放历史交易记录、历史决策理由、策略表现摘要 |
| 技能锻炉 | Strategy Lab / 策略实验室 | 执行技术指标、信号生成、因子计算、模型推理 |
| 接口网关 | Trading API Gateway / 交易接口网关 | 对接模拟交易 API、回测引擎、数据源接口 |
| 代码实验室 | Backtest Lab / 回测实验室 | 运行回测、参数测试、策略比较 |
| 调度台 | Decision Desk / 决策调度台 | 汇总信号、风险、仓位，形成最终交易决策 |
| 报警台 | Risk Alert Room / 风险报警室 | 展示止损、最大回撤、异常波动、仓位超限 |
| 运行监控 | Live Monitor / 运行监控室 | 显示 Agent 当前状态、最近动作、运行日志 |
| 队列中枢 | Order Queue / 订单队列 | 显示待执行订单、已成交订单、取消订单 |
| 休息室 | Idle / Standby Room / 空闲状态 | Agent 暂停、等待数据、无交易信号时进入 |

---

## 4. Agent 行为状态映射

交易 Agent 的行为可以划分为 8 个核心状态。每个状态对应前端角色位置、房间高亮、提示文本和侧边栏信息。

| Agent 状态 | 前端表现 | 触发条件 | 展示内容 |
|---|---|---|---|
| Idle / 空闲等待 | 角色停在休息室 | 系统未启动或无任务 | “Agent is waiting for market updates.” |
| Data Fetching / 获取数据 | 角色移动到市场数据室 | 新一轮行情更新 | 股票代码、时间戳、OHLCV、数据源 |
| Signal Analysis / 信号分析 | 角色移动到策略实验室 | 数据加载完成 | 技术指标、趋势判断、买卖信号 |
| Risk Checking / 风险检查 | 角色移动到风险报警室 | 生成初步信号后 | 仓位限制、止损线、最大回撤、波动率 |
| Decision Making / 决策生成 | 角色移动到决策调度台 | 信号和风险检查完成 | Buy / Sell / Hold、置信度、理由 |
| Order Planning / 订单规划 | 角色移动到订单队列 | 需要执行交易 | 订单方向、数量、价格、类型 |
| Execution / 模拟执行 | 角色移动到交易接口网关 | 下单请求发出 | 成交状态、成交价格、滑点、手续费 |
| Performance Review / 表现复盘 | 角色移动到图表分析室或记忆库 | 一轮交易完成 | 收益率、累计收益、回撤、胜率、交易日志 |

---

## 5. 交易动作映射

交易 Agent 的核心动作不应只显示成简单的 “Buy / Sell”，而应该拆成更清晰的策略动作链。

| Agent 动作 | 前端事件 | UI 显示方式 | 后端字段 |
|---|---|---|---|
| 读取市场数据 | 高亮 Market Data Room | 行情面板刷新 | `market_data_updated` |
| 计算技术指标 | 高亮 Strategy Lab | 显示 MA / RSI / MACD 等指标 | `indicator_calculated` |
| 生成买入信号 | 决策台出现绿色方向提示 | “BUY signal detected” | `signal = buy` |
| 生成卖出信号 | 决策台出现卖出方向提示 | “SELL signal detected” | `signal = sell` |
| 保持观望 | 角色返回休息室 | “No trade signal” | `signal = hold` |
| 检查风险 | 风险室闪烁或显示状态卡片 | 风险通过 / 风险拒绝 | `risk_status` |
| 生成订单 | 订单队列新增卡片 | 数量、方向、价格 | `order_created` |
| 模拟成交 | API 网关显示执行结果 | 成交 / 部分成交 / 拒绝 | `order_executed` |
| 更新持仓 | 监控室刷新账户状态 | 现金、持仓、市值 | `portfolio_updated` |
| 记录复盘 | 记忆库新增日志 | 本轮交易理由和结果 | `trade_log_saved` |

---

## 6. 推荐策略设计：简单但完整

为了适合作业二，不建议一开始做过于复杂的深度强化学习策略。可以采用一个“规则策略 + LLM解释 + 可视化前端”的组合，既容易实现，也能体现 Agent 思想。

### 6.1 策略名称

**Moving Average Risk-Controlled Trading Agent**

中文名：

**基于均线信号与风险控制的量化交易 Agent**

### 6.2 策略逻辑

输入：

- 股票或 ETF 历史价格；
- 当前现金；
- 当前持仓；
- 最近 N 日收益率；
- 移动平均线；
- 风险参数。

核心信号：

- 当短期均线上穿长期均线，生成买入信号；
- 当短期均线下穿长期均线，生成卖出信号；
- 当波动率过高、回撤过大、仓位过高时，即使有买入信号也拒绝交易；
- 当没有明显趋势时，保持观望。

示例规则：

```text
if MA_short > MA_long and previous_MA_short <= previous_MA_long:
    signal = BUY
elif MA_short < MA_long and previous_MA_short >= previous_MA_long:
    signal = SELL
else:
    signal = HOLD
```

风险规则：

```text
if max_drawdown > 10%:
    block_buy = True

if position_ratio > 80%:
    block_buy = True

if daily_volatility > threshold:
    reduce_position = True
```

### 6.3 Agent 决策输出格式

建议每一轮 Agent 输出统一 JSON，便于前端读取：

```json
{
  "timestamp": "2026-06-04 10:30:00",
  "symbol": "AAPL",
  "agent_state": "decision_making",
  "market_summary": {
    "close": 198.50,
    "ma_short": 196.20,
    "ma_long": 190.80,
    "volatility": 0.018
  },
  "signal": "BUY",
  "risk_status": "PASS",
  "action": {
    "type": "BUY",
    "quantity": 10,
    "order_type": "market"
  },
  "reason": "Short-term moving average is above long-term moving average, and risk constraints are satisfied."
}
```

---

## 7. 多 Agent 映射方案

如果希望作业看起来更完整，可以设计为多 Agent 架构，但前端仍然可以先用一只角色主导展示。

### 7.1 多 Agent 角色

| Agent | 职责 | 对应房间 |
|---|---|---|
| Data Agent | 获取行情数据 | Market Data Room |
| Signal Agent | 计算指标和生成信号 | Strategy Lab |
| Risk Agent | 检查风险约束 | Risk Alert Room |
| Trader Agent | 生成订单和执行交易 | Order Queue / API Gateway |
| Analyst Agent | 总结交易理由和绩效 | Chart Room / Strategy Memory |

### 7.2 多 Agent 前端表现

基础版：

- 只显示一个主角色；
- 角色根据当前 Agent 状态在不同房间移动；
- 侧边栏显示当前是哪个 Agent 在工作。

进阶版：

- 每个 Agent 对应一个小角色；
- 不同角色分别停留在不同房间；
- 当前活跃 Agent 高亮；
- 多 Agent 的结果通过决策台汇总。

建议作业展示时采用基础版，避免开发复杂度过高。

---

## 8. 前端信息面板设计

ClawLibrary 原本有资产浏览和运行状态面板。改造后，建议右侧信息面板改为交易 Agent 控制台。

### 8.1 顶部状态区

```text
Agent Status: Running
Current Symbol: AAPL
Current Step: Risk Checking
Latest Action: BUY signal generated
Risk Status: PASS
```

### 8.2 市场数据区

```text
Close Price: 198.50
MA(5): 196.20
MA(20): 190.80
Volume: 52.4M
Daily Return: +1.25%
Volatility: 1.8%
```

### 8.3 决策解释区

```text
Decision: BUY
Confidence: 0.72
Reason:
The short-term moving average crossed above the long-term moving average.
The current drawdown is within the risk limit.
The position ratio remains below the maximum threshold.
```

### 8.4 账户状态区

```text
Cash: 80,000
Position Value: 20,000
Total Asset: 100,000
Position Ratio: 20%
Cumulative Return: +3.4%
Max Drawdown: -2.1%
```

### 8.5 交易日志区

```text
[10:30] Data updated: AAPL close = 198.50
[10:31] Signal generated: BUY
[10:32] Risk check passed
[10:33] Order created: BUY 10 shares
[10:34] Order executed at 198.50
```

---

## 9. 遥测协议映射

ClawLibrary 使用实时遥测来驱动房间和角色状态。交易系统也应设计一个轻量级遥测文件或接口。

### 9.1 推荐遥测文件

```text
src/data/trading-telemetry.json
```

### 9.2 遥测字段设计

```json
{
  "active_room": "strategy_lab",
  "agent_state": "signal_analysis",
  "active_agent": "Signal Agent",
  "symbol": "AAPL",
  "signal": "BUY",
  "risk_status": "PENDING",
  "latest_action": "Calculating moving average crossover",
  "portfolio": {
    "cash": 80000,
    "position_value": 20000,
    "total_asset": 100000,
    "position_ratio": 0.2
  },
  "performance": {
    "cumulative_return": 0.034,
    "max_drawdown": -0.021,
    "win_rate": 0.56
  },
  "logs": [
    "Market data updated",
    "MA indicators calculated",
    "BUY signal detected"
  ]
}
```

### 9.3 状态到房间的映射函数

```ts
const stateToRoom: Record<string, string> = {
  idle: "standby_room",
  data_fetching: "market_data_room",
  signal_analysis: "strategy_lab",
  risk_checking: "risk_alert_room",
  decision_making: "decision_desk",
  order_planning: "order_queue",
  execution: "trading_api_gateway",
  performance_review: "chart_room"
};
```

---

## 10. 页面组件改造建议

### 10.1 最小改造版

只修改文案和数据映射，不大改代码。

需要改：

- 房间名称；
- 房间说明；
- 角色状态文本；
- 右侧信息面板字段；
- 遥测 JSON 结构；
- 示例数据。

优点：

- 实现最快；
- 适合作业展示；
- 不容易破坏原项目结构。

### 10.2 推荐改造版

在最小改造基础上增加：

- 策略运行按钮：Start / Pause / Reset；
- 交易日志面板；
- 简单收益曲线；
- 当前持仓卡片；
- 风险状态提示；
- 订单队列卡片。

优点：

- 展示更像一个完整的量化交易系统；
- 能明显体现 Agent 的“观察—思考—行动—复盘”流程。

### 10.3 不建议一开始做的功能

暂时不建议优先做：

- 真实券商下单；
- 高频实时交易；
- 复杂多 Agent 动画；
- 强化学习训练过程可视化；
- 大规模股票池筛选；
- 复杂权限系统。

这些功能开发成本高，但对课程作业展示帮助有限。

---

## 11. 后端算法模块映射

建议后端使用 Python 实现策略逻辑，前端只读取结果。

### 11.1 后端模块结构

```text
trading_agent/
├── data_loader.py          # 获取历史行情或模拟行情
├── indicators.py           # 计算 MA / RSI / MACD 等指标
├── signal_agent.py         # 生成交易信号
├── risk_agent.py           # 风险检查
├── trader_agent.py         # 生成订单
├── portfolio.py            # 更新账户和持仓
├── backtest.py             # 回测主循环
├── telemetry_writer.py     # 写入前端遥测文件
└── main.py                 # 启动入口
```

### 11.2 前后端通信方式

作业版推荐采用最简单方式：

```text
Python 策略程序 → 写 trading-telemetry.json → ClawLibrary 前端轮询读取 → 更新房间和面板
```

如果后续希望更实时，可以换成：

```text
Python FastAPI 后端 → WebSocket / REST API → ClawLibrary 前端
```

### 11.3 最小可行数据流

```text
历史行情 CSV
    ↓
data_loader.py
    ↓
indicators.py
    ↓
signal_agent.py
    ↓
risk_agent.py
    ↓
trader_agent.py
    ↓
portfolio.py
    ↓
telemetry_writer.py
    ↓
ClawLibrary 前端展示
```

---

## 12. 具体行为映射表

| 后端事件 | Agent 状态 | 前端房间 | 角色动作 | 面板提示 |
|---|---|---|---|---|
| 加载行情 CSV | data_fetching | Market Data Room | 走向数据室 | Loading historical market data |
| 完成数据清洗 | data_fetching | Market Data Room | 停留数据室 | Market data ready |
| 计算 MA 指标 | signal_analysis | Strategy Lab | 走向策略实验室 | Calculating moving averages |
| 产生 BUY 信号 | decision_making | Decision Desk | 走向决策台 | BUY signal generated |
| 产生 SELL 信号 | decision_making | Decision Desk | 走向决策台 | SELL signal generated |
| 无交易信号 | idle | Standby Room | 返回休息室 | HOLD: no clear signal |
| 风险检查通过 | risk_checking | Risk Alert Room | 风险室短暂高亮 | Risk check passed |
| 风险检查失败 | risk_checking | Risk Alert Room | 风险室报警 | Trade blocked by risk control |
| 创建订单 | order_planning | Order Queue | 走向订单队列 | Order created |
| 执行订单 | execution | Trading API Gateway | 走向接口网关 | Simulated order executed |
| 更新持仓 | performance_review | Live Monitor | 走向监控室 | Portfolio updated |
| 保存日志 | performance_review | Strategy Memory | 走向记忆库 | Trade log saved |
| 回测结束 | performance_review | Chart Room | 走向图表室 | Backtest finished |

---

## 13. UI 文案替换建议

### 13.1 项目标题

原：

```text
ClawLibrary
```

改：

```text
Trading Agent Control Room
```

或：

```text
Algorithmic Trading Agent Library
```

中文：

```text
量化交易 Agent 控制室
```

### 13.2 页面副标题

```text
A 2D visual interface for monitoring market data, trading signals, risk checks, and simulated order execution.
```

中文：

```text
一个用于观察市场数据、交易信号、风险检查与模拟下单过程的 2D 可视化界面。
```

### 13.3 角色状态提示

| 状态 | 英文提示 | 中文提示 |
|---|---|---|
| idle | Waiting for market update | 等待市场数据更新 |
| data_fetching | Reading market data | 正在读取市场数据 |
| signal_analysis | Analyzing trading signals | 正在分析交易信号 |
| risk_checking | Checking risk constraints | 正在检查风险约束 |
| decision_making | Making trading decision | 正在生成交易决策 |
| order_planning | Preparing order | 正在生成订单 |
| execution | Executing simulated trade | 正在执行模拟交易 |
| performance_review | Reviewing performance | 正在复盘策略表现 |

---

## 14. 报告中可以这样描述

### 14.1 中文表述

本项目基于 ClawLibrary 构建了一个 2D 可视化量化交易 Agent 控制室。我们将原项目中的资源房间重新映射为交易系统中的市场数据室、策略实验室、风险报警室、决策调度台、订单队列和运行监控室。交易 Agent 在每一轮交易过程中依次完成市场观察、信号分析、风险检查、交易决策、模拟执行和绩效复盘。前端角色的位置和状态由后端交易遥测数据实时驱动，从而将抽象的算法交易流程转化为可观察、可解释的可视化工作流。

### 14.2 英文表述

This project builds a 2D visual control room for an algorithmic trading agent based on ClawLibrary. The original resource-oriented rooms are remapped into trading-oriented modules, including the market data room, strategy lab, risk alert room, decision desk, order queue, and live monitor. During each trading cycle, the agent observes market data, analyzes trading signals, checks risk constraints, makes trading decisions, executes simulated orders, and reviews portfolio performance. The movement and status of the frontend character are driven by backend telemetry, making the abstract trading workflow observable and explainable.

---

## 15. 最终推荐实现范围

为了保证作业可完成、可展示、逻辑完整，建议实现以下范围：

### 必做功能

- 房间名称改为交易模块；
- 角色根据 Agent 状态移动；
- 右侧面板显示市场数据、信号、风险、账户、日志；
- 后端策略程序输出遥测 JSON；
- 实现 Buy / Sell / Hold 三类决策；
- 实现基础风险控制；
- 实现回测收益曲线或结果摘要。

### 可选功能

- 多 Agent 角色；
- 多股票切换；
- 参数设置面板；
- 策略对比；
- LLM 生成交易理由；
- WebSocket 实时推送。

### 不做功能

- 真实资金交易；
- 真实券商接口；
- 高频交易；
- 复杂强化学习训练；
- 大规模分布式回测。

---

## 16. 一句话总结

本项目的核心不是把 ClawLibrary 改成真正的交易软件，而是利用它的“房间—角色—状态—遥测”机制，把量化交易 Agent 的完整决策链条可视化出来：

> Market Data → Signal Analysis → Risk Control → Trading Decision → Order Execution → Performance Review

对应中文：

> 市场数据 → 信号分析 → 风险控制 → 交易决策 → 订单执行 → 绩效复盘

这样既符合算法交易作业二“构建量化交易 Agent”的要求，也能通过可视化前端清晰展示 Agent 的行为逻辑。
