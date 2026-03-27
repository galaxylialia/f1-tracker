# F1 信息网站 — Design Spec

**日期**: 2026-03-27
**阶段**: Phase 1（HTML/CSS/JS）→ Phase 2（微信小程序）
**状态**: 已确认，待实现

---

## 1. 项目定位

F1 赛季信息看板，兼顾个人深度数据需求与球迷友好易读体验。

- **受众**: 个人使用 + F1 爱好者社群
- **Phase 1**: 纯 HTML/CSS/JS，可直接浏览器打开
- **Phase 2**: 迁移微信小程序（数据层设计保持可迁移性）

---

## 2. 视觉规范

| 项目 | 值 |
|------|-----|
| 主背景 | `#0A0A0A` |
| 卡片层 | `#141414` |
| 强调红 | `#E10600`（F1 官方红）|
| 主文字 | `#FFFFFF` |
| 次文字 | `#888888` |
| 分割线 | `rgba(255,255,255,0.08)` |
| 正文字体 | `Inter`（Google Fonts）|
| 数字字体 | `IBM Plex Mono`（积分、圈速等所有数字）|
| 最大宽度 | `1280px`，内边距 `24px` |
| 桌面断点 | `≥ 1024px` |
| 手机断点 | `< 1024px` |

### 动效规范

| 效果 | 实现 |
|------|------|
| 卡片入场 | `fade-up` + 50ms stagger delay，CSS `@keyframes` |
| 数字统计 | 0 → 目标值，`requestAnimationFrame`，400ms |
| 卡片 hover | `translateY(-2px)` + 车队颜色左边框 |
| 详情面板滑入 | `translateX(100%) → 0`，300ms ease-out（桌面）|
| 实时状态指示 | 红点 `pulse` 呼吸动画（比赛周进行中）|
| 数据刷新高亮 | 更新行 flash 黄色 → 透明，500ms |
| 骨架屏 | shimmer 扫光效果，替代 spinner |

---

## 3. 页面结构与导航

### 导航模式：混合式（Option C）

- **桌面（≥1024px）**: 列表页点击 → 右侧滑入详情面板，列表保持可见
- **手机（<1024px）**: 点击 → 跳转独立详情页
- 详情页同时作为独立页面存在，支持直接访问与分享链接
- `panel.js` 负责桌面端 fetch 注入；手机端退化为普通 `<a>` 跳转

### 页面地图

```
全局导航（顶部固定）：Home · 赛程 · 车手 · 车队

/index.html              首页（双状态）
/schedule.html           赛程
  └── panel → race.html  比赛详情（桌面面板 / 手机独立页）
/drivers.html            车手列表
  └── panel → driver.html  车手详情
/teams.html              车队列表
  └── panel → team.html    车队详情
/race.html               比赛详情（独立页，?meeting_key=xxx）
/driver.html             车手详情（独立页，?number=xxx）
/team.html               车队详情（独立页，?id=xxx）
```

### 首页双状态

**State A（无比赛周）**
1. 赛季标题 + 年份
2. 下一站倒计时 + 赛道/国家
3. 车手积分榜 Top 10
4. 车队积分榜
5. 最近一站比赛回顾

**State B（比赛周进行中）**
1. 当前 GP Banner（赛道名/国旗/最新 Session 结果）
2. 下一 Session 倒计时
3. 实时位置（比赛进行中时）
4. 积分榜迷你版

**状态检测逻辑**：取 `/sessions?year=CURRENT_YEAR`，找当前时间 ±3 天内有 session 的 meeting → State B，否则 State A。

### 车队详情页信息层级

1. **Hero**：队标色块 + 全名 + 国籍/引擎/底盘 + 当前积分排名
2. **本赛季数据**：积分 / 胜场 / 杆位 / 最快圈 / 上台次数
3. **本赛季车手**：两位车手卡片（可点击进入车手详情）
4. **本赛季各站成绩**：积分走势折线图 + 分站结果表
5. **历史荣誉**：车队冠军次数 / 车手冠军次数 / 历史胜场 / 成立年份 / 历届冠军车手
6. **基本信息**：总部 / 引擎供应商 / 参赛场次

---

## 4. 数据模型

```js
Meeting {
  meetingKey: number       // OpenF1 主键
  meetingName: string      // "Australian Grand Prix"
  circuitName: string
  country: string
  countryCode: string      // 用于国旗
  dateStart: string        // ISO8601 UTC
  dateEnd: string
  round: number
  year: number
}

Session {
  sessionKey: number
  meetingKey: number
  sessionName: string      // "Race" | "Qualifying" | "Sprint" | "FP1/2/3"
  sessionType: string      // "Race" | "Qualifying" | "Practice"
  dateStart: string
  dateEnd: string
  status: 'upcoming' | 'active' | 'finished'  // 客户端计算
}

Driver {
  driverNumber: number
  nameAcronym: string      // "VER"
  fullName: string
  teamName: string
  teamColor: string        // "#3671C6"（OpenF1 提供）
  headshotUrl: string      // OpenF1 官方头像 URL
  countryCode: string
  sessionKey: number
}

TeamInfo {                 // 本地配置，补充静态信息
  id: string               // "red_bull"（与 Jolpica 对齐）
  fullName: string
  color: string
  nationality: string
  base: string
  engineSupplier: string
  foundedYear: number
  championshipYears: number[]
  driverChampions: string[]
  notableCars: string[]
  description: string
}

DriverStanding {           // 来自 Jolpica
  position: number
  driverCode: string
  driverName: string
  constructorId: string
  points: number
  wins: number
}

ConstructorStanding {      // 来自 Jolpica
  position: number
  constructorId: string
  name: string
  points: number
  wins: number
}

SessionResult {
  sessionKey: number
  driverNumber: number
  position: number
  timeGap: string          // "+5.123" | "DNF"
  fastestLapTime: string
  points: number
  lapsDriven: number
}

Stint {
  sessionKey: number
  driverNumber: number
  compound: 'SOFT' | 'MEDIUM' | 'HARD' | 'INTER' | 'WET'
  lapStart: number
  lapEnd: number
  tyreAgeAtStart: number
}

Pit {
  sessionKey: number
  driverNumber: number
  lap: number
  pitDuration: number      // seconds
}
```

---

## 5. API 使用方案

**数据源**
- OpenF1: `https://api.openf1.org/v1/`（实时赛事数据，免费无 Auth）
- Jolpica: `https://api.jolpi.ca/ergast/f1/`（积分榜 + 历史数据，免费无 Auth）

### 调用清单

| 功能 | 接口 |
|------|------|
| 比赛周检测 | `GET /sessions?year={year}` |
| 全年赛站 | `GET /meetings?year={year}` |
| Session 列表 | `GET /sessions?meeting_key={k}` |
| 车手列表（含头像）| `GET /drivers?session_key=latest` |
| 正赛/排位成绩 | `GET /position?session_key={k}` |
| 进站记录 | `GET /pit?session_key={k}` |
| 轮胎策略 | `GET /stints?session_key={k}` |
| 车手积分榜 | `GET jolpica /{year}/driverstandings` |
| 车队积分榜 | `GET jolpica /{year}/constructorstandings` |
| 车队历史排名 | `GET jolpica /constructors/{id}/constructorstandings?limit=100` |
| 车手历年战绩 | `GET jolpica /drivers/{code}/driverstandings` |

### 实时刷新策略

- 排位赛 + 正赛 Session 进行中：**30 秒轮询**
- Session 结束（`dateEnd` 已过）后自动停止轮询
- 刷新范围：`/position`（排名）+ `/intervals`（间隔）

### OpenF1 不覆盖的数据

| 数据 | 降级方案 |
|------|---------|
| 积分榜 | Jolpica ✓ |
| 车队颜色/静态信息 | `js/config/teamInfo.js` 本地配置 |
| 赛道平面图 | MVP 暂缓 |

---

## 6. MVP 范围

### Phase 1 MVP 交付

- [x] 首页 State A + State B 状态切换
- [x] 赛程页：2026 全年赛站，完成/进行中/未来状态
- [x] 比赛详情：排位赛 + 正赛成绩表 + 进站记录
- [x] 车手列表（排名/积分）+ 车手详情（统计 + 各站成绩）
- [x] 车队列表（排名/积分）+ 车队详情（统计 + 历史荣誉）
- [x] 桌面双栏面板 + 手机跳转（Option C）
- [x] 比赛周实时 30 秒轮询
- [x] 动效：入场动画 / 数字计数 / 骨架屏 / hover

### Phase 1.5+ 扩展

- [ ] 轮胎策略可视化（甘特图）
- [ ] 积分走势多车手对比图
- [ ] 历史多赛季切换
- [ ] 首页实时位置图
- [ ] 赛道平面图 SVG

---

## 7. 文件结构

```
/
├── index.html
├── schedule.html
├── race.html              # ?meeting_key=xxx
├── drivers.html
├── driver.html            # ?number=xxx
├── teams.html
├── team.html              # ?id=xxx
│
├── css/
│   ├── variables.css      # 设计 token
│   ├── base.css           # Reset + 排版
│   ├── layout.css         # 导航 / 页面骨架 / 响应式
│   └── components.css     # 卡片 / 表格 / 积分榜 / 骨架屏 / 面板
│
├── js/
│   ├── api/
│   │   ├── openf1.js      # OpenF1 调用（零 DOM 依赖）
│   │   └── jolpica.js     # 积分榜 + 历史数据
│   ├── config/
│   │   └── teamInfo.js    # 10 支车队静态信息
│   ├── state.js           # 比赛周检测 + 轮询管理
│   ├── utils.js           # 日期 / 时区 / 国旗 / 圈速格式化
│   ├── panel.js           # 桌面侧滑面板逻辑
│   ├── components.js      # 可复用 render 函数
│   └── pages/
│       ├── home.js
│       ├── schedule.js
│       ├── race.js
│       ├── drivers.js
│       ├── driver.js
│       ├── teams.js
│       └── team.js
│
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-03-27-f1-website-design.md
```

### 小程序迁移对照表

| HTML | 微信小程序 |
|------|-----------|
| `js/api/` | 直接复用（零 DOM）|
| `js/config/teamInfo.js` | 直接复用 |
| `js/state.js` + `js/utils.js` | 直接复用 |
| `js/components.js` | 重写为 WXML 模板（数据结构不变）|
| `js/panel.js` | 替换为 `wx.navigateTo` |
| 每个 `.html` | 对应 `pages/xxx/` 目录 |

---

## 8. 已确认决策点

| 项 | 决定 |
|----|------|
| 积分数据源 | Jolpica |
| 路由方式 | 多页 HTML |
| 时区 | `Intl.DateTimeFormat` 检测系统时区，显示本地时间 |
| 实时刷新 | 排位赛 + 正赛均 30 秒轮询 |
| 赛季年份 | `new Date().getFullYear()`，当前为 2026 |
| 车队历史 | Jolpica 历史数据 + 本地 `teamInfo.js` |
| 导航模式 | Option C（桌面双栏 + 手机全屏跳转）|
