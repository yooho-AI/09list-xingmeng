# components/game/ — 游戏 UI 组件

L2 | 父级: /09list-xingmeng/CLAUDE.md

## 成员清单

- `character-panel.tsx`: PC 端左侧面板，SceneCard + SceneSelector + PortraitCard + InfoCard(按 category 分组数值条) + GlobalResourceBar + DebutCountdown(≤6 月霓虹脉冲) + CharacterList(3 练习生+1 对手)
- `dialogue-panel.tsx`: PC 端中间对话面板，LetterCard(事务所介绍信) + MessageItem + StreamingMessage + InputArea + BottomInfo(月份/倒计时/金钱/名声) + HighlightModal 入口
- `side-panel.tsx`: PC 端右侧面板，InventoryPanel(6 道具含 cost 显示) + RelationsPanel(3 练习生+1 对手关系总览) + 2 导航按钮
- `mobile-layout.tsx`: 移动端自适应布局，MobileHeader(金钱/名声/倒计时) + 场景选择 + 角色 Sheet(relation category 数值) + 背包/关系 Sheet + 结局 Sheet
- `highlight-modal.tsx`: 高光时刻弹窗，AI 分析对话 → 选片段 → 选风格(漫画/视频) → 生成结果，主色 #e91e8c

## 依赖关系

- 全部依赖 `@/lib/store` 的 useGameStore
- `character-panel.tsx` 额外依赖 SCENES, getAvailableCharacters, getStatLevel
- `dialogue-panel.tsx` 额外依赖 `@/lib/parser` 的 parseStoryParagraph，内嵌 highlight-modal
- `highlight-modal.tsx` 依赖 `@/lib/highlight` 全部导出

## 样式约定

- CSS class 前缀: `xm-`
- 内联 style 使用 CSS 变量: --bg-primary, --bg-secondary, --text-primary, --text-secondary, --text-muted, --border, --primary
- 主题色: #e91e8c (霓虹粉), #00d4ff (电光蓝), #ffd700 (成就金)

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
