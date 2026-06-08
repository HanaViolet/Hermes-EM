# Visual Asset Specification -- 小红书 Posts

Per-post visual requirements for all 6 posts. Specifies what exists, what
needs creation, and target dimensions for 小红书 platform.

## Platform Requirements

- **Cover image / carousel slides:** 1242x1660px (3:4 aspect ratio preferred)
- **Video:** 1080x1920px (9:16 vertical) for feed, 1080x1080 (1:1) acceptable
- **GIF:** Convert to video for better compression; 小红书 supports GIF but
  video gets higher distribution weight
- **Max file sizes:** Images 20MB, video 5 minutes / 100MB

## Existing Assets

| Asset | Path | Dimensions | Format | Notes |
|-------|------|-----------|--------|-------|
| Demo GIF | docs/assets/demo.gif | 520x360 | GIF, 1.6MB, 10fps | Landscape -- needs crop/reframe for 3:4 |
| Demo video | docs/assets/demo.mp4 | Unknown (likely 16:9) | MP4, 7.5MB | Needs vertical reframe for 9:16 |
| Dashboard screenshot | docs/assets/dashboard-full.png | Unknown | PNG | Can crop regions for carousel slides |

---

## Post 1: The Pixel-Art Office Reveal

**Format:** Carousel (6 slides) + GIF cover

| Asset | Source | Dimensions | Status | Notes |
|-------|--------|-----------|--------|-------|
| Cover (GIF/video) | CREATE | 1242x1660 | Needed | Record pixel-art office: agents walking to desks, sitting, typing. Overlay text: "我的AI团队有自己的办公室". Convert GIF to short video for better reach |
| Slide 1 (intro) | CREATE | 1242x1660 | Needed | Office overview screenshot with agent labels (Sarah, Morgan, Marcus, Priya) and role callouts |
| Slide 2 (agents at work) | CREATE | 1242x1660 | Needed | Close-up of agent pixel-art at desk typing. Overlay: movement sequence |
| Slide 3 (real-time state) | CREATE | 1242x1660 | Needed | Split view: Sarah reviewing code (pixel-art) + Morgan at whiteboard |
| Slide 4 (tech stack) | CREATE | 1242x1660 | Needed | Clean text card: React 19 + Canvas 2D + TypeScript, MIT license, gru-ai |
| Slide 5 (quickstart) | CREATE | 1242x1660 | Needed | Terminal screenshot with `npx gru-ai init` / `npx gru-ai start` commands on dark background |
| Slide 6 (CTA) | CREATE | 1242x1660 | Needed | gruAI logo + GitHub URL + "关注我" CTA card |

**Production notes:**
- GIF cover is the hero -- must show agent movement animation (3--5 second loop)
- Record from the actual game view in browser, crop to 3:4 centered on office area
- Existing demo.gif is too small (520x360) and wrong aspect ratio; record fresh at higher resolution

---

## Post 2: Pipeline Walkthrough (Screencast)

**Format:** Screencast video (2--3 minutes)

| Asset | Source | Dimensions | Status | Notes |
|-------|--------|-----------|--------|-------|
| Video (main) | CREATE | 1080x1920 (9:16) | Needed | Full screencast recording with voiceover. Terminal (top 60%) + office view (bottom 40%) vertical layout |
| Cover frame | CREATE | 1242x1660 | Needed | Static frame from video: terminal + office side-by-side, overlay "一句话需求，20分钟交付" |
| Thumbnail | CREATE | 1242x1660 | Needed | Same as cover frame with bolder text for feed preview |

**Production notes:**
- Record terminal in large font (18pt+) for mobile readability
- Vertical video layout: terminal on top, browser with office on bottom
- Existing demo.mp4 could be used as B-roll IF it shows pipeline execution, but primary video should be fresh recording following the voiceover script exactly
- Add Chinese subtitles (字幕) -- 小红书 videos autoplay muted in feed

---

## Post 3: gruAI vs Manual Development

**Format:** Carousel (7 slides)

| Asset | Source | Dimensions | Status | Notes |
|-------|--------|-----------|--------|-------|
| Slide 1 (cover) | CREATE | 1242x1660 | Needed | Split-screen: "手动开发 4小时" vs "gruAI 20分钟" with pixel-art clock icons |
| Slide 2 (manual flow) | CREATE | 1242x1660 | Needed | Numbered list with time annotations, warm/red color scheme (pain) |
| Slide 3 (gruAI flow) | CREATE | 1242x1660 | Needed | Numbered list with time annotations, cool/green color scheme (efficiency) |
| Slide 4 (comparison) | CREATE | 1242x1660 | Needed | Three-column comparison: ChatGPT / Copilot / gruAI with check/cross icons |
| Slide 5 (quality) | CREATE | 1242x1660 | Needed | Code review illustration: CTO agent reviewing with check marks |
| Slide 6 (audience) | CREATE | 1242x1660 | Needed | Three personas with icons: indie dev, small team, learner |
| Slide 7 (CTA) | CREATE | 1242x1660 | Needed | Install command + GitHub URL + MIT badge |

**Production notes:**
- Consistent color palette across all 7 slides (brand colors from gruAI)
- Use pixel-art style icons to match brand identity
- Text must be readable at mobile size -- 24pt minimum for body, 36pt for headers
- Slides 2+3 are the key comparison -- side-by-side if swiped quickly should tell the whole story

---

## Post 4: Agent Personalities (Screencast)

**Format:** Screencast video (2 minutes)

| Asset | Source | Dimensions | Status | Notes |
|-------|--------|-----------|--------|-------|
| Video (main) | CREATE | 1080x1920 (9:16) | Needed | Screencast showing challenge mode in action. Same vertical layout as Post 2 |
| Cover frame | CREATE | 1242x1660 | Needed | Pixel-art Sarah with speech bubble "架构不合理，打回重做", overlay "AI CTO 比前同事还严格" |
| Thumbnail | CREATE | 1242x1660 | Needed | Close-up pixel-art Sarah face with angry/stern expression + speech bubble |

**Production notes:**
- The "打回" moment is the hero shot -- make sure terminal output is clearly readable
- Show the pixel-art office with Sarah at whiteboard during the challenge scene
- Add Chinese subtitles
- Comedic timing: pause after Sarah's rejection for dramatic effect

---

## Post 5: The CEO's Week (Pixel-Art Story)

**Format:** Carousel (6 slides) with pixel-art illustrations

| Asset | Source | Dimensions | Status | Notes |
|-------|--------|-----------|--------|-------|
| Slide 1 (cover) | CREATE | 1242x1660 | Needed | Pixel-art calendar view with tiny office vignettes. Text: "CEO 一周只干45分钟" |
| Slide 2 (Monday) | CREATE | 1242x1660 | Needed | Pixel-art Priya at desk viewing data charts. Text overlay with Monday details |
| Slide 3 (Tue--Thu) | CREATE | 1242x1660 | Needed | Full office panorama, multiple agents busy. CEO desk empty. Text: "0分钟" |
| Slide 4 (Friday) | CREATE | 1242x1660 | Needed | Meeting table scene, agents around table with documents. Dashboard UI partial screenshot could supplement |
| Slide 5 (Monthly) | CREATE | 1242x1660 | Needed | Sarah in server room pixel scene. Health check iconography |
| Slide 6 (summary) | CREATE | 1242x1660 | Needed | "45分钟/周" large text + gruAI branding + GitHub URL |

**Production notes:**
- Each slide is a mini pixel-art scene -- these should feel like a comic strip / story
- Consistent pixel-art style matching the actual game view
- Existing dashboard-full.png could be cropped for the Friday slide background
- Cover slide calendar should show Mon highlighted, Tue--Thu grayed out, Fri highlighted

---

## Post 6: Quick Start Guide

**Format:** Carousel (5 slides) -- reference card

| Asset | Source | Dimensions | Status | Notes |
|-------|--------|-----------|--------|-------|
| Slide 1 (cover) | CREATE | 1242x1660 | Needed | gruAI logo + "3分钟上手指南" on clean dark background |
| Slide 2 (install) | PARTIAL (screenshot) | 1242x1660 | Needed | Terminal screenshot of `npx gru-ai init` running. Capture from actual terminal with dark theme |
| Slide 3 (dashboard) | REUSE dashboard-full.png | 1242x1660 | Crop needed | Crop dashboard screenshot to 3:4, overlay Chinese labels for key areas |
| Slide 4 (first directive) | PARTIAL (screenshot) | 1242x1660 | Needed | Terminal screenshot of `/directive` command running. Capture from actual terminal |
| Slide 5 (CTA) | CREATE | 1242x1660 | Needed | GitHub URL + "关注我" + weekly content preview card |

**Production notes:**
- This is a "save for later" reference post -- slides must be self-contained and readable without body text
- Terminal screenshots must use large font, dark theme, high contrast
- Slide 3 reuses dashboard-full.png but needs Chinese overlay labels
- Keep visual style minimal and clean -- this is a utility post, not a showcase post

---

## Asset Summary

| Asset Name | Source | Target Dimensions | Post(s) | Priority |
|-----------|--------|-------------------|---------|----------|
| Office GIF/video (animated) | CREATE (record from game) | 1242x1660 (3:4) | 1 | P0 -- hero asset |
| Pipeline screencast | CREATE (record terminal + browser) | 1080x1920 (9:16) | 2 | P0 -- core demo |
| Challenge mode screencast | CREATE (record terminal + browser) | 1080x1920 (9:16) | 4 | P1 |
| Comparison carousel (7 slides) | CREATE (design) | 1242x1660 | 3 | P1 |
| CEO week carousel (6 slides) | CREATE (pixel-art scenes) | 1242x1660 | 5 | P1 |
| Quickstart carousel (5 slides) | CREATE + REUSE dashboard-full.png | 1242x1660 | 6 | P1 |
| Office reveal carousel (6 slides) | CREATE (screenshots + design) | 1242x1660 | 1 | P1 |
| Brand template (reusable) | CREATE | 1242x1660 | All | P0 -- needed first |

**Total assets needed:** 37 individual images/videos
- **Create from scratch:** 33
- **Reuse existing (with modification):** 1 (dashboard-full.png for Post 6 Slide 3)
- **Record fresh:** 3 (office GIF, 2 screencasts)

**Recommended creation order:**
1. Brand template (colors, fonts, layout grid) -- all posts depend on this
2. Office GIF/video recording -- hero asset for Post 1
3. Pipeline screencast -- hero asset for Post 2
4. Carousel slides for Posts 1, 3, 5, 6 -- can be batch-produced once template exists
5. Challenge mode screencast for Post 4
