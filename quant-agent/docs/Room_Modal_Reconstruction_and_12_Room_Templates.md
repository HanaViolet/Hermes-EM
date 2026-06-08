# Room Modal 重构文档 + 12 个房间展示模板

> 目标：取消当前底部 Drawer 详情栏，将“房间详情展示”统一重构为页面中央弹出的 Room Modal。  
> 主界面只显示轻量房间摘要，点击任意房间后，在中间弹出完整详情框。  
> 这样可以避免底部栏过扁、信息分散、布局不清晰的问题。

---

## 1. 重构结论

当前 UI 的主要问题不是某个房间的数据不够，而是详情展示方式不适合当前项目。

### 旧方案

```text
点击房间
  ↓
底部 Drawer 展开
  ↓
横向展示 Hero / Metrics / Insight
```

问题：

- 底部栏太扁，详细信息被横向拉开。
- 内容区高度不足，阅读体验差。
- 和主地图抢空间。
- 不符合“进入某个房间查看详情”的交互直觉。

### 新方案

```text
点击房间
  ↓
页面中央弹出 Room Modal
  ↓
Modal 内展示完整 Overview / Timeline / History / AI Explain
```

优势：

- 信息聚焦。
- 中央弹框更符合“查看房间详情”的心理模型。
- 空间更适合展示指标、推理、历史和 AI 解释。
- 所有房间可以复用统一模板。

---

## 2. 整体交互结构

### 2.1 主界面职责

主界面只展示轻量摘要，不展示复杂详情。

每个房间只显示：

```text
房间名
状态
主指标 / 一句话摘要
```

示例：

```text
指标实验室
Done
RSI 56.3
```

```text
策略实验室
Done
Momentum · 82
```

```text
风险报警室
Warning
46/100
```

```text
决策调度台
Done
HOLD
```

### 2.2 Room Modal 职责

Room Modal 负责展示完整信息：

```text
房间名称
状态 / 更新时间
Hero Summary
Key Metrics
Insight
Details
Timeline
History
AI Explain
```

### 2.3 交互流程

```text
用户点击地图上的房间
  ↓
读取对应 room_artifact
  ↓
打开 Room Modal
  ↓
默认进入 Overview Tab
  ↓
用户可切换 Timeline / History / AI Explain
  ↓
点击关闭按钮或 ESC 关闭 Modal
```

---

## 3. Room Modal 总体设计

### 3.1 Modal 尺寸建议

```css
.room-modal {
  width: min(1080px, 86vw);
  max-height: 82vh;
  border-radius: 16px;
}
```

建议尺寸：

| 属性 | 建议 |
|---|---|
| 宽度 | 900px ~ 1100px |
| 高度 | 560px ~ 680px |
| 最大高度 | 82vh |
| 圆角 | 16px |
| 背景 | 深色半透明面板 |
| 遮罩 | rgba(0, 0, 0, 0.55) |
| 内容区 | 可滚动 |

### 3.2 Modal 线框

```text
┌────────────────────────────────────────────────────────────┐
│ 指标实验室                              Done · 15:42:18  × │
├────────────────────────────────────────────────────────────┤
│ Overview   Timeline   History   AI Explain                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Hero Summary                                              │
│  RSI 56.3                                                  │
│  MACD 0.21 · Volatility 18.7%                              │
│  指标信号中性偏弱，暂不支持激进买入                         │
│                                                            │
│  ┌────────┐ ┌────────┐ ┌────────────┐                     │
│  │ RSI    │ │ MACD   │ │ Volatility │                     │
│  │ 56.3   │ │ 0.21   │ │ 18.7%      │                     │
│  │ Neutral│ │ Weak   │ │ Medium     │                     │
│  └────────┘ └────────┘ └────────────┘                     │
│                                                            │
│  Insight                                                   │
│  RSI 处于中性偏强区间，但 MACD 动量不足，波动率中等，       │
│  因此当前指标端不支持激进入场。                             │
│                                                            │
│  Details                                                   │
│  Input: close, volume, returns                             │
│  Output: RSI, MACD, MA20, MA60, Volatility                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Modal 内部信息层级

Room Modal 固定包含四个 Tab：

```text
Overview | Timeline | History | AI Explain
```

### 4.1 Overview Tab

Overview 是默认页面，用于展示当前房间核心信息。

结构：

```text
Header
Hero Summary
Key Metrics
Insight
Details
Actions
```

### 4.2 Timeline Tab

展示当前任务执行路径。

示例：

```text
15:39 市场数据室：加载 1258 条行情数据
15:40 指标实验室：计算 RSI / MACD / Volatility
15:41 策略实验室：生成候选策略 Top3
15:42 风险报警室：风险评分 46/100
15:42 决策调度台：输出 HOLD 决策
```

### 4.3 History Tab

展示最近任务历史或当前房间历史产物。

示例：

```text
MSFT · HOLD · Return 60.98% · Sharpe 0.65
SPY · HOLD · Return 43.2% · Sharpe 0.64
AAPL · BUY · Return 18.4% · Sharpe 1.12
```

### 4.4 AI Explain Tab

当前阶段可以不接真实 LLM，先使用 `artifact.insight` 和 `artifact.details.reasoning` 生成规则解释。

示例：

```text
规则解释模式
当前说明来自 room_artifact.insight。

解释结果：
综合策略得分与风险约束后，当前更适合保持 Hold。

快捷问题：
[为什么是这个结果？] [当前风险是什么？] [哪个策略最好？]
```

---

## 5. 统一 Room Artifact Schema

所有房间都应该使用统一数据结构：

```json
{
  "room_id": "mcp",
  "room_name": "指标实验室",
  "status": "done",
  "type": "indicator",
  "primary": {
    "label": "RSI",
    "value": 56.3,
    "unit": "",
    "level": "neutral"
  },
  "summary": "RSI 56.3 · MACD 0.21",
  "insight": "RSI 处于中性偏强区间，但 MACD 动量不足，波动率中等，因此当前指标端不支持激进入场。",
  "metrics": [
    {
      "label": "RSI",
      "value": 56.3,
      "unit": "",
      "display": "bar",
      "level": "neutral"
    },
    {
      "label": "MACD",
      "value": 0.21,
      "unit": "",
      "display": "number",
      "level": "neutral"
    },
    {
      "label": "Volatility",
      "value": 18.7,
      "unit": "%",
      "display": "bar",
      "level": "warning"
    }
  ],
  "details": {
    "input": ["close", "volume", "returns"],
    "output": ["RSI", "MACD", "MA20", "MA60", "Volatility"],
    "reasoning": [
      "RSI 未进入强超买或超卖区间。",
      "MACD 动量偏弱。",
      "波动率处于中等水平，趋势不够明确。"
    ]
  },
  "updated_at": "15:42:18"
}
```

---

## 6. 状态与颜色规范

| status | 含义 | 主界面表现 | Modal 表现 |
|---|---|---|---|
| `idle` | 未运行 | 灰色点 | 灰色 Badge |
| `active` | 运行中 | 蓝色边框 + pulse | 蓝色 Badge |
| `done` | 完成 | 绿色点 | 绿色 Badge |
| `warning` | 警告 | 黄色点 / 黄色边框 | 黄色 Badge |
| `error` | 失败 | 红色点 / 红色边框 | 红色 Badge |

建议统一 CSS 变量：

```css
:root {
  --status-idle: #64748b;
  --status-active: #38bdf8;
  --status-done: #36d399;
  --status-warning: #fbbf24;
  --status-error: #fb7185;

  --bg-main: #071019;
  --bg-panel: rgba(10, 22, 34, 0.96);
  --bg-card: rgba(15, 30, 44, 0.96);
  --border-soft: rgba(72, 104, 128, 0.45);
  --border-strong: rgba(34, 211, 238, 0.8);

  --text-main: #e5edf5;
  --text-muted: #8ea4b8;
}
```

---

## 7. Modal 组件结构设计

### 7.1 推荐组件拆分

```text
RoomDetailModal
├── RoomModalHeader
├── RoomModalTabs
├── RoomOverviewTab
│   ├── RoomHeroSummary
│   ├── RoomMetricGrid
│   ├── RoomInsightBlock
│   ├── RoomDetailsBlock
│   └── RoomActionBar
├── RoomTimelineTab
├── RoomHistoryTab
└── RoomAIExplainTab
```

### 7.2 TypeScript 类型

```ts
type RoomStatus = "idle" | "active" | "done" | "warning" | "error";

type MetricDisplay =
  | "number"
  | "text"
  | "bar"
  | "gauge"
  | "badge"
  | "strategy_score"
  | "list";

type RoomMetric = {
  label: string;
  value: string | number;
  unit?: string;
  display?: MetricDisplay;
  level?: "positive" | "neutral" | "warning" | "danger";
  signal?: "buy" | "sell" | "hold";
};

type RoomArtifact = {
  room_id: string;
  room_name: string;
  status: RoomStatus;
  type: string;
  primary: {
    label: string;
    value: string | number;
    unit?: string;
    level?: string;
  };
  summary: string;
  insight: string;
  metrics: RoomMetric[];
  details: {
    input?: string[];
    output?: string[];
    reasoning?: string[];
  };
  updated_at: string;
};
```

---

## 8. Modal 样式建议

### 8.1 遮罩

```css
.room-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}
```

### 8.2 Modal 主体

```css
.room-modal {
  width: min(1080px, 86vw);
  max-height: 82vh;
  overflow: hidden;
  border-radius: 16px;
  background: rgba(8, 18, 28, 0.98);
  border: 1px solid rgba(56, 189, 248, 0.28);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.48);
  color: #e5edf5;
}
```

### 8.3 Header

```css
.room-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px 12px;
  border-bottom: 1px solid rgba(72, 104, 128, 0.35);
}

.room-modal-title {
  font-size: 20px;
  font-weight: 800;
}

.room-modal-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  color: #8ea4b8;
  font-size: 12px;
}

.room-modal-close {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(72, 104, 128, 0.5);
  background: rgba(15, 30, 44, 0.8);
  color: #e5edf5;
}
```

### 8.4 Tabs

```css
.room-modal-tabs {
  display: flex;
  gap: 24px;
  padding: 0 22px;
  border-bottom: 1px solid rgba(72, 104, 128, 0.26);
}

.room-modal-tab {
  padding: 12px 0;
  color: #8ea4b8;
  font-size: 13px;
  cursor: pointer;
}

.room-modal-tab.active {
  color: #22d3ee;
  border-bottom: 2px solid #22d3ee;
}
```

### 8.5 Content

```css
.room-modal-content {
  padding: 20px 22px 24px;
  max-height: calc(82vh - 110px);
  overflow-y: auto;
}
```

---

## 9. Overview Tab 布局

### 9.1 推荐布局

```text
┌────────────────────────────────────────────────────────────┐
│ Hero Summary                                               │
├────────────────────────────────────────────────────────────┤
│ Key Metrics                                                │
├────────────────────────────────────────────────────────────┤
│ Insight                                                    │
├────────────────────────────────────────────────────────────┤
│ Details                                                    │
└────────────────────────────────────────────────────────────┘
```

### 9.2 Hero Summary

```css
.room-hero-summary {
  padding: 18px;
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    rgba(34, 211, 238, 0.10),
    rgba(15, 30, 44, 0.92)
  );
  border: 1px solid rgba(34, 211, 238, 0.26);
  margin-bottom: 16px;
}

.room-hero-value {
  font-size: 40px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.room-hero-summary-text {
  margin-top: 10px;
  font-size: 14px;
  color: #cbd5e1;
}

.room-hero-insight {
  margin-top: 10px;
  color: #dbeafe;
  font-size: 14px;
}
```

### 9.3 Metric Grid

```css
.room-metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.room-metric-card {
  padding: 14px;
  border-radius: 12px;
  background: rgba(15, 30, 44, 0.88);
  border: 1px solid rgba(72, 104, 128, 0.42);
}

.room-metric-label {
  font-size: 12px;
  color: #8ea4b8;
}

.room-metric-value {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 800;
}
```

### 9.4 Insight Block

```css
.room-insight-block {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(34, 211, 238, 0.07);
  border-left: 3px solid rgba(34, 211, 238, 0.85);
  margin-bottom: 16px;
}

.room-insight-title {
  font-size: 13px;
  font-weight: 700;
  color: #67e8f9;
  margin-bottom: 8px;
}

.room-insight-text {
  font-size: 14px;
  line-height: 1.7;
  color: #dbeafe;
}
```

### 9.5 Details Block

```css
.room-details-block {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr;
  gap: 12px;
}

.room-detail-card {
  padding: 14px;
  border-radius: 12px;
  background: rgba(8, 18, 28, 0.72);
  border: 1px solid rgba(72, 104, 128, 0.35);
}

.room-detail-title {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.room-detail-list {
  margin: 0;
  padding-left: 16px;
  font-size: 13px;
  line-height: 1.6;
}
```

---

## 10. Metric Renderer

### 10.1 通用渲染规则

```ts
function MetricRenderer({ metric }: { metric: RoomMetric }) {
  switch (metric.display) {
    case "bar":
      return <MetricBar metric={metric} />;
    case "gauge":
      return <MetricGauge metric={metric} />;
    case "badge":
      return <MetricBadge metric={metric} />;
    case "strategy_score":
      return <StrategyScore metric={metric} />;
    case "text":
      return <MetricText metric={metric} />;
    default:
      return <MetricNumber metric={metric} />;
  }
}
```

### 10.2 MetricBar

```text
Confidence   ██████░░░░ 62%
```

### 10.3 MetricGauge

```text
Risk Score   46/100
Low ━━━━━━━━●━━━━ High
```

### 10.4 MetricBadge

```text
Decision   HOLD
```

### 10.5 StrategyScore

```text
Momentum        82   HOLD
Mean Reversion  68   BUY
MA Crossover    61   HOLD
```

---

## 11. 主界面房间轻量卡设计

Modal 负责详情后，主界面房间卡必须变轻。

### 11.1 轻量卡格式

```text
┌──────────────────┐
│ 指标实验室        │
│ Done             │
│ RSI 56.3         │
└──────────────────┘
```

### 11.2 不同状态示例

```text
idle:
○ 图表分析室
Waiting

active:
◉ 策略实验室
Running...

done:
● 指标实验室
RSI 56.3

warning:
⚠ 风险报警室
46/100

error:
✕ 市场数据室
Failed
```

### 11.3 主界面房间卡样式

```css
.room-mini-card {
  min-width: 120px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(8, 18, 28, 0.76);
  border: 1px solid rgba(72, 104, 128, 0.42);
  color: #e5edf5;
  cursor: pointer;
}

.room-mini-card.active {
  border-color: var(--status-active);
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.35);
  animation: roomPulse 1.2s ease-in-out infinite;
}

.room-mini-card.warning {
  border-color: var(--status-warning);
}

.room-mini-card.error {
  border-color: var(--status-error);
}

.room-mini-title {
  font-size: 12px;
  font-weight: 700;
}

.room-mini-primary {
  margin-top: 4px;
  font-size: 11px;
  color: #94a3b8;
}
```

---

# 12 个房间展示模板

下面给出 12 个房间的最终展示模板，均使用同一 Modal 骨架。

---

## 12.1 市场数据室 `gateway`

### 主界面轻量卡

```text
市场数据室
Done
1258 bars
```

### Modal Hero

```text
1258 bars
2020-01-01 ~ 2024-12-31
行情数据完整，可以支持后续指标计算与策略回测。
```

### Key Metrics

| Label | Value | Display | Level |
|---|---:|---|---|
| 数据条数 | 1258 | number | positive |
| 数据完整度 | 100% | bar | positive |
| 缺失值 | 0 | number | positive |
| 最新收盘 | 528.31 | number | neutral |

### Insight

```text
行情数据完整，无明显缺失，可以支持后续指标计算、策略生成和回测评估。
```

### Details

```text
Input:
- Asset symbol
- Start date
- End date

Output:
- OHLCV data
- Returns
- Trading calendar

Reasoning:
- 数据区间满足任务要求。
- 缺失值为 0，不需要额外插值处理。
- 最新收盘价可作为后续指标计算基础。
```

---

## 12.2 指标实验室 `mcp`

### 主界面轻量卡

```text
指标实验室
Done
RSI 56.3
```

### Modal Hero

```text
RSI 56.3
MACD 0.21 · Volatility 18.7%
指标信号中性偏弱，暂不支持激进买入。
```

### Key Metrics

| Label | Value | Display | Level |
|---|---:|---|---|
| RSI | 56.3 | bar | neutral |
| MACD | 0.21 | number | neutral |
| MA20 | 599.54 | number | positive |
| MA60 | 590.47 | number | neutral |
| Volatility | 18.7% | bar | warning |

### Insight

```text
RSI 处于中性偏强区间，但 MACD 动量不足，波动率处于中等水平，因此当前指标端不支持激进入场。
```

### Details

```text
Input:
- Close price
- Volume
- Returns

Output:
- RSI
- MACD
- MA20
- MA60
- Volatility

Reasoning:
- RSI 未进入强超买或超卖区间。
- MACD 信号偏弱，趋势确认不足。
- 波动率中等，短期方向仍需等待确认。
```

---

## 12.3 策略实验室 `skills`

### 主界面轻量卡

```text
策略实验室
Done
Momentum · 82
```

### Modal Hero

```text
Momentum · Score 82
Top Strategy
动量策略得分最高，但优势不明显，建议结合风险结果保守决策。
```

### Key Metrics

| Label | Value | Display | Signal |
|---|---:|---|---|
| Momentum | 82 | strategy_score | hold |
| Mean Reversion | 68 | strategy_score | buy |
| MA Crossover | 61 | strategy_score | hold |

### Insight

```text
动量策略得分最高，但与其他候选策略的差距不大，说明当前市场并没有形成非常强的一致性信号。
```

### Details

```text
Input:
- Indicators
- Strategy rules
- Historical signals

Output:
- Candidate strategies
- Strategy scores
- Strategy signals

Reasoning:
- 动量策略获得最高分。
- 均值回归存在一定机会，但信号不够强。
- 多策略综合后更适合保持谨慎。
```

---

## 12.4 策略记忆库 `memory`

### 主界面轻量卡

```text
策略记忆库
Done
6 records
```

### Modal Hero

```text
6 historical records
Past strategy memory loaded
历史策略记录可用于当前策略对比。
```

### Key Metrics

| Label | Value | Display | Level |
|---|---:|---|---|
| 历史策略数 | 6 | number | neutral |
| 最近决策 | HOLD | badge | warning |
| 最优策略 | Momentum | badge | positive |

### Insight

```text
历史记录显示 Momentum 策略在近期表现相对稳定，但在高回撤环境下应降低仓位。
```

### Details

```text
Input:
- Past strategy records
- Historical decisions
- Previous backtest results

Output:
- Strategy memory summary
- Comparable historical cases

Reasoning:
- 当前市场状态与历史中性趋势阶段相似。
- 历史结果支持谨慎使用动量策略。
```

---

## 12.5 图表分析室 `images`

### 主界面轻量卡

```text
图表分析室
Done
Charts ready
```

### Modal Hero

```text
Charts Ready
Price trend · Return curve · Indicator view
图表结果已生成，可辅助判断趋势和风险。
```

### Key Metrics

| Label | Value | Display | Level |
|---|---:|---|---|
| 图表数量 | 3 | number | positive |
| 价格趋势 | Neutral | badge | neutral |
| 收益曲线 | Available | badge | positive |

### Insight

```text
价格图和收益曲线显示趋势并不极端，当前更适合结合指标和风险结果进行保守判断。
```

### Details

```text
Input:
- OHLCV data
- Indicator results
- Backtest returns

Output:
- Price chart
- Return curve
- Indicator chart

Reasoning:
- 图表用于辅助理解模型输出。
- 当前图表未显示强烈突破趋势。
```

---

## 12.6 风险报警室 `alarm`

### 主界面轻量卡

```text
风险报警室
Warning
46/100
```

### Modal Hero

```text
Risk 46/100
Medium Risk
最大回撤偏高，建议降低仓位或保持观望。
```

### Key Metrics

| Label | Value | Display | Level |
|---|---:|---|---|
| Risk Score | 46/100 | gauge | warning |
| Max Drawdown | -22.5% | bar | danger |
| Volatility | 18.7% | bar | warning |
| Position Risk | Acceptable | badge | neutral |

### Insight

```text
当前风险处于中等水平，最大回撤偏高，因此不建议激进加仓。
```

### Details

```text
Input:
- Returns
- Drawdown
- Volatility
- Candidate strategies

Output:
- Risk score
- Risk level
- Position constraint

Reasoning:
- 最大回撤对最终决策形成限制。
- 波动率中等偏高。
- 风险结果支持 Hold 或降低仓位。
```

---

## 12.7 决策调度台 `schedule`

### 主界面轻量卡

```text
决策调度台
Done
HOLD
```

### Modal Hero

```text
HOLD
Confidence 62% · Position 35%
综合风险与策略后，当前更适合保持观望。
```

### Key Metrics

| Label | Value | Display | Level |
|---|---:|---|---|
| Decision | HOLD | badge | warning |
| Confidence | 62% | bar | neutral |
| Suggested Position | 35% | bar | neutral |
| Top Strategy | Momentum | badge | positive |

### Insight

```text
综合策略得分、风险约束和指标信号后，当前更适合保持 Hold，而不是主动加仓。
```

### Details

```text
Input:
- Strategy scores
- Risk result
- Indicator result
- Backtest summary

Output:
- Final decision
- Confidence
- Suggested position

Reasoning:
- 动量策略得分最高，但优势不明显。
- 风险分数处于中等水平。
- 当前指标信号不足以支持主动加仓。
```

---

## 12.8 执行日志台 `log`

### 主界面轻量卡

```text
执行日志台
Done
No order
```

### Modal Hero

```text
No order executed
Simulated execution only
由于最终决策为 HOLD，本轮没有产生真实买卖动作。
```

### Key Metrics

| Label | Value | Display | Level |
|---|---:|---|---|
| Orders | 0 | number | neutral |
| Execution Mode | Simulated | badge | neutral |
| Last Action | HOLD | badge | warning |

### Insight

```text
当前决策为 Hold，因此执行模块没有生成买入或卖出订单，系统仅记录模拟执行状态。
```

### Details

```text
Input:
- Final decision
- Suggested position
- Execution rules

Output:
- Order log
- Execution status

Reasoning:
- HOLD 决策不会触发买入或卖出。
- 本次执行结果仅用于模拟记录。
```

---

## 12.9 运行监控室 `agent`

### 主界面轻量卡

```text
运行监控室
Done
6 agents done
```

### Modal Hero

```text
6 agents done
Workflow completed
所有核心 Agent 均已完成当前交易分析任务。
```

### Key Metrics

| Label | Value | Display | Level |
|---|---:|---|---|
| Data Agent | Done | badge | positive |
| Indicator Agent | Done | badge | positive |
| Strategy Agent | Done | badge | positive |
| Risk Agent | Done | badge | positive |
| Decision Agent | Done | badge | positive |
| Report Agent | Done | badge | positive |

### Insight

```text
当前交易分析流水线已完整执行，所有核心 Agent 状态正常。
```

### Details

```text
Input:
- Workflow stages
- Agent status events

Output:
- Agent status summary
- Workflow status

Reasoning:
- 每个 Agent 都完成了对应阶段。
- 未检测到执行错误。
```

---

## 12.10 报告与分析室 `document`

### 主界面轻量卡

```text
报告与分析室
Done
Report ready
```

### Modal Hero

```text
Report Ready
Markdown summary generated
本次交易分析报告已生成，可用于作业展示。
```

### Key Metrics

| Label | Value | Display | Level |
|---|---:|---|---|
| Format | Markdown | badge | positive |
| Sections | 5 | number | positive |
| Decision | HOLD | badge | warning |
| Sharpe | 0.64 | number | neutral |

### Insight

```text
报告已整合市场数据、指标、策略、风险和最终决策，适合作为本次任务的分析摘要。
```

### Details

```text
Input:
- Task summary
- Indicators
- Strategy scores
- Risk result
- Final decision

Output:
- Trading report
- Markdown summary

Reasoning:
- 报告内容覆盖交易决策所需的主要模块。
- 可直接用于项目展示或结果说明。
```

---

## 12.11 回测评估室 `task_queues`

### 主界面轻量卡

```text
回测评估室
Done
Return 43.2%
```

### Modal Hero

```text
Return 43.2%
Sharpe 0.64 · Max Drawdown -22.5%
回测收益较高，但风险和回撤不可忽视。
```

### Key Metrics

| Label | Value | Display | Level |
|---|---:|---|---|
| Total Return | 43.2% | bar | positive |
| Sharpe | 0.64 | number | neutral |
| Max Drawdown | -22.5% | bar | danger |
| Win Rate | 52% | bar | neutral |

### Insight

```text
回测结果显示收益表现较好，但 Sharpe 不高且最大回撤较大，因此不能仅凭收益做出激进买入决策。
```

### Details

```text
Input:
- Strategy signal
- Price data
- Risk rules

Output:
- Total return
- Sharpe ratio
- Max drawdown
- Win rate

Reasoning:
- 收益表现较好。
- 风险调整后表现一般。
- 最大回撤对最终决策形成明显约束。
```

---

## 12.12 休息室 `break_room`

### 主界面轻量卡

```text
休息室
Idle
Last: HOLD
```

### Modal Hero

```text
Idle
Last Task: MSFT · HOLD
Agent 当前处于空闲状态，等待下一次分析任务。
```

### Key Metrics

| Label | Value | Display | Level |
|---|---:|---|---|
| Last Asset | MSFT | text | neutral |
| Last Decision | HOLD | badge | warning |
| Completed Tasks | 1 | number | positive |

### Insight

```text
上一轮分析已完成，Agent 当前处于等待状态，可以开始新的资产分析任务。
```

### Details

```text
Input:
- Previous task state
- Current workflow status

Output:
- Idle status
- Last task summary

Reasoning:
- 当前没有正在执行的任务。
- 系统已准备好接受新的分析请求。
```

---

## 13. 前端实现建议

### 13.1 状态管理

需要在前端维护：

```ts
const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
const [roomModalOpen, setRoomModalOpen] = useState(false);
const [roomModalTab, setRoomModalTab] = useState<"overview" | "timeline" | "history" | "ai">("overview");
```

点击房间时：

```ts
function handleRoomClick(roomId: string) {
  setSelectedRoomId(roomId);
  setRoomModalTab("overview");
  setRoomModalOpen(true);
}
```

### 13.2 获取 Artifact

```ts
function getRoomArtifact(roomId: string): RoomArtifact | null {
  return lastSnapshot?.trading?.room_artifacts?.[roomId] ?? null;
}
```

### 13.3 Modal 渲染

```tsx
{roomModalOpen && selectedRoomId && (
  <RoomDetailModal
    artifact={getRoomArtifact(selectedRoomId)}
    activeTab={roomModalTab}
    onTabChange={setRoomModalTab}
    onClose={() => setRoomModalOpen(false)}
  />
)}
```

---

## 14. 验收标准

完成后检查：

```text
[ ] 底部 Drawer 不再作为主要详情展示
[ ] 点击任意房间会在页面中央打开 Modal
[ ] Modal 默认进入 Overview Tab
[ ] Modal 有 Header / Tabs / Hero / Metrics / Insight / Details
[ ] 12 个房间均有对应展示模板
[ ] 主界面房间卡只显示轻量摘要
[ ] active / done / warning / error / idle 颜色正确
[ ] ESC 和关闭按钮可以关闭 Modal
[ ] 没有 undefined / null 显示
[ ] AI Explain 当前可用 insight 做规则解释
```

---

## 15. 最终总结

这次重构的核心是：

```text
主界面：轻量状态摘要
Room Modal：完整房间详情
```

不要再把详细信息塞进底部栏，也不要让房间详情继续使用资源列表页模板。

最终目标：

```text
房间 = 状态 + 主摘要 + 点击查看完整分析
Modal = Hero + Metrics + Insight + Details + Timeline + History + AI Explain
```

这样整个量化交易 Agent 控制室会更像一个真正的产品，而不是一个带有交易数据的资源浏览器。
