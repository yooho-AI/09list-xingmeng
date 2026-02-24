# 首尔星梦事务所 — K-pop 偶像事务所经营养成

React 19 + Zustand 5 + Immer + Vite 7 + Framer Motion + Cloudflare Workers

## 架构

```
09list-xingmeng/
├── worker/           - Cloudflare Worker SSE 代理 (api.yooho.ai)
├── public/
│   ├── audio/        - BGM 音频资源
│   ├── characters/   - 4 角色立绘 (minsu/jiyeon/seonghoon/arin)
│   └── scenes/       - 4 场景背景 (practice/meeting/lounge/studio)
├── src/
│   ├── main.tsx      - React 挂载入口
│   ├── App.tsx       - 根组件：开场/游戏/结局三态 + HeaderBar
│   ├── lib/          - 核心逻辑层 (8 文件: data/store/parser/analytics/highlight/stream/bgm/hooks)
│   ├── styles/       - globals.css 暗色霓虹主题，xm- 前缀
│   └── components/
│       └── game/     - 5 游戏组件 (character-panel/dialogue-panel/side-panel/mobile-layout/highlight-modal)
├── index.html        - ⭐ favicon，首尔星梦事务所
├── package.json      - name: xingmeng
├── wrangler.toml     - name: xingmeng-api
└── vite.config.ts    - Vite 构建配置
```

## 核心设计

- **双轨数值**: 角色 StatMeta (9 维共享模板 + category 分组) + 全局资源 (money/fame)
- **月度时间**: 36 月 × 6 时段，每月扣 30 万开支，破产即 BE
- **StatMeta category**: relation(信任/依赖) / status(心情/健康/压力) / skill(舞蹈/歌唱/综艺感/人气)
- **角色体系**: 3 练习生共享 9 维 + 1 对手仅 attitude 1 维
- **5 结局**: TE(传奇) / HE(出道) / BE(破产/全员流失) / NE(软着陆)
- **主题色**: #e91e8c 霓虹粉，#00d4ff 电光蓝，#ffd700 成就金
- **CSS 前缀**: xm- (星梦)
- **存档键**: xingmeng-save-v1
- **统计前缀**: xm_

## 法则

- StatMeta 按 category 分组渲染，不混排
- parseStatChanges 返回 `{ charChanges, globalChanges }` 双轨结果
- advanceTime 顺序：月度开支 → 破产检查 → 压力自增 → 章节推进 → 强制事件 → 全员流失检查
- 零修改文件：stream.ts / bgm.ts / hooks.ts / main.tsx / vite.config.ts / tsconfig*.json / worker/index.js
