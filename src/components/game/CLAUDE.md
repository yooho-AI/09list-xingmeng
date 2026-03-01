# components/game/ — 游戏组件层

L2 | 父级: /09list-xingmeng/CLAUDE.md

## 成员清单

- `app-shell.tsx`: 游戏主框架 — Header(月/时段/出道倒计时/金钱/名声/音乐/菜单) + TabContent(AnimatePresence切换) + TabBar(5键: 手帐/对话/场景/人物/事件) + DashboardDrawer(左抽屉) + RecordSheet(右抽屉) + 三向手势
- `dashboard-drawer.tsx`: 练习生手帐(左抽屉) — 7段Reorder拖拽排序：月度概览/练习生信任/角色轮播/场景地图/训练目标/道具/音乐播放器
- `tab-dialogue.tsx`: 对话Tab — 富消息路由(SceneTransitionCard/MonthCard/NpcBubble/PlayerBubble/LetterCard/SystemBubble) + CollapsibleChoices(A/B/C/D可折叠) + InventorySheet(底部背包) + InputArea + StreamingMessage
- `tab-scene.tsx`: 场景Tab — 9:16大图 + 氛围描述 + 地点按钮列表(xm-location-tag)
- `tab-character.tsx`: 人物Tab — 当前角色立绘 + GlobalResources(金钱/名声) + NPC信任列表 + SVG RelationGraph(4NPC环形) + 角色网格 + CharacterDossier(全屏右滑: 50vh立绘+分类属性条+性格+故事)

## CSS 前缀

所有组件使用 `const P = 'xm'` 前缀，样式定义在 globals.css + rich-cards.css

## 图标

全部使用 `@phosphor-icons/react`（Notebook/Scroll/MusicNotes/List/ChatCircleDots/MapTrifold/Users/Backpack/PaperPlaneRight/GameController/CaretUp/CaretDown）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
