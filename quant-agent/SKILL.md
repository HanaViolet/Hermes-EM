# 量化交易 Agent 控制室 · 一键配置

## 项目描述

基于 ClawLibrary 2D 像素地图的量化交易可视化平台。12 个房间映射交易流水线，Agent 在各房间移动完成市场数据加载→指标计算→策略生成→风险检查→回测→报告的全流程分析。

## 执行指令

请按以下步骤自动完成项目配置和启动：

### Step 1: 克隆项目

```bash
git clone https://github.com/HanaViolet/algorithmic_trade.git
cd algorithmic_trade
```

### Step 2: 安装 Python 依赖

```bash
pip install flask flask-cors pandas numpy requests plotly pyyaml scipy
```

### Step 3: 安装 Node.js 依赖

```bash
cd ClawLibrary
npm install
cd ..
```

### Step 4: 修复 Windows 路径兼容（仅 Windows）

ClawLibrary 的验证脚本在 Windows 上有路径 bug。检查 `ClawLibrary/scripts/validate-protocols.mjs`，如果第 4 行是：

```js
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
```

替换为：

```js
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
```

### Step 5: 启动后端

```bash
cd trading_server
python app.py &
```

等待输出 `Running on http://127.0.0.1:5000`

### Step 6: 启动前端

```bash
cd ClawLibrary
npm run dev &
```

等待输出 `http://127.0.0.1:5173/`

### Step 7: 验证

```bash
# 检查后端健康
curl http://127.0.0.1:5000/health

# 检查前端页面
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/

# 提交测试任务
curl -X POST http://127.0.0.1:5000/api/trading/run \
  -H "Content-Type: application/json" \
  -d '{"ticker":"SPY","strategy":"auto"}'
```

### Step 8: 打开浏览器

访问 **http://127.0.0.1:5173**

## 常见问题

### Flask 启动报错 `No module named 'tools'`

清除 Python 缓存后重启：

```bash
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
cd trading_server && python app.py
```

### 右侧面板不见了

点击右侧 `◀` 按钮。如果也没了，刷新页面（旧 localStorage 已自动清除）。

### 房间点击无反应

等待任务完成后再点击，或刷新页面。

### 端口被占用

```bash
# Flask 端口
set TRADING_SERVER_PORT=5001  # Windows
export TRADING_SERVER_PORT=5001  # Mac/Linux

# Vite 端口：修改 ClawLibrary/clawlibrary.config.json 中 server.port
```

## 项目端口

| 服务 | 默认端口 |
|---|---|
| Flask 后端 | 5000 |
| Vite 前端 | 5173 |
