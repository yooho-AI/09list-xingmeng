# 首尔星梦事务所 — K-pop 偶像事务所经营养成

React 19 + Zustand 5 + Immer + Vite 7 + Tailwind CSS v4 + Framer Motion + Cloudflare Pages

## 架构

```
09list-xingmeng/
├── worker/index.js              - ☆ CF Worker API 代理（备用，未部署）
├── public/
│   ├── audio/bgm.mp3            - 背景音乐
│   ├── characters/              - 4 角色立绘 9:16 竖版 (1152x2048)
│   └── scenes/                  - 4 场景背景 9:16 竖版 (1152x2048)
├── src/
│   ├── main.tsx                 - ☆ React 入口
│   ├── vite-env.d.ts            - Vite 类型声明（含 *.md?raw）
│   ├── App.tsx                  - 根组件: StartScreen(暗色霓虹开场) + AppShell + EndingModal(双按钮) + MenuOverlay
│   ├── lib/
│   │   ├── script.md            - ★ 剧本直通：五模块原文（零转换注入 prompt）
│   │   ├── data.ts              - ★ UI 薄层：类型(含富消息扩展) + 4角色 + 4场景 + 6道具 + 3章节 + 5事件 + 5结局
│   │   ├── store.ts             - ★ 状态中枢：Zustand + 富消息插入(场景/换月) + 抽屉状态 + StoryRecord + Analytics + 双轨解析
│   │   ├── parser.ts            - AI 回复解析（4角色着色 + 数值着色 + marked Markdown 渲染 + extractChoices）
│   │   ├── analytics.ts         - Umami 埋点（xm_ 前缀，已集成到 store/App）
│   │   ├── stream.ts            - ☆ SSE 流式通信
│   │   ├── bgm.ts               - ☆ 背景音乐（useBgm hook）
│   │   └── hooks.ts             - ☆ useMediaQuery / useIsMobile
│   ├── styles/
│   │   ├── globals.css          - 全局基础样式（xm- 前缀，暗色霓虹 --bg-secondary/#0f0f23）
│   │   ├── opening.css          - 开场样式：xm-start-* 类（暗色渐变+性别选择+练习生预览）
│   │   └── rich-cards.css       - 富UI组件：场景卡 + 月变卡 + NPC气泡 + 信笺 + DashboardDrawer + RecordSheet + 档案 + 背包 + Toast
│   └── components/game/
│       ├── app-shell.tsx        - 桌面居中壳 + Header(月/时段/金钱/名声/音乐/菜单) + 三向手势 + Tab路由 + TabBar(5键) + DashboardDrawer + RecordSheet
│       ├── dashboard-drawer.tsx - 练习生手帐(左抽屉)：扉页+练习生速览+角色轮播+场景缩略图+训练目标+道具格+迷你播放器。Reorder拖拽排序
│       ├── tab-dialogue.tsx     - 对话 Tab：富消息路由(SceneCard/MonthCard/NPC头像气泡) + 可折叠选项(A/B/C/D) + 背包 + 输入区
│       ├── tab-scene.tsx        - 场景 Tab：9:16大图 + 氛围描述 + 地点列表
│       └── tab-character.tsx    - 人物 Tab：立绘 + 全局资源 + NPC信任 + SVG RelationGraph + 角色网格 + CharacterDossier(全屏档案+分类属性)
├── index.html
├── package.json
├── vite.config.ts               - ☆
├── tsconfig*.json               - ☆
└── wrangler.toml                - ☆
```

★ = 种子文件 ☆ = 零修改模板

## 核心设计

- **K-pop 经营养成**：管理 3 练习生 + 对抗 1 对手事务所，36 月出道期限
- **双轨数值**：角色 StatMeta (9 维共享模板 + category 分组) + 全局资源 (money/fame)
- **暗色霓虹主题**：深蓝黑(#0f0f23)+霓虹粉(#e91e8c)+电光蓝(#00d4ff)+金(#ffd700)，xm- CSS 前缀
- **月度时间**：36 月 × 6 时段（清晨/上午/中午/下午/傍晚/深夜），每月扣 30 万开支
- **剧本直通**：script.md 存五模块原文，?raw import 注入 prompt
- **5 结局**：TE(传奇) / HE(出道) / BE(破产/全员流失) / NE(软着陆)

## 富UI组件系统

| 组件 | 位置 | 触发 | 视觉风格 |
|------|------|------|----------|
| StartScreen | App.tsx | 开场 | 暗色渐变+⭐+性别三选+名字输入+练习生预览卡+霓虹CTA |
| DashboardDrawer | dashboard-drawer | Header📓+右滑手势 | 暗色左抽屉：扉页+信任速览+角色卡轮播+场景缩略图+训练目标+道具格+音乐播放器。Reorder拖拽 |
| RecordSheet | app-shell | Header📜+左滑手势 | 右侧滑入事件记录：时间线倒序+粉色圆点 |
| SceneTransitionCard | tab-dialogue | selectScene | 场景背景+Ken Burns(8s)+渐变遮罩+粉色角标 |
| MonthCard | tab-dialogue | 换月 | 月份大数字+时段+章节名 |
| RelationGraph | tab-character | 始终可见 | SVG环形布局，中心"我"+4NPC立绘节点+连线+关系标签 |
| CharacterDossier | tab-character | 点击角色 | 全屏右滑入+50vh立绘呼吸动画+分类属性条(relation/status/skill)+性格+故事 |
| MiniPlayer | dashboard-drawer | 手帐内 | 播放/暂停+5根音波柱动画 |
| Toast | app-shell | saveGame | TabBar上方弹出2s消失 |
| EndingModal | App.tsx | checkEnding | 全屏遮罩+结局图标+双按钮(返回标题/继续探索) |

## 三向手势导航

- **右滑**（任意主Tab内容区）→ 左侧练习生手帐
- **左滑**（任意主Tab内容区）→ 右侧事件记录
- Header 按钮同等触发
- 手帐内组件支持拖拽排序（Reorder + localStorage `xm-dash-order` 持久化）

## Store 状态扩展

- `activeTab: 'dialogue' | 'scene' | 'character'` — Tab 导航
- `choices: string[]` — 动态选项（AI 返回或 fallback）
- `showDashboard: boolean` — 左抽屉开关
- `showRecords: boolean` — 右抽屉开关
- `storyRecords: StoryRecord[]` — 事件记录（sendMessage 和 advanceTime 自动追加）
- `selectCharacter` 末尾自动跳转 dialogue Tab

## 富消息机制

Message 类型扩展 `type` 字段路由渲染：
- `scene-transition` → SceneTransitionCard（selectScene 触发）
- `month-change` → MonthCard（advanceTime 换月时触发）
- NPC 消息带 `character` 字段 → 32px 圆形立绘头像

## Analytics 集成

- `trackGameStart` / `trackPlayerCreate` → App.tsx 开场
- `trackGameContinue` → App.tsx 继续游戏
- `trackTimeAdvance` / `trackChapterEnter` → store.ts advanceTime
- `trackEndingReached` → store.ts checkEnding
- `trackBankrupt` → store.ts advanceTime 破产
- `trackSceneUnlock` → store.ts selectScene
- `trackStressCrisis` → store.ts 压力危机

## 法则

- StatMeta 按 category 分组渲染，不混排
- parseStatChanges 返回 `{ charChanges, globalChanges }` 双轨结果
- advanceTime 顺序：月度开支 → 破产检查 → 压力自增 → 章节推进 → 强制事件 → 全员流失检查
- 零修改文件：stream.ts / bgm.ts / hooks.ts / main.tsx / vite.config.ts / tsconfig*.json / worker/index.js

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
