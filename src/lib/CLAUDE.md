# lib/ — 核心逻辑层

L2 | 父级: /09list-xingmeng/CLAUDE.md

## 成员清单

- `data.ts`: 类型定义 + 常量 + 角色/场景/道具/章节/事件/结局数据，StatMeta 带 category 字段，Character 带 isTrainee
- `store.ts`: Zustand 状态管理，双轨 parseStatChanges，buildSystemPrompt，advanceTime（月度开支+压力自增），checkEnding（5 结局）
- `parser.ts`: AI 回复解析器，角色名着色 + 数值变化着色（含全局资源），dangerouslySetInnerHTML 输出
- `analytics.ts`: Umami 埋点，xm_ 前缀事件，9 个关键事件追踪
- `highlight.ts`: 高光时刻分析 + Ark 图片/视频生成，K-pop 主题 prompt，4 情绪类型 (bond/conflict/growth/crisis)
- `stream.ts`: SSE 流式传输（零修改复制自 lingcao）
- `bgm.ts`: 背景音乐控制（零修改复制自 lingcao）
- `hooks.ts`: useMediaQuery / useIsMobile（零修改复制自 lingcao）

## 关键接口

- `store.ts` 导出: useGameStore, ITEMS, SCENES, STORY_INFO, getAvailableCharacters, getStatLevel
- `data.ts` 导出: 所有类型 + CHARACTERS, SCENES, ITEMS, CHAPTERS, FORCED_EVENTS, ENDINGS, MAX_MONTHS, TRAINEE_STAT_METAS
- `parser.ts` 导出: parseStoryParagraph
- `highlight.ts` 导出: analyzeHighlights, generateImage, generateVideo, queryVideoTask, buildImagePrompt, buildVideoPrompt, HIGHLIGHT_TYPES, COMIC_STYLES, VIDEO_STYLES

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
