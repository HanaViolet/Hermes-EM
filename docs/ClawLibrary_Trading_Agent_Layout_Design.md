# ClawLibrary 量化交易 Agent 前端布局设计文档

## 1. 设计目标

本页面的目标不是做一个普通的交易面板，而是把“量化交易 Agent 的运行过程”可视化出来。用户应该能够直观看到：

1. 当前正在分析哪个资产。
2. Agent 当前处于哪个处理阶段。
3. 为什么最终做出 Buy / Sell / Hold 决策。
4. 各个 Agent 或功能模块是否运行正常。
5. 用户可以通过对话框向大模型询问当前决策原因、风险解释和交易报告。

推荐采用：

> 左侧看结果，中间看过程，右侧做操作，底部问大模型。

---

## 2. 整体页面结构

推荐采用四区域布局：

```text
┌────────────────────────────────────────────────────────────────────┐
│ Top Bar：项目标题 / 当前资产 / 系统状态 / API 状态 / 语言与主题      │
├───────────────┬────────────────────────────────────┬───────────────┤
│ Left Panel    │ Main Map Area                       │ Right Panel   │
│ 当前任务       │ ClawLibrary 像素地图                 │ 新建任务       │
│ 当前决策       │ Agent 移动动画                       │ 参数配置       │
│ 组合表现       │ 房间高亮 / 任务气泡                   │ Agent 状态     │
│ 核心原因       │                                    │ 运行日志       │
├───────────────┴────────────────────────────────────┴───────────────┤
│ Bottom Chat Drawer：大模型交易分析助手 / 决策解释 / 报告生成         │
└────────────────────────────────────────────────────────────────────┘
```

页面信息分工：

| 区域 | 功能定位 | 用户关注点 |
|---|---|---|
| Top Bar | 全局状态 | 当前系统是否运行正常 |
| Left Panel | 当前结果 | Agent 做出了什么决策 |
| Main Map | 过程可视化 | Agent 正在做什么 |
| Right Panel | 操作控制 | 如何启动新的分析任务 |
| Bottom Chat | 大模型解释 | 为什么这么决策，风险是什么 |

---

## 3. Top Bar 顶部栏设计

顶部栏用于承载全局信息，不应该放太多操作按钮。它主要回答：当前系统叫什么、当前正在分析哪个资产、系统是否在线、大模型 API 是否可用、当前语言和主题是什么。

推荐内容：

```text
量化交易 Agent 控制台
OpenClaw-based Multi-Agent Trading Visualization

Asset: SPY    Mode: Auto    Status: Completed    Decision: HOLD
API: Online    Theme: Dark    中 / EN
```

建议布局：

```text
┌──────────────────────────────────────────────────────────────┐
│ 量化交易 Agent 控制台                       API Online  中/EN │
│ OpenClaw-based Multi-Agent Trading Visualization              │
│ Asset: SPY | Mode: Auto | Status: Completed | Decision: HOLD  │
└──────────────────────────────────────────────────────────────┘
```

视觉建议：

- 高度：72px 到 88px。
- 背景：深色半透明。
- 标题字号：22px 到 26px。
- 副标题字号：12px 到 14px。
- 状态标签使用 pill badge，例如 `API Online`、`Completed`、`HOLD`。

---

## 4. Left Panel 左侧结果面板设计

左侧面板只展示“当前任务的结果和解释”，不要放输入控件。它应该让用户在 3 秒内理解当前 Agent 的判断。

建议分成四个卡片：

1. Current Analysis 当前分析任务
2. Decision 当前交易决策
3. Portfolio Snapshot 组合快照
4. Key Reasons 决策原因

示例布局：

```text
┌───────────────────────┐
│ Current Analysis       │
│ Asset: SPY             │
│ Period: 2020-01-01 ~   │
│         2024-01-01     │
│ Mode: Auto             │
│ Status: Completed      │
└───────────────────────┘

┌───────────────────────┐
│ Decision               │
│ Action: HOLD           │
│ Confidence: 100%       │
│ Risk Level: Low        │
└───────────────────────┘

┌───────────────────────┐
│ Portfolio Snapshot     │
│ Cash: $10,000          │
│ Position: 0 shares     │
│ PnL: +0.00%            │
│ Max Drawdown: 0.00%    │
└───────────────────────┘

┌───────────────────────┐
│ Key Reasons            │
│ - Weak trend signal    │
│ - No strong trigger    │
│ - Risk under control   │
└───────────────────────┘
```

字段建议：

| 字段 | 含义 |
|---|---|
| Asset | 当前分析资产，例如 SPY、AAPL、BTC |
| Period | 分析时间区间 |
| Mode | 策略模式，例如 Auto、Momentum、Mean Reversion |
| Status | Running / Completed / Failed |
| Action | Buy / Sell / Hold |
| Confidence | 决策置信度 |
| PnL | 当前收益率 |
| Max Drawdown | 最大回撤 |
| Reason | 决策解释摘要 |

---

## 5. Main Map 中央地图区域设计

中央地图是页面的核心视觉区域。ClawLibrary 的像素房间不应该只是装饰，而应该映射到量化交易 Agent 的不同处理阶段。

房间功能映射：

| 房间名称 | 功能映射 | Agent 行为 |
|---|---|---|
| 休息室 | Idle Room | Agent 等待任务 |
| 市场数据室 | Market Data Room | 加载行情、K线、成交量 |
| 指标实验室 | Indicator Lab | 计算 RSI、MACD、MA、波动率 |
| 策略实验室 | Strategy Lab | 生成候选策略 |
| 策略记忆库 | Memory Library | 读取历史策略和过往交易经验 |
| 图表分析室 | Chart Room | 生成趋势图、收益曲线、指标图 |
| 风险报警室 | Risk Monitor | 检查回撤、波动率、止损风险 |
| 决策调度台 | Decision Desk | 综合信号并输出 Buy / Sell / Hold |
| 执行日志台 | Execution Console | 模拟下单、记录交易行为 |
| 运行监控室 | Runtime Monitor | 监控 Agent 运行状态 |
| 报告与分析室 | Report Room | 生成交易分析报告 |

推荐将一次完整分析映射为以下路径：

```text
休息室
  ↓
市场数据室
  ↓
指标实验室
  ↓
策略记忆库
  ↓
策略实验室
  ↓
图表分析室
  ↓
风险报警室
  ↓
决策调度台
  ↓
执行日志台
  ↓
报告与分析室
  ↓
休息室
```

状态动画建议：

| 状态 | 小猫 / Agent 表现 |
|---|---|
| Idle | 在休息室睡觉 |
| Loading Data | 移动到市场数据室，显示数据气泡 |
| Computing Indicators | 在指标实验室停留，显示计算动画 |
| Generating Strategy | 在策略实验室走动 |
| Risk Checking | 在风险报警室停留，出现黄色警示图标 |
| Making Decision | 在决策调度台停留，显示 Buy / Sell / Hold |
| Executing Order | 在执行日志台显示订单记录 |
| Reporting | 在报告与分析室显示文档图标 |
| Error | 停在风险报警室，显示错误气泡 |

地图交互建议：用户点击不同房间时，显示该房间的当前信息。

例如点击“指标实验室”：

```text
Indicator Lab
Status: Completed

Calculated Indicators:
- RSI: 54.2
- MACD: Weak bullish
- MA20 / MA60: Neutral
- Volatility: Low

Output:
No strong technical signal.
```

点击“风险报警室”：

```text
Risk Monitor
Status: Completed

Risk Checks:
- Max drawdown: acceptable
- Volatility: controlled
- Stop-loss risk: low
- Position exposure: safe

Output:
Risk level is low.
```

---

## 6. Right Panel 右侧控制面板设计

右侧面板负责“用户输入和系统控制”。它应该支持用户创建新的分析任务、查看 Agent 状态、查看简短运行日志。

推荐模块：

1. New Analysis Task 新建分析任务
2. Agent Status Agent 状态
3. Runtime Log 运行日志

新建任务模块：

```text
┌──────────────────────────┐
│ New Analysis Task         │
│ Asset                     │
│ [ SPY                 v ] │
│ Start Date                │
│ [ 2020-01-01          ]   │
│ End Date                  │
│ [ 2024-01-01          ]   │
│ Strategy Mode             │
│ [ Auto                v ] │
│ Risk Level                │
│ [ 0.001               ]   │
│                          │
│ [ Run Analysis ]          │
│ [ Reset State  ]          │
└──────────────────────────┘
```

Agent 状态模块：

```text
┌──────────────────────────┐
│ Agent Status              │
│ Market Data Agent    Done │
│ Indicator Agent      Done │
│ Strategy Agent       Done │
│ Risk Agent           Done │
│ Decision Agent       Done │
│ Execution Agent      Idle │
│ Report Agent         Done │
└──────────────────────────┘
```

运行日志模块：

```text
┌──────────────────────────┐
│ Runtime Log               │
│ [10:21:03] Load data      │
│ [10:21:05] Calc RSI/MACD  │
│ [10:21:07] Compare rules  │
│ [10:21:08] Decision HOLD  │
└──────────────────────────┘
```

右侧面板注意事项：

- 不要把所有房间状态都堆成很长列表。
- 状态信息只展示核心 Agent，不展示过多调试字段。
- 日志最多显示最近 5 到 8 条。
- 详细日志可以点击展开，不要默认全部显示。

---

## 7. Bottom Chat Drawer 大模型对话框设计

底部对话框用于接入大模型 API，让用户可以询问：

- 为什么这次是 Hold？
- 当前指标说明了什么？
- 当前风险高不高？
- 是否应该买入或卖出？
- 能否生成一段交易报告？

不建议把对话框放到右侧，因为右侧已经承担任务控制。底部抽屉的好处是：不破坏地图主体，可以横向展示更长的解释文本，也符合“分析助手”的使用习惯。

默认收起状态：

```text
┌──────────────────────────────────────────────────────────────┐
│ Ask Trading Agent                                            │
└──────────────────────────────────────────────────────────────┘
```

展开状态：

```text
┌──────────────────────────────────────────────────────────────┐
│ AI Trading Analyst                                            │
│ Model: GPT / DeepSeek / Claude       Context: Current Task     │
├──────────────────────────────────────────────────────────────┤
│ User: 为什么这次决策是 Hold？                                  │
│ AI: 当前 RSI 未进入超买/超卖区间，MACD 信号较弱，波动率风险...  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [Ask about this decision...]                         [Send]   │
└──────────────────────────────────────────────────────────────┘
```

快捷问题按钮：

| 中文 | 英文 |
|---|---|
| 为什么是这个决策？ | Why this decision? |
| 解释当前技术指标 | Explain current indicators |
| 当前主要风险是什么？ | What is the main risk? |
| 比较买入 / 卖出 / 持有 | Compare Buy / Sell / Hold |
| 生成交易报告 | Generate trading report |
| 建议下一步操作 | Suggest next action |

大模型上下文建议：

```json
{
  "asset": "SPY",
  "period": ["2020-01-01", "2024-01-01"],
  "strategy_mode": "auto",
  "decision": "hold",
  "confidence": 1.0,
  "indicators": {
    "rsi": 54.2,
    "macd_signal": "weak bullish",
    "volatility": "low"
  },
  "risk": {
    "max_drawdown": 0.0,
    "risk_level": "low"
  },
  "agent_trace": [
    "Loaded market data",
    "Calculated RSI, MACD and volatility",
    "Compared candidate strategies",
    "Checked risk constraints",
    "Final decision: HOLD"
  ]
}
```

---

## 8. 视觉风格规范

由于 ClawLibrary 本身是像素风地图，UI 不适合做过度现代的玻璃拟态。推荐风格：

> 深色控制台 + 像素风边框 + 低饱和高亮色。

推荐颜色：

```css
:root {
  --bg-main: #0b1117;
  --bg-panel: rgba(15, 23, 32, 0.94);
  --bg-card: rgba(21, 31, 42, 0.96);
  --border-soft: #2a3a4a;
  --text-main: #e5e7eb;
  --text-muted: #94a3b8;
  --primary: #36d399;
  --warning: #fbbf24;
  --danger: #fb7185;
  --info: #38bdf8;
}
```

字体建议：

普通 UI：

```css
font-family: Inter, "Microsoft YaHei", sans-serif;
```

日志与代码：

```css
font-family: "JetBrains Mono", "Consolas", monospace;
```

面板规范：

```css
.panel {
  background: rgba(15, 23, 32, 0.94);
  border: 1px solid #2a3a4a;
  border-radius: 8px;
  padding: 14px;
}
```

按钮规范：

```css
.primary-button {
  background: #36d399;
  color: #06110c;
  border-radius: 6px;
  font-weight: 600;
}

.secondary-button {
  background: transparent;
  color: #94a3b8;
  border: 1px solid #2a3a4a;
  border-radius: 6px;
}
```

状态标签：

| 状态 | 建议颜色 |
|---|---|
| Running | info |
| Completed | primary |
| Warning | warning |
| Failed | danger |
| Idle | muted |

---

## 9. 响应式布局建议

桌面端推荐三栏布局：

```css
.dashboard {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  grid-template-rows: 80px 1fr auto;
  gap: 16px;
}
```

中等屏幕：

```css
grid-template-columns: 240px 1fr 280px;
```

小屏幕：

- 隐藏左侧部分非核心指标。
- 右侧变成可折叠抽屉。
- 地图保持优先显示。
- Chat Drawer 默认收起。

---

## 10. 前端组件拆分建议

推荐拆成以下组件：

```text
src/
  components/
    TopBar.tsx
    CurrentTaskPanel.tsx
    DecisionCard.tsx
    PortfolioSnapshot.tsx
    TradingMap.tsx
    RoomTooltip.tsx
    NewAnalysisTaskPanel.tsx
    AgentStatusPanel.tsx
    RuntimeLogPanel.tsx
    ChatDrawer.tsx
    ChatMessage.tsx
    QuickQuestionBar.tsx
```

页面主结构：

```text
TradingDashboard
├── TopBar
├── LeftPanel
│   ├── CurrentTaskPanel
│   ├── DecisionCard
│   ├── PortfolioSnapshot
│   └── KeyReasonsCard
├── TradingMap
│   ├── RoomLayer
│   ├── AgentSprite
│   └── RoomTooltip
├── RightPanel
│   ├── NewAnalysisTaskPanel
│   ├── AgentStatusPanel
│   └── RuntimeLogPanel
└── ChatDrawer
    ├── ChatMessageList
    ├── QuickQuestionBar
    └── ChatInput
```

---

## 11. 页面数据结构建议

当前任务状态：

```ts
type TradingTask = {
  asset: string;
  startDate: string;
  endDate: string;
  mode: "auto" | "momentum" | "mean_reversion" | "risk_averse";
  status: "idle" | "running" | "completed" | "failed";
  progress: number;
};
```

交易决策：

```ts
type TradingDecision = {
  action: "buy" | "sell" | "hold";
  confidence: number;
  reason: string[];
  riskLevel: "low" | "medium" | "high";
};
```

Agent 状态：

```ts
type AgentStatus = {
  name: string;
  room: string;
  status: "idle" | "running" | "done" | "failed";
  message: string;
};
```

大模型消息：

```ts
type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};
```

---

## 12. 推荐交互流程

启动分析：

```text
用户输入资产和参数
  ↓
点击 Run Analysis
  ↓
Agent 从休息室出发
  ↓
进入市场数据室加载数据
  ↓
进入指标实验室计算指标
  ↓
进入策略实验室生成候选策略
  ↓
进入风险报警室检查风险
  ↓
进入决策调度台输出 Buy / Sell / Hold
  ↓
进入报告与分析室生成摘要
  ↓
回到休息室
```

询问大模型：

```text
用户点击 Ask Trading Agent
  ↓
底部 Chat Drawer 展开
  ↓
用户输入问题
  ↓
前端将当前任务上下文 + 用户问题发送到后端
  ↓
后端调用大模型 API
  ↓
返回解释文本
  ↓
显示在 Chat Drawer 中
```

点击房间查看详情：

```text
用户点击地图房间
  ↓
显示房间 Tooltip / Side Detail
  ↓
展示该模块的输入、输出、状态和解释
```

---

## 13. 报告中可使用的系统设计描述

### 中文版

本项目基于 ClawLibrary 的房间式可视化界面，设计了一个量化交易 Agent 控制台。系统将量化交易流程中的市场数据获取、技术指标计算、策略生成、风险检查、交易决策、模拟执行和报告生成分别映射到不同房间。Agent 在房间之间移动的过程对应交易系统的执行流水线，使得原本抽象的算法交易过程变得可观察、可解释、可交互。

此外，系统引入大模型分析助手。用户可以围绕当前交易决策进行自然语言提问，例如询问为什么选择 Hold、当前主要风险是什么、技术指标如何解释等。前端会将当前任务状态、指标结果、风险检查结果和 Agent 执行轨迹作为上下文发送给大模型，从而生成更加贴合当前交易情境的解释。

### English Version

This project builds a quantitative trading agent dashboard based on the room-based visualization interface of ClawLibrary. The workflow of a trading agent, including market data loading, technical indicator calculation, strategy generation, risk checking, trading decision-making, simulated execution, and report generation, is mapped into different rooms. The movement of the agent across rooms visualizes the execution pipeline of the trading system, making the algorithmic trading process more observable, explainable, and interactive.

The system also integrates an LLM-based trading analyst. Users can ask natural-language questions about the current trading decision, such as why the system chooses Hold, what the main risk is, or how the technical indicators should be interpreted. The frontend sends the current task state, indicator results, risk-checking outputs, and agent execution trace as context to the LLM, enabling more context-aware explanations.

---

## 14. 最终建议

优先完成以下改动：

1. 将左侧散乱文字改成正式的 Current Analysis 卡片。
2. 将右侧拆分为 New Analysis Task、Agent Status、Runtime Log 三个模块。
3. 地图房间点击后显示对应模块详情。
4. 添加底部 Chat Drawer，用于接入大模型 API。
5. 统一字体、边框、颜色和状态标签。
6. 减少调试感文字，让界面更像一个完整的量化交易控制台。

最终页面应当形成清晰的信息层级：

> Top Bar 看全局，Left Panel 看结果，Map 看过程，Right Panel 做操作，Chat Drawer 问原因。
