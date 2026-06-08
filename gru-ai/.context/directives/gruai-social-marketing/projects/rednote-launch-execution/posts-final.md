# 小红书 Posts -- Final (gruAI)

6 posts polished for platform compliance and natural Chinese tone.
All GitHub/npm references verified against current README.

---

## Post 1: The Pixel-Art Office Reveal

**Pillar:** B (Pixel-Art Visualization)
**Format:** Carousel (6 images) + GIF cover
**Calendar slot:** Week 1, Monday

### Cover Image
Pixel-art office GIF showing agents walking to desks, sitting down, typing.
Overlay text: "我的AI团队有自己的办公室"

### Hook (标题)
AI员工有自己的像素办公室

### Body (正文)

做了个开源项目叫 gruAI，里面有4个AI高管：

Sarah -- CTO，管架构和代码质量
Morgan -- COO，管项目规划和排期
Marcus -- CPO，管产品方向
Priya -- CMO，管增长策略

他们不是聊天机器人，是有自己「办公室」的AI员工

【Slide 2】
每个 agent 有自己的像素小人，走到工位坐下就开始写代码。你丢一个需求过去，他们自己分工、讨论、开发、审查

【Slide 3】
办公室不只是好看 -- 它实时反映系统状态。Sarah 审代码的时候，她的小人就坐在电脑前；Morgan 做规划的时候，她在白板前面

【Slide 4】
技术栈：React 19 + Canvas 2D + TypeScript
MIT 开源协议，npm 包：gru-ai

【Slide 5】
两行命令就能跑：
npx gru-ai init
npx gru-ai start

【Slide 6】
想看更多 AI 办公室日常，关注我
GitHub: github.com/andrew-yangy/gruai

### CTA
你觉得 AI 员工应该长什么样？评论区聊聊

### Hashtags
#AI智能体 #像素风 #开源项目 #独立开发 #AI自动化 #开发者工具 #程序员日常 #TypeScript

---

## Post 2: Pipeline Walkthrough (Screencast)

**Pillar:** A (AI Company)
**Format:** Screencast video (2--3 minutes)
**Calendar slot:** Week 2, Monday

### Cover Frame
Terminal showing pipeline execution with pixel-art office visible in browser.
Overlay text: "一句话需求，20分钟交付"

### Hook (标题)
一句话需求，AI团队20分钟交付

### Voiceover Script (逐场景)

**Scene 1 (0:00--0:15) -- Terminal: typing directive**
> 今天给大家看 gruAI 的完整流程。我只需要在终端打一行指令，比如"加个暗黑模式"，AI 团队就自己开始干活了

**Scene 2 (0:15--0:40) -- Terminal: triage step**
> 首先是分级。系统自动判断需求复杂度 -- 简单的直接执行，复杂的走完整流程。这次判断为中等复杂度

**Scene 3 (0:40--1:10) -- Terminal: COO planning**
> 现在 Morgan（COO）开始做项目规划。她分析需求、分配工程师、定义验收标准。注意看 -- 输出的是结构化 JSON，不是一堆散文

**Scene 4 (1:10--1:30) -- Browser: pixel-art office**
> 切到办公室看看。Morgan 在工位上忙，其他 agent 在待命。等工程师被分配任务，你会看到新小人出现

**Scene 5 (1:30--2:00) -- Terminal: build + review**
> 工程师开始写代码。写完不是直接交 -- Sarah 作为 CTO 会做代码审查。检查架构、安全问题，不通过就打回重做

**Scene 6 (2:00--2:20) -- Terminal: completion**
> 审查过了。系统让我确认完成。暗黑模式加上了，CSS 变量对了，组件也更新了。确认

**Scene 7 (2:20--2:40) -- Wrap up**
> 从指令到交付大概 20 分钟。我只打了一行字，最后确认一下。中间的规划、开发、审查全自动。这就是 gruAI。开源免费，链接在主页

### Body (正文/视频描述)

完整演示：一行指令到交付一个功能

gruAI 不是 ChatGPT 那种问答工具
它是一个完整的 AI 开发团队：
- COO 自己做项目规划
- 工程师自己写代码
- CTO 自己做代码审查
- CEO（你）只需要确认最终结果

全程 20 分钟，你只打了一行字

开源免费：npx gru-ai init
GitHub: github.com/andrew-yangy/gruai

### CTA
想看更多 AI 开发实战？关注 + 收藏，每周更新

### Hashtags
#AI智能体 #AI自动化 #开源项目 #AI编程 #开发者工具 #效率工具 #独立开发 #程序员日常

---

## Post 3: gruAI vs Manual Development

**Pillar:** C (Developer Productivity)
**Format:** Carousel (7 slides)
**Calendar slot:** Week 2, Friday

### Cover Image
Split-screen comparison: left side "手动开发 4小时", right side "gruAI 20分钟".
Pixel-art style clock icons.

### Hook (标题)
手动写4小时，AI团队20分钟

### Body (正文)

【Slide 1 -- Cover】
同样的功能，差距在哪？

【Slide 2 -- 手动开发流程】
手动开发一个中等功能：
1. 理解需求 -- 15分钟
2. 查文档找方案 -- 30分钟
3. 写代码 -- 2小时
4. 自测 -- 30分钟
5. 找人审查 -- 等1天
6. 改审查意见 -- 30分钟
合计：4小时 + 等待时间

【Slide 3 -- gruAI 流程】
gruAI 开发同一个功能：
1. 写一句指令 -- 10秒
2. AI 自动规划 -- 2分钟
3. AI 自动开发 -- 10分钟
4. AI 自动审查 -- 5分钟
5. CEO 确认完成 -- 1分钟
合计：约20分钟，零等待

【Slide 4 -- 关键区别】
不是"AI 帮你写代码"
是"AI 团队帮你做完整个项目"

区别在哪？
- ChatGPT：你问一句它答一句，你还得自己拼
- Copilot：帮你补全代码，但不管规划和审查
- gruAI：从需求到交付，全流程自动化

【Slide 5 -- 质量保证】
"AI 写的代码靠谱吗？"
gruAI 内置代码审查
CTO agent 检查：架构合理性、安全问题、代码规范
不通过就打回重做

【Slide 6 -- 适合谁用】
- 独立开发者：一个人顶一个团队
- 小团队：重复性工作甩给 AI
- 想研究 AI agent 的开发者：开源代码值得扒

【Slide 7 -- 开始用】
npx gru-ai init
MIT 开源协议
GitHub: github.com/andrew-yangy/gruai

### CTA
你开发流程里最烦的一步是啥？评论区聊聊

### Hashtags
#AI编程 #效率工具 #开发者工具 #AI智能体 #独立开发 #开源项目 #AI自动化 #技术分享

---

## Post 4: Agent Personalities (Screencast)

**Pillar:** A (AI Company) + B (Pixel-Art)
**Format:** Screencast video (2 minutes)
**Calendar slot:** Week 3, Monday

### Cover Frame
Pixel-art office with speech bubble from Sarah: "架构不合理，打回重做".
Overlay text: "AI CTO 比前同事还严格"

### Hook (标题)
AI CTO打回了我的方案

### Voiceover Script (逐场景)

**Scene 1 (0:00--0:15) -- Office overview**
> gruAI 的高管团队不是没个性的工具。每个 agent 都有自己的脾气。今天看看他们怎么"吵架"

**Scene 2 (0:15--0:35) -- Terminal: CEO directive**
> 我给了个指令，想加新功能。按流程会先到 challenge 阶段 -- 其他 agent 可以反对你的方案

**Scene 3 (0:35--1:00) -- Terminal: Sarah's challenge**
> 看，Sarah 直接打回了。她说"改动范围太大，涉及3个模块，应该拆成两个独立项目"。而且给了具体的拆分方案

**Scene 4 (1:00--1:20) -- Office: Sarah at whiteboard**
> 切到办公室 -- Sarah 在白板前面做架构分析。旁边 Morgan 在等着接收最终方案

**Scene 5 (1:20--1:45) -- Terminal: revised plan**
> 根据 Sarah 的建议，Morgan 重新规划了。拆成两个小项目，各有独立验收标准和审查人。这就是 challenge mode -- agent 不是 yes-man，他们真的会提反对意见

**Scene 6 (1:45--2:00) -- Wrap up**
> 这种互相挑战的机制是 gruAI 和其他 AI 工具最大的区别。不是一个 AI 无脑执行你说的，而是一个团队帮你把关。被打回虽然有点烦，但代码质量确实上去了

### Body (正文/视频描述)

不是所有 AI 工具都会跟你说"不"

gruAI 的 agent 有 challenge mode：
- Sarah (CTO) 因为架构问题打回方案
- Morgan (COO) 因为排期不合理提修改意见
- 给的不是模糊反对，是具体改进方案

AI 不应该只会执行，也应该会质疑

开源免费：npx gru-ai init
GitHub: github.com/andrew-yangy/gruai

### CTA
你希望 AI 会对你说"不"吗？还是更喜欢无脑执行？评论区投个票

### Hashtags
#AI智能体 #像素风 #开源项目 #AI自动化 #开发者工具 #程序员日常 #技术分享 #Claude

---

## Post 5: The CEO's Week (Pixel-Art Story)

**Pillar:** B (Pixel-Art) + C (Productivity)
**Format:** Carousel (6 slides) with pixel-art illustrations
**Calendar slot:** Week 3, Friday

### Cover Image
Pixel-art calendar with tiny office scenes for each day.
Overlay text: "CEO 一周只干45分钟"

### Hook (标题)
当CEO一周只用工作45分钟

### Body (正文)

【Slide 1 -- Cover】
一个 AI 公司 CEO 的真实一周

【Slide 2 -- 周一：15分钟】
周一早上打开 /scout 报告

AI 团队周末自己调研了：
- 竞品有啥新动作
- 技术栈有没有安全更新
- 用户社区在讨论什么

花15分钟看报告，批准几个提案就行

（配图：像素办公室，Priya 在看数据图表）

【Slide 3 -- 周二到周四：0分钟】
AI 团队自动执行批准的项目

Morgan 排期 -- 工程师开发 -- Sarah 审查

不用管
办公室里能看到他们在忙

（配图：像素办公室全景，多个 agent 在工位上干活）

【Slide 4 -- 周五：20分钟】
周五看周报

AI 生成的 dashboard：
- 本周完成了哪些项目
- 代码质量指标
- 下周计划

花20分钟确认，提几个方向

（配图：像素会议桌，文件摊开，agent 围坐）

【Slide 5 -- 月度：10分钟】
每月一次健康检查

Sarah 自动扫描代码库：
- 安全漏洞
- 过时的依赖
- 技术债

低风险自动修，高风险报告给我

（配图：Sarah 在服务器机房的像素场景）

【Slide 6 -- 总结】
CEO 总投入：每周约45分钟

其他时间？干自己想干的事

gruAI -- 你的 AI 开发团队
开源免费：npx gru-ai init
GitHub: github.com/andrew-yangy/gruai

### CTA
收藏这篇，下次有人问"AI 能不能替代程序员"的时候发给他

### Hashtags
#AI智能体 #像素风 #效率工具 #AI自动化 #独立开发 #开源项目 #副业 #AI创业 #开发者工具

---

## Post 6: Quick Start Guide

**Pillar:** C (Developer Productivity)
**Format:** Carousel (5 slides) -- practical reference card
**Calendar slot:** Week 1, Friday

### Cover Image
Clean terminal screenshot with gruAI logo.
Text: "3分钟上手指南"

### Hook (标题)
gruAI 3分钟上手（收藏）

### Body (正文)

【Slide 1 -- Cover】
gruAI 3分钟上手指南
收藏 = 随时查

【Slide 2 -- 安装】
第一步：安装

打开终端：
npx gru-ai init

需要准备：
- Node.js 18+
- Claude API key
- 5分钟

（配图：干净的终端截图，深色主题）

【Slide 3 -- 初始化】
第二步：启动

npx gru-ai start

打开 localhost:4444 看 dashboard
系统自动创建 .context/ 目录

这个目录就是 AI 团队的"公司章程"：
- vision.md -- 项目愿景
- directives/ -- 所有任务
- lessons/ -- AI 学到的经验

（配图：目录树截图）

【Slide 4 -- 第一个指令】
第三步：下达指令

在 Claude Code 里运行：
/directive "给 README 加个快速上手部分"

AI 团队开始干活：
分级 -- 规划 -- 开发 -- 审查 -- 交付

你只需要最后确认一下

（配图：终端运行截图）

【Slide 5 -- 下一步】
想深入了解？

GitHub 上有完整文档
MIT 开源，随便用

GitHub: github.com/andrew-yangy/gruai

关注我，每周分享：
- AI agent 开发实战
- 像素风办公室新功能
- 效率提升技巧

### CTA
装完了来评论区打个卡

### Hashtags
#AI智能体 #开源项目 #开发者工具 #AI编程 #效率工具 #独立开发 #技术分享 #AI自动化 #程序员日常

---

## Compliance Checklist

| Constraint | Post 1 | Post 2 | Post 3 | Post 4 | Post 5 | Post 6 |
|-----------|--------|--------|--------|--------|--------|--------|
| Title <= 18 chars | PASS (11) | PASS (14) | PASS (14) | PASS (10) | PASS (14) | PASS (14) |
| Body <= 1,000 chars | PASS | PASS | PASS | PASS | PASS | PASS |
| Hashtags <= 10 | PASS (8) | PASS (8) | PASS (8) | PASS (8) | PASS (9) | PASS (9) |
| GitHub repo correct | PASS | PASS | PASS | PASS | PASS | PASS |
| npm package correct | PASS | PASS | PASS | PASS | PASS | PASS |
| Install command correct | PASS (npx gru-ai init) | PASS | PASS | PASS | PASS | PASS |
| Natural Chinese tone | PASS | PASS | PASS | PASS | PASS | PASS |

### Changes from Original Drafts

1. **All 6 titles shortened** to meet 18-character limit (originals were 23--34 chars)
2. **Install command fixed** across all posts: `npm install -g gru-ai` changed to `npx gru-ai init` + `npx gru-ai start` (matches current README)
3. **GitHub URL added** explicitly: `github.com/andrew-yangy/gruai` (originals said "链接在主页")
4. **Chinese naturalness improved**: removed stiff phrases ("负责" replaced with "管" in casual contexts, "总计" replaced with "合计", removed unnecessary 的, shortened formal constructions)
5. **Voiceover scripts tightened**: removed filler phrases ("大家好" opener), more direct tone
6. **"npm install gru-ai" in CTAs** corrected to match actual package usage (`npx gru-ai init`)
