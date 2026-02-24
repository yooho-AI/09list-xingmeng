/**
 * [INPUT]: 依赖 @/lib/store, @/lib/hooks, @/lib/bgm, framer-motion, 游戏组件
 * [OUTPUT]: 对外提供 App 根组件（独立 SPA，无路由依赖）
 * [POS]: 星梦事务所项目入口，StartScreen ↔ GameScreen 状态切换
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, ENDINGS, PERIODS } from '@/lib/store'
import { useIsMobile } from '@/lib/hooks'
import { useBgm } from '@/lib/bgm'
import DialoguePanel from '@/components/game/dialogue-panel'
import LeftPanel from '@/components/game/character-panel'
import RightPanel from '@/components/game/side-panel'
import MobileGameLayout from '@/components/game/mobile-layout'
import '@/styles/globals.css'

// ============================================================
// 练习生预览数据 — 开始画面用，与 store 解耦
// ============================================================

const TRAINEE_PREVIEW = [
  { id: 'minsu', name: '金敏秀', color: '#3b82f6', icon: '🎤', role: '主唱' },
  { id: 'jiyeon', name: '朴智妍', color: '#ec4899', icon: '💃', role: '主舞' },
  { id: 'seonghoon', name: '崔成勋', color: '#fbbf24', icon: '🎭', role: '综艺' },
] as const

// ============================================================
// 结局类型映射 — 消除 if/else 分支
// ============================================================

const ENDING_TYPE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  TE: { label: '⭐ True Ending', color: '#ffd700', icon: '👑' },
  HE: { label: '🎉 Happy Ending', color: '#e91e8c', icon: '🌟' },
  BE: { label: '💀 Bad Ending', color: '#6b7280', icon: '💔' },
  NE: { label: '🌙 Normal Ending', color: '#f59e0b', icon: '🌙' },
}

// ============================================================
// 开始界面 — 暗色霓虹 K-pop
// ============================================================

function StartScreen() {
  const setPlayerInfo = useGameStore((s) => s.setPlayerInfo)
  const initGame = useGameStore((s) => s.initGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const hasSave = useGameStore((s) => s.hasSave)
  const { toggle, isPlaying } = useBgm()

  const [gender, setGender] = useState<'male' | 'female' | 'unspecified'>('unspecified')
  const [name, setName] = useState('')

  const handleStart = () => {
    setPlayerInfo(gender, name || '玩家')
    initGame()
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#0f0f23]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-lg px-6 text-center"
      >
        {/* 标题 */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="mb-6 text-5xl"
        >
          ⭐
        </motion.div>
        <h1 className="mb-2 text-2xl font-bold text-[#f0f0ff]">首尔星梦事务所</h1>
        <p className="mb-1 text-sm text-[#e91e8c]/80">Seoul Star Dream Agency · K-pop 养成冒险</p>
        <p className="mb-8 text-xs leading-relaxed text-[#8888aa]">
          继承姑姑的练习生事务所，36个月培养练习生出道...
        </p>

        {/* 性别选择 — 三选 */}
        <div className="mb-4 flex justify-center gap-3">
          {([
            { value: 'male' as const, label: '男' },
            { value: 'female' as const, label: '女' },
            { value: 'unspecified' as const, label: '不指定' },
          ]).map((g) => (
            <button
              key={g.value}
              onClick={() => setGender(g.value)}
              className="rounded-full px-5 py-2 text-sm font-medium transition-all"
              style={{
                background: gender === g.value ? 'linear-gradient(135deg, #e91e8c 0%, #c2185b 100%)' : 'transparent',
                color: gender === g.value ? '#fff' : '#8888aa',
                border: gender === g.value ? '1px solid transparent' : '1px solid rgba(233,30,140,0.25)',
                boxShadow: gender === g.value ? '0 2px 12px rgba(233,30,140,0.3)' : 'none',
              }}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* 名字输入 */}
        <div className="mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的名字..."
            maxLength={8}
            className="w-full max-w-[240px] rounded-lg border px-4 py-2 text-center text-sm outline-none transition-all"
            style={{
              background: 'rgba(15, 15, 35, 0.8)',
              borderColor: 'rgba(233, 30, 140, 0.25)',
              color: '#f0f0ff',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#e91e8c' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(233, 30, 140, 0.25)' }}
          />
        </div>

        {/* 练习生预览 */}
        <div className="mb-8 flex justify-center gap-5">
          {TRAINEE_PREVIEW.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="w-[72px] text-center"
            >
              <div
                className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-lg"
                style={{
                  border: `2px solid ${t.color}`,
                  background: `${t.color}18`,
                }}
              >
                {t.icon}
              </div>
              <div className="text-xs font-medium text-[#f0f0ff]">{t.name}</div>
              <div className="text-[10px] text-[#8888aa]">{t.role}</div>
            </motion.div>
          ))}
        </div>

        {/* 按钮组 */}
        <div className="flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            className="w-full rounded-full px-8 py-3 text-sm font-medium text-white shadow-lg transition-shadow"
            style={{
              background: 'linear-gradient(135deg, #e91e8c 0%, #c2185b 100%)',
              boxShadow: '0 4px 16px rgba(233, 30, 140, 0.3)',
            }}
          >
            接管事务所
          </motion.button>

          {hasSave() && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => loadGame()}
              className="w-full rounded-full border px-8 py-3 text-sm font-medium transition-colors"
              style={{
                borderColor: 'rgba(233, 30, 140, 0.2)',
                color: '#8888aa',
              }}
            >
              继续游戏
            </motion.button>
          )}
        </div>

        {/* 音乐按钮 */}
        <button
          onClick={(e) => toggle(e)}
          className="mt-4 text-xs text-[#555577] transition-colors hover:text-[#8888aa]"
        >
          {isPlaying ? '🔊 音乐开' : '🔇 音乐关'}
        </button>
      </motion.div>
    </div>
  )
}

// ============================================================
// 顶部状态栏 — 月份 + 时段 + 出道倒计时 + 全局资源
// ============================================================

function HeaderBar({ onMenuClick }: { onMenuClick: () => void }) {
  const currentMonth = useGameStore((s) => s.currentMonth)
  const currentPeriodIndex = useGameStore((s) => s.currentPeriodIndex)
  const debutCountdown = useGameStore((s) => s.debutCountdown)
  const globalResources = useGameStore((s) => s.globalResources)
  const { toggle, isPlaying } = useBgm()

  const period = PERIODS[currentPeriodIndex]
  const debutWarning = debutCountdown <= 6

  return (
    <header
      className="relative z-10 flex min-h-[44px] items-center justify-between gap-2 px-4 py-2"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* 左侧：月份 + 时段 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
          ⭐ 第{currentMonth}月
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {period?.icon} {period?.name}
        </span>
      </div>

      {/* 右侧：出道倒计时 + 资源 + 音乐 + 菜单 */}
      <div className="flex items-center gap-1">
        <span
          className={`rounded-md px-2 py-1 text-xs ${debutWarning ? 'xm-neon-pulse' : ''}`}
          style={{
            color: debutWarning ? '#ffd700' : 'var(--text-muted)',
          }}
        >
          🎤 {debutCountdown}月
        </span>

        <span className="rounded-md px-2 py-1 text-xs" style={{ color: '#ffd700' }}>
          💰{globalResources.money}
        </span>

        <span className="rounded-md px-2 py-1 text-xs" style={{ color: '#e91e8c' }}>
          ⭐{globalResources.fame}
        </span>

        <button
          onClick={(e) => toggle(e)}
          className="rounded px-3 py-2 text-sm transition-all"
          style={{ color: 'var(--text-muted)' }}
          title={isPlaying ? '关闭音乐' : '开启音乐'}
        >
          {isPlaying ? '🔊' : '🔇'}
        </button>

        <button
          onClick={onMenuClick}
          className="rounded px-3 py-2 text-sm transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(233,30,140,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          title="菜单"
        >
          ☰
        </button>
      </div>
    </header>
  )
}

// ============================================================
// 菜单弹窗
// ============================================================

function MenuOverlay({ onClose }: { onClose: () => void }) {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const resetGame = useGameStore((s) => s.resetGame)

  return (
    <div className="xm-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="xm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, margin: '0 0 16px', textAlign: 'center' }}
        >
          游戏菜单
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="xm-modal-btn" onClick={() => { saveGame(); onClose() }}>💾 保存游戏</button>
          <button className="xm-modal-btn" onClick={() => { loadGame(); onClose() }}>📂 读取存档</button>
          <button className="xm-modal-btn" onClick={() => resetGame()}>🏠 返回标题</button>
          <button className="xm-modal-btn" onClick={onClose}>▶️ 继续游戏</button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================
// 结局弹窗 — 数据驱动，无 if/else
// ============================================================

function EndingModal() {
  const endingType = useGameStore((s) => s.endingType)
  const resetGame = useGameStore((s) => s.resetGame)

  const ending = ENDINGS.find((e) => e.id === endingType)
  if (!ending) return null

  const meta = ENDING_TYPE_MAP[ending.type] ?? ENDING_TYPE_MAP.NE

  return (
    <div className="xm-ending-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="xm-ending-modal"
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {meta.icon}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: meta.color, marginBottom: 8, letterSpacing: 2 }}>
          {meta.label}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px', letterSpacing: 1 }}>
          {ending.name}
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {ending.description}
        </p>
        <button
          onClick={() => resetGame()}
          style={{
            padding: '10px 32px',
            borderRadius: 99,
            border: 'none',
            background: 'linear-gradient(135deg, #e91e8c 0%, #c2185b 100%)',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(233, 30, 140, 0.3)',
          }}
        >
          返回标题
        </button>
      </motion.div>
    </div>
  )
}

// ============================================================
// 通知
// ============================================================

function Notification({ text, type }: { text: string; type: string }) {
  return (
    <div className={`xm-notification ${type}`}>
      <span>{type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
      <span>{text}</span>
    </div>
  )
}

// ============================================================
// PC 游戏主屏幕 — 三栏布局
// ============================================================

function GameScreen() {
  const [showMenu, setShowMenu] = useState(false)
  const [notification, setNotification] = useState<{ text: string; type: string } | null>(null)
  const endingType = useGameStore((s) => s.endingType)

  const showNotif = useCallback((text: string, type = 'info') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 2000)
  }, [])
  void showNotif

  return (
    <div
      className="flex h-screen flex-col"
      style={{ background: 'var(--bg-secondary)', fontFamily: 'var(--font)' }}
    >
      <HeaderBar onMenuClick={() => setShowMenu(true)} />

      <main className="flex flex-1 overflow-hidden">
        <aside className="w-[280px] shrink-0">
          <LeftPanel />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DialoguePanel />
        </section>
        <aside className="shrink-0">
          <RightPanel />
        </aside>
      </main>

      <AnimatePresence>
        {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} />}
      </AnimatePresence>

      {endingType && <EndingModal />}

      <AnimatePresence>
        {notification && (
          <motion.div
            key="notif"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Notification text={notification.text} type={notification.type} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// App 根组件
// ============================================================

export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const isMobile = useIsMobile()

  return (
    <AnimatePresence mode="wait">
      {gameStarted ? (
        <motion.div
          key="game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="h-screen"
        >
          {isMobile ? <MobileGameLayout /> : <GameScreen />}
        </motion.div>
      ) : (
        <motion.div key="start" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <StartScreen />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
