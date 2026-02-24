/**
 * [INPUT]: 依赖 @/lib/store 的 useGameStore, SCENES, getAvailableCharacters, getStatLevel
 * [OUTPUT]: 对外提供 LeftPanel 组件（场景+角色立绘+分组数值+全局资源+出道倒计时+角色列表）
 * [POS]: 星梦事务所 PC 端左侧面板，3练习生+1对手，按 category 分组渲染数值条
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useGameStore, SCENES, getAvailableCharacters, getStatLevel } from '@/lib/store'

// ============================================================
// 场景卡片 — 16:9 暗色霓虹
// ============================================================

function SceneCard() {
  const currentScene = useGameStore((s) => s.currentScene)
  const scene = SCENES[currentScene]

  return (
    <div className="xm-card xm-scene-card">
      {scene?.background ? (
        <img src={scene.background} alt={scene.name} />
      ) : (
        <div className="xm-placeholder" style={{ background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)' }}>
          <span className="xm-placeholder-icon">🎵</span>
        </div>
      )}
      <div className="xm-scene-tag">
        <span style={{ fontSize: 14 }}>{scene?.icon || '📍'}</span>
        {scene?.name || '练习室'}
      </div>
    </div>
  )
}

// ============================================================
// 场景选择器
// ============================================================

function SceneSelector() {
  const currentScene = useGameStore((s) => s.currentScene)
  const selectScene = useGameStore((s) => s.selectScene)

  return (
    <div className="xm-card">
      <div className="xm-scene-selector">
        {Object.entries(SCENES).map(([id, scene]) => {
          const active = currentScene === id
          return (
            <button
              key={id}
              className={`xm-scene-item${active ? ' active' : ''}`}
              onClick={() => selectScene(id)}
            >
              <span style={{ fontSize: 14 }}>{scene.icon}</span>
              {scene.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 角色立绘卡片
// ============================================================

function PortraitCard() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const char = currentCharacter ? characters[currentCharacter] : null

  return (
    <div className="xm-card xm-portrait-card">
      {char ? (
        <img src={char.fullImage} alt={char.name} />
      ) : (
        <div className="xm-placeholder" style={{ background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)' }}>
          <span className="xm-placeholder-icon">👤</span>
          <span className="xm-placeholder-text">选择角色开始</span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 数值条
// ============================================================

function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 12, width: 16, flexShrink: 0, textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 32, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 24, textAlign: 'right', flexShrink: 0 }}>
        {value}
      </span>
    </div>
  )
}

// ============================================================
// 角色简介 + 按 category 分组渲染数值条
// ============================================================

function InfoCard() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const char = currentCharacter ? characters[currentCharacter] : null

  if (!char) return null

  const stats = characterStats[char.id]
  const firstStatKey = char.statMetas[0]?.key
  const level = getStatLevel(stats?.[firstStatKey] ?? 0)

  /* 按 category 分组 */
  const categories = ['relation', 'status', 'skill'] as const
  const categoryLabels = { relation: '关系', status: '状态', skill: '技能' }
  const grouped = categories
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      metas: char.statMetas.filter((m) => m.category === cat),
    }))
    .filter((g) => g.metas.length > 0)

  return (
    <div className="xm-card xm-info-card">
      <div className="xm-info-title">
        {char.gender === 'female' ? '🚺' : '🚹'} {char.name}
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
          {level.name}
        </span>
      </div>
      <div className="xm-info-meta">
        <span>{char.age}岁</span>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span>{char.title}</span>
      </div>
      <div className="xm-info-desc">{char.description}</div>

      {/* 按 category 分组数值条 */}
      {stats && grouped.map((group) => (
        <div key={group.category} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
            {group.label}
          </div>
          {group.metas.map((meta) => (
            <StatBar key={meta.key} label={meta.label} value={stats?.[meta.key] ?? 0} color={meta.color} icon={meta.icon} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ============================================================
// 全局资源条
// ============================================================

function GlobalResourceBar() {
  const globalResources = useGameStore((s) => s.globalResources)
  const monthlyExpense = useGameStore((s) => s.monthlyExpense)

  return (
    <div className="xm-card" style={{ padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
        <span style={{ color: '#ffd700' }}>💰 {globalResources.money}万</span>
        <span style={{ color: '#e91e8c' }}>⭐ {globalResources.fame}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          月支出 {monthlyExpense}万
        </span>
      </div>
    </div>
  )
}

// ============================================================
// 出道倒计时 — 脉冲预警
// ============================================================

function DebutCountdown() {
  const debutCountdown = useGameStore((s) => s.debutCountdown)
  const isWarning = debutCountdown <= 6

  return (
    <div className={`xm-card${isWarning ? ' xm-neon-pulse' : ''}`} style={{ padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: isWarning ? '#ffd700' : 'var(--text-secondary)' }}>
        <span>🎤</span>
        <span>出道倒计时:</span>
        <span style={{ fontWeight: 600, color: isWarning ? '#ffd700' : 'var(--text-primary)' }}>
          {debutCountdown}月
        </span>
      </div>
    </div>
  )
}

// ============================================================
// 角色选择列表 — 3 练习生 + 1 对手
// ============================================================

function CharacterList() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const currentMonth = useGameStore((s) => s.currentMonth)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const selectCharacter = useGameStore((s) => s.selectCharacter)

  const available = getAvailableCharacters(currentMonth, characters)

  return (
    <div className="xm-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>角色</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {Object.keys(available).length}人
        </span>
      </div>
      <div className="xm-char-list" style={{ flex: 1 }}>
        {Object.entries(available).map(([charId, char]) => {
          const stats = characterStats[charId]
          const firstMeta = char.statMetas[0]
          const firstStatValue = stats?.[firstMeta?.key] ?? 0

          return (
            <button
              key={charId}
              className={`xm-char-item ${currentCharacter === charId ? 'active' : ''}`}
              onClick={() => selectCharacter(currentCharacter === charId ? null : charId)}
            >
              <span style={{ flex: 1, color: currentCharacter === charId ? char.themeColor : undefined }}>
                {char.name}
                {!char.isTrainee && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>对手</span>}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {firstMeta?.icon}{firstStatValue}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 左侧面板主组件
// ============================================================

export default function LeftPanel() {
  return (
    <div
      className="xm-scrollbar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '12px 0 12px 12px',
        height: '100%',
        background: 'var(--bg-secondary)',
        overflowY: 'auto',
      }}
    >
      <SceneCard />
      <SceneSelector />
      <PortraitCard />
      <InfoCard />
      <GlobalResourceBar />
      <DebutCountdown />
      <CharacterList />
    </div>
  )
}
