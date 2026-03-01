/**
 * [INPUT]: 依赖 @/lib/store, @/lib/bgm, framer-motion, AppShell
 * [OUTPUT]: 对外提供 App 根组件（独立 SPA，无路由依赖）
 * [POS]: 星梦事务所项目入口，StartScreen ↔ AppShell + EndingModal + MenuOverlay
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, ENDINGS, ENDING_TYPE_MAP } from '@/lib/store'
import { useBgm } from '@/lib/bgm'
import { MusicNotes } from '@phosphor-icons/react'
import AppShell from '@/components/game/app-shell'
import '@/styles/globals.css'
import '@/styles/opening.css'
import '@/styles/rich-cards.css'

// ============================================================
// 练习生预览数据 — 开始画面用，与 store 解耦
// ============================================================

const TRAINEE_PREVIEW = [
  { id: 'minsu', name: '金敏秀', color: '#3b82f6', icon: '🎤', role: '主唱' },
  { id: 'jiyeon', name: '朴智妍', color: '#ec4899', icon: '💃', role: '主舞' },
  { id: 'seonghoon', name: '崔成勋', color: '#fbbf24', icon: '🎭', role: '综艺' },
] as const

// ============================================================
// 开始界面 — 暗色霓虹 K-pop（保留原设计，迁移为 CSS 类）
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
    <div className="xm-start-screen">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="xm-start-content"
      >
        {/* 标题 */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="xm-start-icon"
        >
          ⭐
        </motion.div>
        <h1 className="xm-start-title">首尔星梦事务所</h1>
        <p className="xm-start-subtitle">Seoul Star Dream Agency · K-pop 养成冒险</p>
        <p className="xm-start-desc">
          继承姑姑的练习生事务所，36个月培养练习生出道...
        </p>

        {/* 性别选择 */}
        <div className="xm-start-gender-group">
          {([
            { value: 'male' as const, label: '男' },
            { value: 'female' as const, label: '女' },
            { value: 'unspecified' as const, label: '不指定' },
          ]).map((g) => (
            <button
              key={g.value}
              onClick={() => setGender(g.value)}
              className={`xm-start-gender-btn ${gender === g.value ? 'xm-start-gender-active' : ''}`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* 名字输入 */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="你的名字..."
          maxLength={8}
          className="xm-start-name-input"
        />

        {/* 练习生预览 */}
        <div className="xm-start-trainee-row">
          {TRAINEE_PREVIEW.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="xm-start-trainee-card"
            >
              <div
                className="xm-start-trainee-icon"
                style={{
                  border: `2px solid ${t.color}`,
                  background: `${t.color}18`,
                }}
              >
                {t.icon}
              </div>
              <div className="xm-start-trainee-name">{t.name}</div>
              <div className="xm-start-trainee-role">{t.role}</div>
            </motion.div>
          ))}
        </div>

        {/* 按钮组 */}
        <button className="xm-start-cta" onClick={handleStart}>
          接管事务所
        </button>

        {hasSave() && (
          <button className="xm-start-continue" onClick={() => loadGame()}>
            继续游戏
          </button>
        )}

        {/* 音乐按钮 */}
        <button className="xm-start-music" onClick={(e) => toggle(e)}>
          <MusicNotes size={14} weight="fill" style={{ verticalAlign: -2, marginRight: 4 }} />
          {isPlaying ? '音乐开' : '音乐关'}
        </button>
      </motion.div>
    </div>
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
        <h2 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, margin: '0 0 16px', textAlign: 'center' }}>
          游戏菜单
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="xm-modal-btn" onClick={() => { saveGame(); onClose() }}>💾 保存游戏</button>
          <button className="xm-modal-btn" onClick={() => { loadGame(); onClose() }}>📂 读取存档</button>
          <button className="xm-modal-btn" onClick={() => resetGame()}>🏠 返回标题</button>
          <button className="xm-modal-btn" onClick={() => window.open('https://yooho.ai/', '_blank')}>🌐 返回主页</button>
          <button className="xm-modal-btn" onClick={onClose}>▶️ 继续游戏</button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================
// 结局弹窗 — 数据驱动，双按钮
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          <button
            onClick={() => useGameStore.setState({ endingType: null })}
            style={{
              padding: '10px 32px',
              borderRadius: 99,
              border: '1px solid rgba(233, 30, 140, 0.25)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            继续探索
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================
// App 根组件 — 无 isMobile 分叉，统一 AppShell
// ============================================================

export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const endingType = useGameStore((s) => s.endingType)
  const [showMenu, setShowMenu] = useState(false)

  return (
    <AnimatePresence mode="wait">
      {gameStarted ? (
        <motion.div
          key="game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ height: '100vh' }}
        >
          <AppShell onMenuOpen={() => setShowMenu(true)} />

          <AnimatePresence>
            {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} />}
          </AnimatePresence>

          {endingType && <EndingModal />}
        </motion.div>
      ) : (
        <motion.div key="start" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <StartScreen />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
