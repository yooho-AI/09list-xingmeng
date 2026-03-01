# lib/ — 核心逻辑层

L2 | 父级: /09list-xingmeng/CLAUDE.md

## 成员清单

- `script.md`: 剧本直通五模块（故事线/机制/人物/场景/道具），?raw import 注入 system prompt
- `data.ts`: 类型定义 + 常量 + 4角色(portrait)/4场景/6道具/3章节/5事件/5结局/6时段，StatMeta 带 category 字段，Message 含富消息扩展(type/sceneId/monthInfo)
- `store.ts`: Zustand 状态管理，剧本直通(GAME_SCRIPT)，双轨 parseStatChanges，buildSystemPrompt，advanceTime（月度开支+压力自增），checkEnding（5结局），extractChoices 选项提取，Tab/抽屉/记录状态
- `parser.ts`: AI 回复解析器，4角色名着色 + 数值变化着色 + marked Markdown 渲染 + extractChoices（编号选项提取）
- `analytics.ts`: Umami 埋点，xm_ 前缀事件，11 个关键事件追踪
- `stream.ts`: SSE 流式传输（零修改复制自 lingcao）
- `bgm.ts`: 背景音乐控制，useBgm hook（零修改复制自 lingcao）
- `hooks.ts`: useMediaQuery / useIsMobile（零修改复制自 lingcao）

## 关键接口

- `store.ts` 导出: useGameStore + re-export data.ts 全部类型/常量 + re-export parser.ts
- `data.ts` 导出: 所有类型 + CHARACTERS, SCENES, ITEMS, CHAPTERS, FORCED_EVENTS, ENDINGS, MAX_MONTHS, PERIODS, QUICK_ACTIONS, ENDING_TYPE_MAP, STORY_INFO
- `parser.ts` 导出: parseStoryParagraph, extractChoices, escapeHtml

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
