/**
 * [INPUT]: 依赖 store.ts 状态（角色/场景/全局资源/道具）, bgm.ts
 * [OUTPUT]: 对外提供 DashboardDrawer 组件
 * [POS]: 练习生手帐(左抽屉)：扉页+练习生速览+角色轮播+场景缩略图+训练目标+道具格+迷你播放器。Reorder拖拽排序
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef } from 'react'
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion'
import {
  useGameStore,
  SCENES,
  ITEMS,
  CHAPTERS,
  PERIODS,
} from '@/lib/store'
import { useBgm } from '@/lib/bgm'

const P = 'xm'
const DASH_ORDER_KEY = 'xm-dash-order'
const DEFAULT_ORDER = ['front', 'trainees', 'cast', 'scenes', 'goals', 'items', 'music']

// ── DragHandle ──────────────────────────────────────────

function DragHandle({ controls }: { controls: ReturnType<typeof useDragControls> }) {
  return (
    <div onPointerDown={(e) => controls.start(e)} style={{ cursor: 'grab', touchAction: 'none', padding: 4 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--text-muted)">
        <rect y="3" width="16" height="2" rx="1" />
        <rect y="7" width="16" height="2" rx="1" />
        <rect y="11" width="16" height="2" rx="1" />
      </svg>
    </div>
  )
}

// ── Section wrapper ─────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={id} dragListener={false} dragControls={controls}>
      <div className={`${P}-dash-section`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
          <DragHandle controls={controls} />
        </div>
        {children}
      </div>
    </Reorder.Item>
  )
}

// ── FrontPage ───────────────────────────────────────────

function FrontPage() {
  const { currentMonth, currentPeriodIndex, actionPoints, debutCountdown } = useGameStore()
  const chapter = CHAPTERS.find((c) => currentMonth >= c.monthRange[0] && currentMonth <= c.monthRange[1]) || CHAPTERS[0]
  const period = PERIODS[currentPeriodIndex] || PERIODS[0]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(233,30,140,0.06)' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gold)', lineHeight: 1, minWidth: 44, textAlign: 'center' }}>
        {currentMonth}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <span>{period.icon}</span>
          <span style={{ color: 'var(--text-primary)' }}>{period.name}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>· {chapter.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} style={{ fontSize: 14, color: i < actionPoints ? 'var(--gold)' : 'var(--text-muted)' }}>
              {i < actionPoints ? '★' : '☆'}
            </span>
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>行动力</span>
        </div>
        <div style={{ fontSize: 11, color: debutCountdown <= 6 ? 'var(--gold)' : 'var(--text-muted)', marginTop: 2 }}>
          🎤 出道倒计时 {debutCountdown}月
        </div>
      </div>
    </div>
  )
}

// ── TraineeOverview ─────────────────────────────────────

function TraineeOverview() {
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const trainees = Object.entries(characters).filter(([, c]) => c.isTrainee)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {trainees.map(([id, char]) => {
        const trust = characterStats[id]?.trust ?? 0
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: char.themeColor, fontWeight: 600, minWidth: 48 }}>{char.name}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
              <div style={{ width: `${trust}%`, height: '100%', borderRadius: 3, background: char.themeColor, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: char.themeColor, fontVariantNumeric: 'tabular-nums', minWidth: 22, textAlign: 'right' }}>{trust}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── CastGallery ─────────────────────────────────────────

function CastGallery() {
  const { characters, characterStats, selectCharacter, toggleDashboard } = useGameStore()
  const charEntries = Object.entries(characters)
  const [idx, setIdx] = useState(0)
  const touchX = useRef(0)

  if (charEntries.length === 0) return null
  const [charId, char] = charEntries[idx]
  const trust = characterStats[charId]?.trust ?? 0

  return (
    <div>
      <div
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchX.current
          if (dx < -50 && idx < charEntries.length - 1) setIdx(idx + 1)
          else if (dx > 50 && idx > 0) setIdx(idx - 1)
        }}
        style={{ overflow: 'hidden' }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}
            onClick={() => { selectCharacter(charId); toggleDashboard() }}
            style={{ display: 'flex', gap: 10, cursor: 'pointer', padding: '4px 0' }}>
            <div style={{ width: 80, height: 120, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `2px solid ${char.themeColor}` }}>
              <img src={char.portrait} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: char.themeColor }}>{char.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{char.title} · {char.age}岁</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>信任</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                  <div style={{ width: `${trust}%`, height: '100%', borderRadius: 3, background: char.themeColor, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: char.themeColor, fontVariantNumeric: 'tabular-nums', minWidth: 22, textAlign: 'right' }}>{trust}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 6 }}>
        {charEntries.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{
            width: i === idx ? 16 : 6, height: 6, borderRadius: 3, border: 'none', padding: 0,
            background: i === idx ? 'var(--primary)' : 'rgba(255,255,255,0.1)', transition: 'all 0.2s', cursor: 'pointer',
          }} />
        ))}
      </div>
    </div>
  )
}

// ── SceneMap ─────────────────────────────────────────────

function SceneMap() {
  const { currentScene, unlockedScenes, selectScene, toggleDashboard } = useGameStore()
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
      {Object.entries(SCENES).map(([sid, scene]) => {
        const locked = !unlockedScenes.includes(sid), current = sid === currentScene
        return (
          <button key={sid} disabled={locked} onClick={() => { if (!locked && !current) { selectScene(sid); toggleDashboard() } }}
            style={{ flexShrink: 0, width: 100, border: 'none', background: 'none', padding: 0, cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.4 : 1 }}>
            <div style={{ width: 100, height: 56, borderRadius: 6, overflow: 'hidden', position: 'relative', border: current ? '2px solid var(--primary)' : '2px solid transparent' }}>
              <img src={scene.background} alt={scene.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: locked ? 'blur(4px) grayscale(1)' : 'none' }} />
              {locked && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', fontSize: 18 }}>🔒</div>}
            </div>
            <div style={{ fontSize: 11, marginTop: 3, textAlign: 'center', color: current ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: current ? 600 : 400 }}>
              {scene.icon} {scene.name}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── TrainingGoals ───────────────────────────────────────

function TrainingGoals() {
  const characters = useGameStore((s) => s.characters)
  const stats = useGameStore((s) => s.characterStats)
  const money = useGameStore((s) => s.globalResources.money)
  const fame = useGameStore((s) => s.globalResources.fame)

  const traineeIds = Object.entries(characters).filter(([, c]) => c.isTrainee).map(([id]) => id)
  const avgTrust = traineeIds.reduce((sum, id) => sum + (stats[id]?.trust ?? 0), 0) / (traineeIds.length || 1)
  const avgSkill = traineeIds.reduce((sum, id) => {
    const s = stats[id]
    return sum + ((s?.dance ?? 0) + (s?.singing ?? 0) + (s?.variety ?? 0)) / 3
  }, 0) / (traineeIds.length || 1)

  const goals = [
    { label: '全员信任≥50', done: avgTrust >= 50 },
    { label: '综合技能≥40', done: avgSkill >= 40 },
    { label: '资金充裕', done: money >= 100 },
    { label: '名声远扬', done: fame >= 50 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {goals.map(({ label, done }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: done ? 'var(--primary)' : 'var(--text-muted)' }}>
          <span style={{
            width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${done ? 'var(--primary)' : 'var(--text-muted)'}`, background: done ? 'rgba(233,30,140,0.15)' : 'transparent', fontSize: 11, fontWeight: 700,
          }}>{done ? '✓' : ''}</span>
          <span style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── ItemGrid ────────────────────────────────────────────

function ItemGrid() {
  const inventory = useGameStore((s) => s.inventory)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {Object.values(ITEMS).map((item) => {
        const qty = inventory[item.id] ?? 0
        return (
          <div key={item.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 4px',
            borderRadius: 8, background: 'rgba(233,30,140,0.04)', opacity: qty <= 0 ? 0.35 : 1, position: 'relative',
          }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center' }}>{item.name}</span>
            {qty > 0 && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'rgba(233,30,140,0.08)', borderRadius: 6, padding: '0 4px', lineHeight: '16px' }}>{qty}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── MiniPlayer ──────────────────────────────────────────

function MiniPlayer() {
  const { isPlaying, toggle } = useBgm()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <button onClick={(e) => toggle(e)} style={{
        width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: isPlaying ? 'var(--primary)' : 'rgba(255,255,255,0.06)', color: isPlaying ? '#fff' : 'var(--text-secondary)', fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
      }}>
        {isPlaying ? '⏸' : '♪'}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>星梦之声</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isPlaying ? '播放中' : '已暂停'}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 18 }}>
        {[0.6, 1, 0.7, 0.9, 0.5].map((s, i) => (
          <div key={i} className={`${P}-wave-bar`} style={{
            height: isPlaying ? `${s * 100}%` : '20%',
            animation: isPlaying ? `xm-wave ${0.4 + i * 0.1}s ease-in-out infinite alternate` : 'none',
          }} />
        ))}
      </div>
    </div>
  )
}

// ── DashboardDrawer ─────────────────────────────────────

const SECTION_TITLES: Record<string, string> = {
  front: '月度概览', trainees: '练习生信任', cast: '成员档案',
  scenes: '场景地图', goals: '训练目标', items: '道具', music: '音乐',
}

export default function DashboardDrawer() {
  const showDashboard = useGameStore((s) => s.showDashboard)
  const toggleDashboard = useGameStore((s) => s.toggleDashboard)
  const globalResources = useGameStore((s) => s.globalResources)

  const [order, setOrder] = useState<string[]>(() => {
    try { const s = localStorage.getItem(DASH_ORDER_KEY); if (s) { const a = JSON.parse(s); if (DEFAULT_ORDER.every((k) => a.includes(k))) return a } } catch {}
    return [...DEFAULT_ORDER]
  })

  const handleReorder = (v: string[]) => { setOrder(v); localStorage.setItem(DASH_ORDER_KEY, JSON.stringify(v)) }

  const renderSection = (id: string) => {
    switch (id) {
      case 'front': return <FrontPage />
      case 'trainees': return <TraineeOverview />
      case 'cast': return <CastGallery />
      case 'scenes': return <SceneMap />
      case 'goals': return <TrainingGoals />
      case 'items': return <ItemGrid />
      case 'music': return <MiniPlayer />
      default: return null
    }
  }

  return (
    <AnimatePresence>
      {showDashboard && (<>
        <motion.div className={`${P}-dashboard-backdrop`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={toggleDashboard} />
        <motion.div className={`${P}-dashboard`} initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <header style={{ padding: '14px 16px 10px', flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>📓 练习生手帐</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>首尔星梦事务所</div>
            </div>
            <button onClick={toggleDashboard} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
          </header>

          {/* Resource pills */}
          <div style={{ display: 'flex', gap: 6, padding: '8px 16px', flexWrap: 'wrap', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 12, background: 'rgba(255,215,0,0.08)', fontSize: 11, color: 'var(--gold)' }}>
              <span>💰</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{globalResources.money}万</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 12, background: 'rgba(233,30,140,0.08)', fontSize: 11, color: 'var(--primary)' }}>
              <span>⭐</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{globalResources.fame}</span>
            </div>
          </div>

          {/* Scrollable sections */}
          <div className={`${P}-scrollbar`} style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
            <Reorder.Group axis="y" values={order} onReorder={handleReorder} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {order.map((id) => (
                <Section key={id} id={id} title={SECTION_TITLES[id] || id}>
                  {renderSection(id)}
                </Section>
              ))}
            </Reorder.Group>
          </div>
        </motion.div>
      </>)}
    </AnimatePresence>
  )
}
