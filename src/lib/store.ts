/**
 * [INPUT]: 依赖 script.md(?raw), stream.ts, data.ts, parser.ts, analytics.ts
 * [OUTPUT]: 对外提供 useGameStore + re-export data.ts
 * [POS]: 状态中枢：Zustand+Immer，剧本直通+富消息+双轨解析+选项系统+存档
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import GAME_SCRIPT from './script.md?raw'
import { streamChat } from './stream'
import {
  type Character,
  type CharacterStats,
  type Message,
  type StoryRecord,
  type GlobalResources,
  SCENES, ITEMS, PERIODS,
  MAX_MONTHS, MAX_ACTION_POINTS, INITIAL_MONEY, MONTHLY_EXPENSE,
  QUICK_ACTIONS, STORY_INFO,
  buildCharacters, getAvailableCharacters,
  getCurrentChapter, getMonthEvents,
} from './data'
import { parseStoryParagraph, extractChoices } from './parser'
import {
  trackGameStart, trackGameContinue, trackTimeAdvance,
  trackChapterEnter, trackPlayerCreate, trackBankrupt,
  trackEndingReached, trackSceneUnlock, trackStressCrisis,
} from './analytics'

// ── Re-export data.ts ────────────────────────────────
export {
  type Character,
  type CharacterStats,
  type Message,
  type StoryRecord,
  type GlobalResources,
  type TimePeriod,
  type StatMeta,
  type Scene,
  type GameItem,
  type Chapter,
  type ForcedEvent,
  type Ending,
  PERIODS, MAX_MONTHS, MAX_ACTION_POINTS,
  SCENES, ITEMS, CHAPTERS, FORCED_EVENTS, ENDINGS,
  ENDING_TYPE_MAP, STORY_INFO, QUICK_ACTIONS,
  buildCharacters, getStatLevel, getAvailableCharacters, getCurrentChapter,
} from './data'
export { parseStoryParagraph, extractChoices } from './parser'

// ── Helpers ──────────────────────────────────────────

let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`
const SAVE_KEY = 'xingmeng-save-v1'
const HISTORY_COMPRESS_THRESHOLD = 15

function buildInitialStats(characters: Record<string, Character>): Record<string, CharacterStats> {
  return Object.fromEntries(
    Object.entries(characters).map(([id, char]) => [id, { ...char.initialStats }])
  )
}

// ── State / Actions ──────────────────────────────────

interface GameState {
  gameStarted: boolean
  playerGender: 'male' | 'female' | 'unspecified'
  playerName: string
  characters: Record<string, Character>

  currentMonth: number
  currentPeriodIndex: number
  actionPoints: number

  currentScene: string
  currentCharacter: string | null
  characterStats: Record<string, CharacterStats>
  unlockedScenes: string[]

  globalResources: GlobalResources
  currentChapter: number
  triggeredEvents: string[]
  monthlyExpense: number
  debutCountdown: number
  inventory: Record<string, number>

  messages: Message[]
  historySummary: string
  isTyping: boolean
  streamingContent: string

  endingType: string | null

  activeTab: 'dialogue' | 'scene' | 'character'
  choices: string[]

  showDashboard: boolean
  showRecords: boolean
  storyRecords: StoryRecord[]
}

interface GameActions {
  setPlayerInfo: (gender: 'male' | 'female' | 'unspecified', name: string) => void
  initGame: () => void
  selectCharacter: (id: string) => void
  selectScene: (id: string) => void
  setActiveTab: (tab: 'dialogue' | 'scene' | 'character') => void
  toggleDashboard: () => void
  toggleRecords: () => void
  sendMessage: (content: string) => Promise<void>
  advanceTime: () => void
  useItem: (itemId: string) => void
  checkEnding: () => void
  addSystemMessage: (content: string) => void
  resetGame: () => void
  saveGame: () => void
  loadGame: () => boolean
  hasSave: () => boolean
  clearSave: () => void
}

type GameStore = GameState & GameActions

// ── Dual-track parseStatChanges ──────────────────────

const GLOBAL_ALIASES: Record<string, string> = {
  '金钱': 'money', '资金': 'money', '经费': 'money',
  '名声': 'fame', '声望': 'fame', '名气': 'fame',
}

interface StatChangeResult {
  charChanges: Array<{ charId: string; stat: string; delta: number }>
  globalChanges: Array<{ resource: string; delta: number }>
}

function parseStatChanges(
  content: string,
  characters: Record<string, Character>,
): StatChangeResult {
  const charChanges: StatChangeResult['charChanges'] = []
  const globalChanges: StatChangeResult['globalChanges'] = []

  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
  }

  const labelToKey: Record<string, { charId: string; key: string }> = {}
  for (const [id, char] of Object.entries(characters)) {
    for (const meta of char.statMetas) {
      labelToKey[meta.label] = { charId: id, key: meta.key }
      labelToKey[`${meta.label}度`] = { charId: id, key: meta.key }
      labelToKey[`${meta.label}值`] = { charId: id, key: meta.key }
    }
  }

  // 【角色名 数值名+N】
  const regex = /[【\[]([^\]】]+?)\s*(\S+?)([+-])(\d+)[】\]]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const prefix = match[1].trim()
    const label = match[2]
    const delta = parseInt(match[4]) * (match[3] === '+' ? 1 : -1)

    const globalKey = GLOBAL_ALIASES[prefix] || GLOBAL_ALIASES[label]
    if (globalKey && !nameToId[prefix]) {
      globalChanges.push({ resource: globalKey, delta })
      continue
    }

    const charId = nameToId[prefix]
    if (charId) {
      const char = characters[charId]
      const meta = char?.statMetas.find(
        (m) => label === m.label || label === `${m.label}度` || label === `${m.label}值`
      )
      if (meta) {
        charChanges.push({ charId, stat: meta.key, delta })
      }
    } else {
      const info = labelToKey[prefix] || labelToKey[label]
      if (info) {
        charChanges.push({ charId: info.charId, stat: info.key, delta })
      }
    }
  }

  // 【金钱+20】
  const simpleRegex = /[【\[]([^\s\]】+-]+?)([+-])(\d+)[万]?[】\]]/g
  let simpleMatch
  while ((simpleMatch = simpleRegex.exec(content)) !== null) {
    const label = simpleMatch[1].trim()
    const delta = parseInt(simpleMatch[3]) * (simpleMatch[2] === '+' ? 1 : -1)
    const globalKey = GLOBAL_ALIASES[label]
    if (globalKey) {
      const already = globalChanges.some(
        (g) => g.resource === globalKey && g.delta === delta
      )
      if (!already) globalChanges.push({ resource: globalKey, delta })
    }
  }

  return { charChanges, globalChanges }
}

// ── buildSystemPrompt — Script-through ───────────────

function buildSystemPrompt(state: GameState): string {
  const char = state.currentCharacter
    ? state.characters[state.currentCharacter]
    : null
  const chapter = getCurrentChapter(state.currentMonth)
  const scene = SCENES[state.currentScene]
  const period = PERIODS[state.currentPeriodIndex] || PERIODS[0]
  const availableChars = getAvailableCharacters(state.currentMonth, state.characters)

  const allStats = Object.entries(availableChars)
    .map(([id, c]) => {
      const s = state.characterStats[id]
      const statStr = c.statMetas
        .map((m) => `${m.label}${s?.[m.key] ?? 0}`)
        .join(' ')
      return `${c.name}(${c.isTrainee ? '练习生' : '对手'}): ${statStr}`
    })
    .join('\n')

  const genderCall = state.playerGender === 'male'
    ? '（NPC称呼: 哥/社长/老板）'
    : state.playerGender === 'female'
      ? '（NPC称呼: 姐/社长/老板）'
      : '（NPC称呼: 老师/社长/老板）'

  return `你是《${STORY_INFO.title}》的AI叙述者。

## 游戏剧本
${GAME_SCRIPT}

## 当前状态
玩家「${state.playerName}」${genderCall}
第${state.currentMonth}/${MAX_MONTHS}月 · ${period.name}
第${chapter.id}章「${chapter.name}」— ${chapter.description}
当前场景：${scene?.name || '练习室'}
${char ? `当前交互角色：${char.name}（${char.title}）` : ''}
行动力：${state.actionPoints}/${MAX_ACTION_POINTS}
出道倒计时：${state.debutCountdown}月

## 当前数值
💰 金钱：${state.globalResources.money}万韩元（月支出${state.monthlyExpense}万）
⭐ 名声：${state.globalResources.fame}

角色数值:
${allStats}

## 背包
${Object.entries(state.inventory).filter(([, v]) => v > 0).map(([k, v]) => {
  const item = ITEMS[k]
  return item ? `${item.icon} ${item.name} x${v}` : ''
}).filter(Boolean).join('、') || '空'}

## 已触发事件
${state.triggeredEvents.join('、') || '无'}

## 历史摘要
${state.historySummary || '旅程刚刚开始'}

## 选项系统（必须严格遵守）
每次回复末尾必须给出恰好4个行动选项，格式严格如下：
1. 选项文本（简洁，15字以内）
2. 选项文本
3. 选项文本
4. 选项文本
规则：
- 必须恰好4个，不能多也不能少
- 选项前不要加"你的选择"等标题行
- 选项应涵盖不同的情感策略和行动方向
- 每个选项要具体、有剧情推动力，不要笼统`
}

// ── Store ────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // ── Initial state ──
    gameStarted: false,
    playerGender: 'unspecified' as 'male' | 'female' | 'unspecified',
    playerName: '玩家',
    characters: {},

    currentMonth: 1,
    currentPeriodIndex: 0,
    actionPoints: MAX_ACTION_POINTS,

    currentScene: 'practice',
    currentCharacter: null,
    characterStats: {},
    unlockedScenes: ['practice', 'meeting', 'lounge', 'studio'],

    globalResources: { money: INITIAL_MONEY, fame: 0 },
    currentChapter: 1,
    triggeredEvents: [],
    monthlyExpense: MONTHLY_EXPENSE,
    debutCountdown: MAX_MONTHS,
    inventory: { 'aunt-note': 1 },

    messages: [],
    historySummary: '',
    isTyping: false,
    streamingContent: '',

    endingType: null,

    activeTab: 'dialogue',
    choices: [],

    showDashboard: false,
    showRecords: false,
    storyRecords: [],

    // ── Actions ──

    setPlayerInfo: (gender, name) => {
      set((s) => {
        s.playerGender = gender
        s.playerName = name || '玩家'
      })
      trackPlayerCreate(gender, name)
    },

    initGame: () => {
      const state = get()
      const chars = buildCharacters(state.playerGender)

      set((s) => {
        s.gameStarted = true
        s.characters = chars
        s.currentMonth = 1
        s.currentPeriodIndex = 0
        s.actionPoints = MAX_ACTION_POINTS
        s.currentScene = 'practice'
        s.currentCharacter = null
        s.characterStats = buildInitialStats(chars)
        s.currentChapter = 1
        s.triggeredEvents = []
        s.unlockedScenes = ['practice', 'meeting', 'lounge', 'studio']
        s.globalResources = { money: INITIAL_MONEY, fame: 0 }
        s.monthlyExpense = MONTHLY_EXPENSE
        s.debutCountdown = MAX_MONTHS
        s.inventory = { 'aunt-note': 1 }
        s.messages = []
        s.historySummary = ''
        s.endingType = null
        s.streamingContent = ''
        s.activeTab = 'dialogue'
        s.showDashboard = false
        s.showRecords = false
        s.storyRecords = []

        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `欢迎来到《首尔星梦事务所》！\n\n你是刚接管姑姑事务所的新任社长「${s.playerName}」。三位怀揣梦想的练习生正等着你的决定：这个事务所，还能继续吗？\n\n36个月的倒计时已经开始。`,
          timestamp: Date.now(),
        })

        s.storyRecords.push({
          id: `sr-${Date.now()}`,
          month: 1,
          period: '清晨',
          title: '接管事务所',
          content: `${s.playerName}正式接管姑姑的练习生事务所，出道倒计时开始。`,
        })

        s.choices = ['查看练习生档案', '巡视事务所', '翻看姑姑的笔记', '召开第一次会议']
      })

      trackGameStart()
    },

    selectCharacter: (charId) => {
      set((s) => {
        s.currentCharacter = charId
        s.activeTab = 'dialogue'
      })
    },

    selectScene: (sceneId) => {
      const state = get()
      if (state.currentScene === sceneId) return

      trackSceneUnlock(sceneId)

      set((s) => {
        s.currentScene = sceneId
        s.activeTab = 'dialogue'

        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `你来到了${SCENES[sceneId].name}。${SCENES[sceneId].atmosphere}`,
          timestamp: Date.now(),
          type: 'scene-transition',
          sceneId,
        })
      })
    },

    setActiveTab: (tab) => {
      set((s) => {
        s.activeTab = tab
        s.showDashboard = false
        s.showRecords = false
      })
    },

    toggleDashboard: () => {
      set((s) => {
        s.showDashboard = !s.showDashboard
        if (s.showDashboard) s.showRecords = false
      })
    },

    toggleRecords: () => {
      set((s) => {
        s.showRecords = !s.showRecords
        if (s.showRecords) s.showDashboard = false
      })
    },

    sendMessage: async (content) => {
      const state = get()
      if (state.isTyping || state.endingType) return

      set((s) => {
        s.messages.push({
          id: makeId(),
          role: 'user',
          content,
          timestamp: Date.now(),
        })
        s.isTyping = true
        s.streamingContent = ''
      })

      // Compress history if needed
      const currentState = get()
      if (currentState.messages.length > HISTORY_COMPRESS_THRESHOLD) {
        const oldMessages = currentState.messages.slice(0, -10)
        const summary = oldMessages
          .filter((m) => m.role !== 'system' || m.type)
          .map((m) => `[${m.role}] ${m.content.slice(0, 80)}`)
          .join('\n')

        set((s) => {
          s.historySummary = (s.historySummary + '\n' + summary).slice(-2000)
          s.messages = s.messages.slice(-10)
        })
      }

      const promptState = get()
      const systemPrompt = buildSystemPrompt(promptState)
      const recentMessages = promptState.messages
        .filter((m) => !m.type)
        .slice(-10)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      let fullContent = ''

      try {
        const chatMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...recentMessages,
        ]

        await streamChat(
          chatMessages,
          (chunk: string) => {
            fullContent += chunk
            set((s) => { s.streamingContent = fullContent })
          },
          () => {},
        )

        // Parse stat changes
        const afterState = get()
        const { charChanges, globalChanges } = parseStatChanges(fullContent, afterState.characters)

        // Detect character for NPC bubble
        const { charColor } = parseStoryParagraph(fullContent)
        let detectedChar: string | null = null
        if (charColor) {
          for (const [id, char] of Object.entries(afterState.characters)) {
            if (char.themeColor === charColor) {
              detectedChar = id
              break
            }
          }
        }

        // Extract choices from AI response
        const { cleanContent, choices: parsedChoices } = extractChoices(fullContent)

        // Fallback choices
        const finalChoices = parsedChoices.length >= 2 ? parsedChoices : (() => {
          const cs = get()
          const char = cs.currentCharacter ? cs.characters[cs.currentCharacter] : null
          if (char) {
            return [
              `继续和${char.name}交流`,
              `安排${char.name}训练`,
              `了解${char.name}的近况`,
              '换个话题',
            ]
          }
          return [...QUICK_ACTIONS]
        })()

        set((s) => {
          // Apply character stat changes
          for (const c of charChanges) {
            const stats = s.characterStats[c.charId]
            if (stats) {
              stats[c.stat] = Math.max(0, Math.min(100, (stats[c.stat] ?? 0) + c.delta))
            }
          }

          // Apply global stat changes
          for (const g of globalChanges) {
            if (g.resource === 'money') {
              s.globalResources.money = Math.max(0, s.globalResources.money + g.delta)
            } else if (g.resource === 'fame') {
              s.globalResources.fame = Math.max(0, s.globalResources.fame + g.delta)
            }
          }

          // Push assistant message
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: cleanContent,
            timestamp: Date.now(),
            character: detectedChar || afterState.currentCharacter || undefined,
          })

          s.choices = finalChoices.slice(0, 4)

          // Record
          const period = PERIODS[s.currentPeriodIndex] || PERIODS[0]
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            month: s.currentMonth,
            period: period.name,
            title: content.slice(0, 20) + (content.length > 20 ? '...' : ''),
            content: cleanContent.slice(0, 100) + '...',
          })

          s.isTyping = false
          s.streamingContent = ''
        })

        // Check ending + auto-save
        get().checkEnding()
        get().saveGame()
      } catch (err) {
        set((s) => {
          s.isTyping = false
          s.streamingContent = ''
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `请求失败: ${err instanceof Error ? err.message : '未知错误'}`,
            timestamp: Date.now(),
          })
        })
      }
    },

    advanceTime: () => {
      set((s) => {
        s.currentPeriodIndex += 1

        if (s.currentPeriodIndex >= PERIODS.length) {
          s.currentPeriodIndex = 0
          s.currentMonth += 1
          s.actionPoints = MAX_ACTION_POINTS

          // Monthly expense
          s.globalResources.money = Math.max(0, s.globalResources.money - s.monthlyExpense)
          s.debutCountdown = Math.max(0, s.debutCountdown - 1)

          // Stress auto-increment
          for (const [charId, char] of Object.entries(s.characters)) {
            if (!char.isTrainee) continue
            for (const meta of char.statMetas) {
              if (meta.autoIncrement) {
                const stats = s.characterStats[charId]
                if (stats) {
                  stats[meta.key] = Math.min(100, (stats[meta.key] ?? 0) + meta.autoIncrement)
                }
              }
            }
          }

          // Stress crisis check (>80)
          for (const [charId, char] of Object.entries(s.characters)) {
            if (!char.isTrainee) continue
            const stress = s.characterStats[charId]?.stress ?? 0
            if (stress > 80) {
              trackStressCrisis(charId, stress)
            }
          }

          // Month-change rich message
          const period = PERIODS[0]
          const chapter = getCurrentChapter(s.currentMonth)
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `第${s.currentMonth}月 · ${period.name}`,
            timestamp: Date.now(),
            type: 'month-change',
            monthInfo: { month: s.currentMonth, period: period.name, chapter: chapter.name },
          })

          // Chapter progression
          if (chapter.id !== s.currentChapter) {
            s.currentChapter = chapter.id
            s.messages.push({
              id: makeId(),
              role: 'system',
              content: `— 第${chapter.id}章「${chapter.name}」${chapter.description} —`,
              timestamp: Date.now(),
            })
          }

          // Record
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            month: s.currentMonth,
            period: period.name,
            title: `进入第${s.currentMonth}月`,
            content: `${chapter.name} · ${period.name}`,
          })
        }
      })

      const state = get()
      const period = PERIODS[state.currentPeriodIndex]
      trackTimeAdvance(state.currentMonth, period.name)

      const chapter = getCurrentChapter(state.currentMonth)
      if (chapter.id !== state.currentChapter) {
        trackChapterEnter(chapter.id)
      }

      // Bankrupt check
      if (state.globalResources.money <= 0 && state.currentPeriodIndex === 0) {
        trackBankrupt()
        trackEndingReached('be-bankrupt')
        set((s) => { s.endingType = 'be-bankrupt' })
        return
      }

      // Forced events
      const events = getMonthEvents(state.currentMonth, state.triggeredEvents)
      for (const event of events) {
        if (event.triggerPeriod === undefined || event.triggerPeriod === state.currentPeriodIndex) {
          set((s) => { s.triggeredEvents.push(event.id) })
          get().addSystemMessage(`🎬 【${event.name}】${event.description}`)
        }
      }

      // All trainees left check
      const traineeIds = Object.entries(state.characters)
        .filter(([, c]) => c.isTrainee)
        .map(([id]) => id)
      const allLowTrust = traineeIds.every(
        (id) => (state.characterStats[id]?.['trust'] ?? 0) < 20
      )
      if (allLowTrust && state.currentMonth > 6) {
        trackEndingReached('be-all-leave')
        set((s) => { s.endingType = 'be-all-leave' })
        return
      }

      // Final month check
      if (state.currentMonth >= MAX_MONTHS && state.currentPeriodIndex === PERIODS.length - 1) {
        get().checkEnding()
      }

      get().saveGame()
    },

    useItem: (itemId: string) => {
      const state = get()
      const item = ITEMS[itemId]
      if (!item) return

      const count = state.inventory[itemId] ?? 0
      if (count <= 0) {
        get().addSystemMessage(`你没有 ${item.name} 了。`)
        return
      }

      if (item.type === 'consumable' || item.type === 'social') {
        set((s) => { s.inventory[itemId] = Math.max(0, (s.inventory[itemId] ?? 0) - 1) })
      }

      if (itemId === 'aunt-note') {
        get().addSystemMessage('📝 你翻开姑姑的笔记，熟悉的字迹映入眼帘——"不要试图改变他们，要帮他们找到自己..."')
      } else if (itemId === 'comfort') {
        const charId = state.currentCharacter
        if (charId) {
          set((s) => {
            const stats = s.characterStats[charId]
            if (stats) {
              stats['stress'] = Math.max(0, (stats['stress'] ?? 0) - 10)
              stats['mood'] = Math.min(100, (stats['mood'] ?? 0) + 5)
            }
          })
          get().addSystemMessage('🫂 你温暖地安慰了练习生，压力-10 心情+5')
        }
      } else if (itemId === 'encourage') {
        const charId = state.currentCharacter
        if (charId) {
          set((s) => {
            const stats = s.characterStats[charId]
            if (stats) {
              stats['mood'] = Math.min(100, (stats['mood'] ?? 0) + 10)
            }
          })
          get().addSystemMessage('🔥 你发表了一番激励人心的话，心情+10')
        }
      } else if (itemId === 'strict') {
        const charId = state.currentCharacter
        if (charId) {
          set((s) => {
            const stats = s.characterStats[charId]
            if (stats) {
              stats['stress'] = Math.min(100, (stats['stress'] ?? 0) + 5)
            }
          })
          get().addSystemMessage('📏 你严厉地指出了问题，压力+5 但训练会更有效')
        }
      } else if (itemId === 'training-gear') {
        if (state.globalResources.money >= 50) {
          set((s) => {
            s.globalResources.money -= 50
            s.inventory['training-gear'] = 1
          })
          get().addSystemMessage('🎧 购入了专业训练设备！训练效果大幅提升。金钱-50')
        } else {
          get().addSystemMessage('💰 资金不足，无法购买训练设备。')
        }
      }
    },

    checkEnding: () => {
      const state = get()
      if (state.endingType) return

      const traineeIds = Object.entries(state.characters)
        .filter(([, c]) => c.isTrainee)
        .map(([id]) => id)

      if (state.globalResources.money <= 0) {
        trackEndingReached('be-bankrupt')
        set((s) => { s.endingType = 'be-bankrupt' })
        return
      }

      const allLowTrust = traineeIds.every(
        (id) => (state.characterStats[id]?.['trust'] ?? 0) < 20
      )
      if (allLowTrust) {
        trackEndingReached('be-all-leave')
        set((s) => { s.endingType = 'be-all-leave' })
        return
      }

      const avgTrust = traineeIds.reduce(
        (sum, id) => sum + (state.characterStats[id]?.['trust'] ?? 0), 0
      ) / traineeIds.length

      const avgSkill = traineeIds.reduce((sum, id) => {
        const stats = state.characterStats[id]
        return sum + ((stats?.['dance'] ?? 0) + (stats?.['singing'] ?? 0) + (stats?.['variety'] ?? 0)) / 3
      }, 0) / traineeIds.length

      const hasAuntTruth = state.triggeredEvents.includes('aunt-truth')
      const allHighTrust = traineeIds.every(
        (id) => (state.characterStats[id]?.['trust'] ?? 0) >= 70
      )

      if (allHighTrust && hasAuntTruth && avgSkill >= 50) {
        trackEndingReached('te-legacy')
        set((s) => { s.endingType = 'te-legacy' })
        return
      }

      if (avgTrust >= 50 && avgSkill >= 40) {
        trackEndingReached('he-debut')
        set((s) => { s.endingType = 'he-debut' })
        return
      }

      if (state.currentMonth >= MAX_MONTHS) {
        trackEndingReached('ne-landing')
        set((s) => { s.endingType = 'ne-landing' })
      }
    },

    addSystemMessage: (content) => {
      set((s) => {
        s.messages.push({
          id: makeId(),
          role: 'system',
          content,
          timestamp: Date.now(),
        })
      })
    },

    resetGame: () => {
      set((s) => {
        s.gameStarted = false
        s.messages = []
        s.historySummary = ''
        s.streamingContent = ''
        s.endingType = null
        s.choices = []
        s.activeTab = 'dialogue'
        s.showDashboard = false
        s.showRecords = false
        s.storyRecords = []
      })
      get().clearSave()
    },

    // ── Save/Load ──

    saveGame: () => {
      const state = get()
      const save = {
        version: 1,
        playerGender: state.playerGender,
        playerName: state.playerName,
        currentMonth: state.currentMonth,
        currentPeriodIndex: state.currentPeriodIndex,
        actionPoints: state.actionPoints,
        currentScene: state.currentScene,
        currentCharacter: state.currentCharacter,
        characterStats: state.characterStats,
        unlockedScenes: state.unlockedScenes,
        globalResources: state.globalResources,
        currentChapter: state.currentChapter,
        triggeredEvents: state.triggeredEvents,
        monthlyExpense: state.monthlyExpense,
        debutCountdown: state.debutCountdown,
        inventory: state.inventory,
        messages: state.messages.slice(-30),
        historySummary: state.historySummary,
        storyRecords: state.storyRecords.slice(-50),
        endingType: state.endingType,
      }
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save))
      } catch { /* silent */ }
    },

    loadGame: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false
        const data = JSON.parse(raw)
        if (data.version !== 1) return false

        set((s) => {
          s.gameStarted = true
          s.playerGender = data.playerGender || 'unspecified'
          s.playerName = data.playerName || '玩家'
          s.characters = buildCharacters(data.playerGender || 'unspecified')
          s.currentMonth = data.currentMonth
          s.currentPeriodIndex = data.currentPeriodIndex
          s.actionPoints = data.actionPoints
          s.currentScene = data.currentScene
          s.currentCharacter = data.currentCharacter
          s.characterStats = data.characterStats
          s.unlockedScenes = data.unlockedScenes || ['practice', 'meeting', 'lounge', 'studio']
          s.globalResources = data.globalResources || { money: INITIAL_MONEY, fame: 0 }
          s.currentChapter = data.currentChapter || 1
          s.triggeredEvents = data.triggeredEvents || []
          s.monthlyExpense = data.monthlyExpense ?? MONTHLY_EXPENSE
          s.debutCountdown = data.debutCountdown ?? MAX_MONTHS
          s.inventory = data.inventory
          s.messages = data.messages || []
          s.historySummary = data.historySummary || ''
          s.storyRecords = data.storyRecords || []
          s.endingType = data.endingType || null
        })
        trackGameContinue()
        return true
      } catch {
        return false
      }
    },

    hasSave: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false
        return JSON.parse(raw).version === 1
      } catch {
        return false
      }
    },

    clearSave: () => {
      try { localStorage.removeItem(SAVE_KEY) } catch { /* silent */ }
    },
  }))
)
