# 量化交易 Agent 控制室 UI 改进档案

> 目标：重点优化两个区域：各个“室”的显示面板，以及底部详情栏 / Drawer。核心原则是把房间从“流程节点”升级为“信息节点”，让用户能快速看懂每个房间产生了什么结果、当前状态如何、为什么得到这个结论。

---

## 1. 当前问题诊断

### 1.1 房间显示面板的问题

当前房间面板存在以下问题：

1. **信息结构像文档列表，不像交易模块面板**  
   当前显示方式偏向“文档 / 资源列表”，例如 `3 文档`、`STATUS / SOURCE / SIGNAL / FOCUS`，不适合表达交易 Agent 的房间产物。

2. **卡片内容重复**  
   多个卡片都重复类似文本：`SPY auto 策略分析完成，决策为 HOLD。`  
   这导致每张卡没有独立信息价值。

3. **房间重点不明确**  
   用户无法第一眼判断当前是哪个房间、当前房间的核心结论是什么、哪些指标支撑这个结论、下一步可以查看什么。

4. **数据显示缺乏层级**  
   所有信息以平铺方式出现，没有形成主结论、核心指标、解释理由、操作入口。

### 1.2 底部栏的问题

当前底部栏存在以下问题：

1. **两层横向 Tab 导航混乱**  
   当前有类似 `Room Details / Timeline / History / AI Chat` 和 `Summary / Metrics / Decision` 两层 Tab 横向展开，导航关系不清晰。

2. **内容区过于扁平**  
   底部栏宽度很大，但高度有限，信息横向铺开，阅读体验差。

3. **左侧信息和右侧解释没有形成完整结构**  
   左侧显示状态和决策，右侧显示 insight，但两者之间没有明确的信息关系。

4. **视觉上显得空且散**  
   大面积留白，但有效信息很少，用户会感觉详情栏没有真正用起来。

---

## 2. 改进目标

### 2.1 房间面板目标

房间面板应该回答四个问题：

```text
这个房间是什么？
当前状态是什么？
它产生了什么核心结果？
为什么得到这个结果？
```

因此，每个房间面板应统一为：

```text
房间名 + 状态
核心结论 Hero
关键指标卡片
Insight / Reasoning
操作入口
```

### 2.2 底部栏目标

底部栏应该作为“房间详情页”，承担更完整的信息展示：

```text
概览信息
核心指标
推理解释
执行时间线
历史记录
AI 解释入口
```

底部栏不再做“杂乱横向 Tab”，而是采用：

```text
单层主 Tab + 纵向内容分区
```

---

## 3. 统一数据输入：Room Artifact

所有 UI 优化都应基于统一的 `room_artifact` 数据结构。

### 3.1 推荐 Schema

```json
{
  "room_id": "schedule",
  "room_name": "决策调度台",
  "status": "done",
  "type": "decision",
  "primary": {
    "label": "Decision",
    "value": "HOLD",
    "unit": "",
    "level": "warning"
  },
  "summary": "HOLD · Conf 62%",
  "insight": "综合策略得分与风险约束后，当前更适合保持 Hold，而不是主动加仓。",
  "metrics": [
    {
      "label": "Confidence",
      "value": 62,
      "unit": "%",
      "display": "bar",
      "level": "neutral"
    },
    {
      "label": "Risk Score",
      "value": 46,
      "unit": "/100",
      "display": "gauge",
      "level": "warning"
    },
    {
      "label": "Top Strategy",
      "value": "Momentum",
      "unit": "",
      "display": "badge",
      "level": "positive"
    }
  ],
  "details": {
    "input": ["strategy_scores", "risk_result", "indicator_result"],
    "output": ["final_decision", "confidence", "suggested_position"],
    "reasoning": [
      "动量策略得分最高，但优势不明显。",
      "风险分数处于中等水平。",
      "当前指标信号不足以支持主动加仓。"
    ]
  },
  "updated_at": "15:42:22"
}
```

### 3.2 字段作用

| 字段 | 用途 |
|---|---|
| `room_id` | 对应 ClawLibrary 房间 ID |
| `room_name` | UI 显示名称 |
| `status` | 控制状态颜色 |
| `type` | 控制房间面板模板 |
| `primary` | 地图 mini-card 和房间 Hero 主指标 |
| `summary` | 右侧列表和面板摘要 |
| `insight` | 智能解释 / 规则解释 |
| `metrics` | 核心指标卡片 |
| `details` | 底部栏详细内容 |
| `updated_at` | 更新时间 |

---

## 4. 房间显示面板优化方案

### 4.1 总体结构

推荐将房间显示面板统一改为下面结构：

```text
┌──────────────────────────────┐
│ 决策调度台                    │
│ Done · Updated 15:42:22      │
├──────────────────────────────┤
│ HOLD                         │
│ 置信度 62% · 仓位 35%         │
│ 综合风险与策略后建议观望      │
├──────────────────────────────┤
│ [指标卡1] [指标卡2] [指标卡3] │
│ Confidence Risk Top Strategy │
├──────────────────────────────┤
│ Insight / Reasoning          │
├──────────────────────────────┤
│ [查看详情] [解释此结果]       │
└──────────────────────────────┘
```

该结构分为五个区域：

1. Header：房间名、状态、更新时间；
2. Hero：核心结论；
3. Metrics：关键指标卡；
4. Insight：自然语言解释；
5. Actions：操作按钮。

---

## 5. 房间面板布局细节

### 5.1 Header 区

#### 目标

快速告诉用户：

```text
当前是哪个房间？
状态是什么？
什么时候更新？
```

#### 示例

```text
决策调度台
Done · Updated 15:42:22
```

#### 样式建议

```css
.room-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.room-panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #e5edf5;
}

.room-panel-meta {
  font-size: 12px;
  color: #8ea4b8;
}
```

### 5.2 Hero Summary 区

#### 目标

让用户第一眼看到房间最重要的结论。

#### 决策调度台示例

```text
HOLD
置信度 62% · 仓位 35%
综合风险与策略后建议观望
```

#### 指标实验室示例

```text
RSI 56.3
MACD 0.21 · Volatility 18.7%
指标信号中性偏弱，暂不支持激进买入
```

#### 风险报警室示例

```text
Risk 46/100
Medium Risk
最大回撤较高，建议降低仓位
```

#### 样式建议

```css
.room-hero {
  padding: 16px;
  border-radius: 12px;
  background: rgba(14, 30, 44, 0.96);
  border: 1px solid rgba(34, 211, 238, 0.25);
  margin-bottom: 12px;
}

.room-hero-value {
  font-size: 32px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.room-hero-subtitle {
  margin-top: 8px;
  font-size: 13px;
  color: #94a3b8;
}

.room-hero-insight {
  margin-top: 10px;
  font-size: 13px;
  color: #dbeafe;
}
```

### 5.3 Key Metrics 区

#### 目标

把核心指标拆成 3 到 4 张小卡片，避免长列表。

#### 决策调度台示例

```text
┌────────────┐ ┌────────────┐ ┌──────────────┐
│ Confidence │ │ Risk Score │ │ Top Strategy │
│ 62%        │ │ 46/100     │ │ Momentum     │
└────────────┘ └────────────┘ └──────────────┘
```

#### 指标实验室示例

```text
┌──────┐ ┌──────┐ ┌────────────┐
│ RSI  │ │ MACD │ │ Volatility │
│ 56.3 │ │ 0.21 │ │ 18.7%      │
└──────┘ └──────┘ └────────────┘
```

#### 样式建议

```css
.room-metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.room-metric-card {
  padding: 10px;
  border-radius: 10px;
  background: rgba(8, 18, 28, 0.78);
  border: 1px solid rgba(72, 104, 128, 0.4);
}

.room-metric-label {
  font-size: 11px;
  color: #8ea4b8;
}

.room-metric-value {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #e5edf5;
}
```

### 5.4 Insight / Reasoning 区

#### 目标

强化“智能感”，让每个房间都有一句可解释判断。

#### 示例

```text
综合策略得分与风险约束后，当前更适合保持 Hold，而不是主动加仓。
```

#### 如果有 reasoning 列表：

```text
推理依据
1. 动量策略得分最高，但优势不明显。
2. 风险分数处于中等水平。
3. 当前指标信号不足以支持主动加仓。
```

#### 样式建议

```css
.room-insight {
  padding: 12px;
  border-radius: 10px;
  background: rgba(34, 211, 238, 0.06);
  border-left: 3px solid rgba(34, 211, 238, 0.8);
  font-size: 13px;
  line-height: 1.6;
  color: #dbeafe;
}
```

### 5.5 Actions 区

#### 推荐按钮

```text
查看详情
解释此结果
查看历史
```

#### 注意

不要写 `LLM Coming Soon`。建议先用规则解释：

```text
解释此结果
```

点击后弹出：

```text
当前为规则解释模式：综合策略得分与风险约束后，当前更适合保持 Hold。
```

#### 样式建议

```css
.room-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.room-action-primary {
  background: #22d3ee;
  color: #06111a;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 700;
}

.room-action-secondary {
  background: transparent;
  color: #94a3b8;
  border: 1px solid rgba(72, 104, 128, 0.5);
  border-radius: 8px;
  padding: 8px 12px;
}
```

---

## 6. 不同房间的面板模板

### 6.1 决策调度台

```text
┌──────────────────────────────┐
│ 决策调度台                    │
│ Done · Updated 15:42:22      │
├──────────────────────────────┤
│ HOLD                         │
│ 置信度 62% · 仓位 35%         │
│ 综合风险与策略后建议观望      │
├──────────────────────────────┤
│ Confidence   Risk   Strategy │
│ 62%          46/100 Momentum │
├──────────────────────────────┤
│ Insight                      │
│ 当前更适合保持 Hold。          │
└──────────────────────────────┘
```

### 6.2 指标实验室

```text
┌──────────────────────────────┐
│ 指标实验室                    │
│ Done · Updated 15:42:18      │
├──────────────────────────────┤
│ RSI 56.3                     │
│ MACD 0.21 · Vol 18.7%        │
│ 指标端暂不支持强买入          │
├──────────────────────────────┤
│ RSI        MACD      Vol     │
│ 56.3       0.21      18.7%   │
├──────────────────────────────┤
│ Insight                      │
│ RSI 中性偏强，但趋势确认不足。 │
└──────────────────────────────┘
```

### 6.3 策略实验室

```text
┌──────────────────────────────┐
│ 策略实验室                    │
│ Done · Updated 15:42:05      │
├──────────────────────────────┤
│ Momentum · 82                │
│ Top Strategy                 │
│ 候选策略差距不大，建议保守     │
├──────────────────────────────┤
│ Momentum    Reversal   MA    │
│ 82 HOLD     68 BUY     61 HOLD│
├──────────────────────────────┤
│ Insight                      │
│ 动量策略最高，但优势不明显。   │
└──────────────────────────────┘
```

### 6.4 风险报警室

```text
┌──────────────────────────────┐
│ 风险报警室                    │
│ Warning · Updated 15:42:10   │
├──────────────────────────────┤
│ Risk 46/100                  │
│ Medium Risk                  │
│ 最大回撤偏高，建议降低仓位     │
├──────────────────────────────┤
│ Risk       Drawdown    Vol   │
│ 46/100     -22.5%      18.7% │
├──────────────────────────────┤
│ Insight                      │
│ 当前风险中等偏高，不建议激进。 │
└──────────────────────────────┘
```

### 6.5 报告与分析室

```text
┌──────────────────────────────┐
│ 报告与分析室                  │
│ Done · Updated 15:42:30      │
├──────────────────────────────┤
│ Report Ready                 │
│ Markdown · Summary Generated │
│ 分析报告已生成，可复制导出      │
├──────────────────────────────┤
│ Sections    Format    Length │
│ 5           MD        820字   │
├──────────────────────────────┤
│ Insight                      │
│ 本次结果适合保守展示。          │
└──────────────────────────────┘
```

---

## 7. 底部栏优化方案

### 7.1 总体结构

底部栏采用：

```text
单层主 Tab + 垂直内容分区
```

主 Tab：

```text
概览 | 时间轴 | 历史 | AI解释
```

不要再使用第二层横向 Tab。

---

## 8. 底部栏推荐布局

```text
┌────────────────────────────────────────────────────────────────────┐
│ 概览 | 时间轴 | 历史 | AI解释                         Close │
├────────────────────────────────────────────────────────────────────┤
│ 决策调度台                                  Done · Updated 15:42:22 │
├───────────────────────┬──────────────────────┬─────────────────────┤
│ Hero Summary           │ Key Metrics           │ Insight             │
│ HOLD                   │ Confidence 62%         │ 综合风险与策略后...  │
│ 置信度 62% · 仓位 35%  │ Risk 46/100            │ 1. 动量策略优势不... │
│ 当前建议保持观望       │ Top Strategy Momentum  │ 2. 风险处于中等...   │
├───────────────────────┴──────────────────────┴─────────────────────┤
│ Details                                                           │
│ Input: strategy_scores, risk_result, indicator_result              │
│ Output: final_decision, confidence, suggested_position             │
└────────────────────────────────────────────────────────────────────┘
```

### 8.1 为什么这样更好

1. 横向三列正好适合底部栏的宽屏比例；
2. Hero / Metrics / Insight 分工明确；
3. Details 放在下方，避免抢占主视觉；
4. 不再出现两层 Tab 的混乱；
5. 每个房间都可以复用同一模板。

---

## 9. 底部栏具体分区

### 9.1 顶部 Tab

```text
概览 | 时间轴 | 历史 | AI解释
```

#### 样式建议

```css
.drawer-tabs {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid rgba(72, 104, 128, 0.35);
}

.drawer-tab {
  padding: 10px 4px;
  font-size: 13px;
  color: #8ea4b8;
}

.drawer-tab.active {
  color: #22d3ee;
  border-bottom: 2px solid #22d3ee;
}
```

### 9.2 Drawer Header

```text
决策调度台                          Done · Updated 15:42:22
```

#### 样式建议

```css
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.drawer-title {
  font-size: 16px;
  font-weight: 700;
}

.drawer-meta {
  font-size: 12px;
  color: #8ea4b8;
}
```

### 9.3 Overview 三列布局

```text
Hero Summary | Key Metrics | Insight
```

#### 样式建议

```css
.drawer-overview-grid {
  display: grid;
  grid-template-columns: 1.1fr 1.4fr 1.6fr;
  gap: 12px;
}
```

### 9.4 Hero Summary

```text
HOLD
置信度 62% · 仓位 35%
当前建议保持观望
```

```css
.drawer-hero {
  padding: 14px;
  border-radius: 12px;
  background: rgba(14, 30, 44, 0.96);
  border: 1px solid rgba(34, 211, 238, 0.25);
}

.drawer-hero-value {
  font-size: 34px;
  font-weight: 800;
}

.drawer-hero-meta {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 13px;
}
```

### 9.5 Key Metrics

```text
Confidence      ██████░░░░ 62%
Risk Score      ████░░░░░░ 46/100
Top Strategy    Momentum
```

```css
.drawer-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-row {
  display: grid;
  grid-template-columns: 120px 1fr 64px;
  gap: 8px;
  align-items: center;
}

.metric-bar-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
}

.metric-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: #22d3ee;
}
```

### 9.6 Insight

```text
智能解释
综合策略得分与风险约束后，当前更适合保持 Hold。

推理依据
1. 动量策略得分最高，但优势不明显。
2. 风险分数处于中等水平。
3. 当前指标信号不足以支持主动加仓。
```

```css
.drawer-insight {
  padding: 14px;
  border-radius: 12px;
  background: rgba(34, 211, 238, 0.06);
  border-left: 3px solid rgba(34, 211, 238, 0.8);
  font-size: 13px;
  line-height: 1.6;
}
```

### 9.7 Details

```text
Input:
strategy_scores, risk_result, indicator_result

Output:
final_decision, confidence, suggested_position
```

```css
.drawer-details {
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(8, 18, 28, 0.72);
  border: 1px solid rgba(72, 104, 128, 0.35);
}

.drawer-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
```

---

## 10. 底部栏各 Tab 内容设计

### 10.1 概览 Tab

用于展示当前房间核心信息。

结构：

```text
Header
Hero Summary
Key Metrics
Insight
Details
```

### 10.2 时间轴 Tab

用于展示当前任务执行路径。

```text
15:39 市场数据室：加载 1258 条行情数据
15:40 指标实验室：计算 RSI / MACD / Volatility
15:41 策略实验室：生成候选策略 Top3
15:42 风险报警室：风险评分 46/100
15:42 决策调度台：输出 HOLD 决策
```

样式建议：

```css
.timeline-item {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(72, 104, 128, 0.25);
}

.timeline-time {
  color: #94a3b8;
  font-family: monospace;
}

.timeline-content {
  color: #e5edf5;
}
```

### 10.3 历史 Tab

展示最近任务历史：

```text
MSFT · HOLD · Return 60.98% · Sharpe 0.65
SPY · HOLD · Return 43.2% · Sharpe 0.64
AAPL · BUY · Return 18.4% · Sharpe 1.12
```

### 10.4 AI解释 Tab

当前阶段不接 LLM，使用 insight 驱动：

```text
规则解释模式
当前说明来自 artifact.insight。

解释结果：
综合策略得分与风险约束后，当前更适合保持 Hold。

快捷问题：
[为什么是 Hold？] [当前风险是什么？] [哪个策略最好？]
```

---

## 11. Metric Renderer 设计

为了避免每个房间硬编码，建议统一实现：

```ts
function MetricRenderer({ metric }) {
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

### 11.1 display 类型

| display | 用途 |
|---|---|
| `number` | 普通数值 |
| `text` | 文本 |
| `bar` | 百分比 / 进度条 |
| `gauge` | 风险分数 |
| `badge` | 决策 / 等级 |
| `strategy_score` | 策略得分卡 |
| `list` | 列表型信息 |

---

## 12. 状态颜色规范

| status | 含义 | 视觉表现 |
|---|---|---|
| `idle` | 未运行 | 灰色点 |
| `active` | 运行中 | 蓝色边框 + pulse |
| `done` | 完成 | 绿色点 |
| `warning` | 警告 | 黄色点 / 黄色边框 |
| `error` | 失败 | 红色点 / 红色边框 |

### CSS 变量

```css
:root {
  --status-idle: #64748b;
  --status-active: #38bdf8;
  --status-done: #36d399;
  --status-warning: #fbbf24;
  --status-error: #fb7185;
}
```

---

## 13. 房间面板组件设计

建议实现一个通用组件：

```tsx
type RoomOverviewPanelProps = {
  artifact: RoomArtifact;
  onOpenDetails: () => void;
  onExplain: () => void;
  onOpenHistory: () => void;
};

function RoomOverviewPanel({
  artifact,
  onOpenDetails,
  onExplain,
  onOpenHistory,
}: RoomOverviewPanelProps) {
  return (
    <section className="room-overview-panel">
      <RoomPanelHeader artifact={artifact} />
      <RoomHero artifact={artifact} />
      <RoomMetricCards metrics={artifact.metrics.slice(0, 3)} />
      <RoomInsight artifact={artifact} />
      <RoomActions
        onOpenDetails={onOpenDetails}
        onExplain={onExplain}
        onOpenHistory={onOpenHistory}
      />
    </section>
  );
}
```

---

## 14. 底部栏组件设计

建议实现：

```tsx
function BottomRoomDrawer({
  artifact,
  activeTab,
  onTabChange,
}: {
  artifact: RoomArtifact;
  activeTab: "overview" | "timeline" | "history" | "ai";
  onTabChange: (tab: string) => void;
}) {
  return (
    <section className="bottom-room-drawer">
      <DrawerTabs activeTab={activeTab} onChange={onTabChange} />
      <DrawerHeader artifact={artifact} />

      {activeTab === "overview" && <DrawerOverview artifact={artifact} />}
      {activeTab === "timeline" && <DrawerTimeline />}
      {activeTab === "history" && <DrawerHistory />}
      {activeTab === "ai" && <DrawerAI artifact={artifact} />}
    </section>
  );
}
```

---

## 15. 优先改造顺序

### Phase 1：房间面板结构重做

```text
[ ] 删除 STATUS / SOURCE / SIGNAL / FOCUS 这类 generic 区块
[ ] 删除 “3 文档” 计数逻辑
[ ] 删除重复描述文本
[ ] 新增 RoomOverviewPanel 通用组件
[ ] Header / Hero / Metrics / Insight / Actions 分区
```

### Phase 2：底部栏结构重做

```text
[ ] 删除第二层 Summary / Metrics / Decision Tab
[ ] 保留单层 Tab：概览 / 时间轴 / 历史 / AI解释
[ ] 概览 Tab 改成 Hero / Metrics / Insight / Details 三列布局
[ ] Details 放到底部，不再横向打散
```

### Phase 3：Metric Renderer

```text
[ ] 实现 MetricRenderer
[ ] 实现 MetricBar
[ ] 实现 MetricGauge
[ ] 实现 MetricBadge
[ ] 实现 StrategyScore
[ ] 所有房间统一用 metric.display 渲染
```

### Phase 4：视觉统一

```text
[ ] 状态色统一
[ ] 卡片圆角统一 10~12px
[ ] 面板 padding 统一 12~16px
[ ] 字号层级统一
[ ] active / warning / error 状态添加边框效果
```

### Phase 5：交互优化

```text
[ ] 点击房间自动打开底部 Drawer
[ ] 点击“查看详情”切换到底部概览
[ ] 点击“解释此结果”切换到 AI解释 Tab
[ ] 点击“查看历史”切换到历史 Tab
[ ] hover metric 显示 tooltip
```

---

## 16. 最终视觉参考

### 16.1 房间面板最终样式

```text
┌──────────────────────────────┐
│ 决策调度台        Done        │
│ Updated 15:42:22             │
├──────────────────────────────┤
│ HOLD                         │
│ Confidence 62% · Position 35%│
│ 综合风险与策略后建议观望      │
├──────────────────────────────┤
│ ┌────────┐ ┌──────┐ ┌───────┐│
│ │ Conf   │ │ Risk │ │ Top   ││
│ │ 62%    │ │ 46   │ │ Mom.  ││
│ └────────┘ └──────┘ └───────┘│
├──────────────────────────────┤
│ Insight                      │
│ 当前更适合保持 Hold，而不是...│
├──────────────────────────────┤
│ [查看详情] [解释此结果]       │
└──────────────────────────────┘
```

### 16.2 底部栏最终样式

```text
┌────────────────────────────────────────────────────────────────────┐
│ 概览    时间轴    历史    AI解释                         Close     │
├────────────────────────────────────────────────────────────────────┤
│ 决策调度台                                      Done · 15:42:22     │
├──────────────────────┬──────────────────────┬──────────────────────┤
│ HOLD                 │ Confidence  ████ 62%  │ 智能解释              │
│ Confidence 62%       │ Risk Score  ███ 46    │ 综合策略与风险后...   │
│ Position 35%         │ Top Strategy Momentum │ 推理依据：            │
│ 当前建议保持观望      │ Sharpe 0.64           │ 1. 风险中等           │
│                      │                      │ 2. 动量优势不足       │
├──────────────────────┴──────────────────────┴──────────────────────┤
│ Input: strategy_scores, risk_result, indicator_result               │
│ Output: final_decision, confidence, suggested_position              │
└────────────────────────────────────────────────────────────────────┘
```

---

## 17. 最终结论

这次优化的关键不是继续增加数据，而是重构信息展示方式：

```text
旧版：房间 = 资源列表 / 文档列表 / 数字计数
新版：房间 = 核心结论 + 指标支撑 + 智能解释 + 可追踪详情
```

房间面板负责“一眼看懂”，底部栏负责“深入解释”。完成这套改造后，各个室才会真正具有信息价值，也会明显接近模板图中的产品化效果。
