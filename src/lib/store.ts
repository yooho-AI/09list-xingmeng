/**
 * [INPUT]: 依赖 zustand, immer, @/lib/stream, @/lib/analytics, @/lib/data
 * [OUTPUT]: 对外提供 useGameStore
 * [POS]: 星梦事务所状态管理中枢，同构数值+全局资源+月度系统+出道倒计时
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { streamChat, chat } from '@/lib/stream'
import {
  trackGameStart, trackGameContinue, trackTimeAdvance,
  trackChapterEnter, trackPlayerCreate, trackBankrupt,
} from '@/lib/analytics'
import {
  type Character, type CharacterStats, type Message,
  SCENES, ITEMS, PERIODS,
  MAX_MONTHS, MAX_ACTION_POINTS, INITIAL_MONEY, MONTHLY_EXPENSE,
  buildCharacters, getStatLevel, getAvailableCharacters,
  getCurrentChapter, getMonthEvents,
} from '@/lib/data'

// ============================================================
// Store 类型
// ============================================================

interface GlobalResources {
  money: number
  fame: number
}

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
  currentChapter: number
  triggeredEvents: string[]
  unlockedScenes: string[]
  globalResources: GlobalResources
  monthlyExpense: number
  debutCountdown: number
  inventory: Record<string, number>
  messages: Message[]
  historySummary: string
  isTyping: boolean
  streamingContent: string
  endingType: string | null
  activePanel: 'inventory' | 'relations' | null
}

interface GameActions {
  setPlayerInfo: (gender: 'male' | 'female' | 'unspecified', name: string) => void
  initGame: () => void
  selectCharacter: (id: string | null) => void
  selectScene: (id: string) => void
  togglePanel: (panel: 'inventory' | 'relations') => void
  closePanel: () => void
  sendMessage: (text: string) => Promise<void>
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

// ============================================================
// 工具
// ============================================================

let messageCounter = 0
function makeId() {
  return `msg-${Date.now()}-${++messageCounter}`
}

const SAVE_KEY = 'xingmeng-save-v1'

function buildInitialStats(characters: Record<string, Character>): Record<string, CharacterStats> {
  return Object.fromEntries(
    Object.entries(characters).map(([id, char]) => [id, { ...char.initialStats }])
  )
}

// ============================================================
// 数值解析器 — 双轨：角色数值 + 全局资源
// ============================================================

/** 全局资源别名映射 */
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
  characters: Record<string, Character>
): StatChangeResult {
  const charChanges: StatChangeResult['charChanges'] = []
  const globalChanges: StatChangeResult['globalChanges'] = []

  /* 角色名 → id */
  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
  }

  /* 数值 label → key（从 statMetas 动态构建） */
  const labelToKey: Record<string, { charId: string; key: string }> = {}
  for (const [id, char] of Object.entries(characters)) {
    for (const meta of char.statMetas) {
      labelToKey[meta.label] = { charId: id, key: meta.key }
      labelToKey[`${meta.label}度`] = { charId: id, key: meta.key }
      labelToKey[`${meta.label}值`] = { charId: id, key: meta.key }
    }
  }

  /* 匹配格式: 【角色名 数值名+N】 或 【数值名+N】 */
  const regex = /[【\[]([^\]】]+?)\s*(\S+?)([+-])(\d+)[】\]]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const prefix = match[1].trim()
    const label = match[2]
    const delta = parseInt(match[4]) * (match[3] === '+' ? 1 : -1)

    /* 尝试全局资源 */
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

  /* 简单格式: 【金钱+20】 【名声+5】 */
  const simpleRegex = /[【\[]([^\]】+?)([+-])(\d+)[】\]]/g
  let simpleMatch
  while ((simpleMatch = simpleRegex.exec(content)) !== null) {
    const label = simpleMatch[1].trim()
    const delta = parseInt(simpleMatch[3]) * (simpleMatch[2] === '+' ? 1 : -1)
    const globalKey = GLOBAL_ALIASES[label]
    if (globalKey) {
      /* 避免重复 */
      const already = globalChanges.some(
        (g) => g.resource === globalKey && g.delta === delta
      )
      if (!already) globalChanges.push({ resource: globalKey, delta })
    }
  }

  return { charChanges, globalChanges }
}

// ============================================================
// System Prompt 构建
// ============================================================

function buildSystemPrompt(state: GameState, char: Character | null): string {
  const period = PERIODS[state.currentPeriodIndex]
  const scene = SCENES[state.currentScene]
  const chapter = getCurrentChapter(state.currentMonth)
  const availableChars = getAvailableCharacters(state.currentMonth, state.characters)

  /* 所有可见角色数值摘要 */
  const allStats = Object.entries(availableChars)
    .map(([id, c]) => {
      const s = state.characterStats[id]
      const statStr = c.statMetas
        .map((m) => `${m.label}${s?.[m.key] ?? 0}`)
        .join(' ')
      return `${c.name}(${c.isTrainee ? '练习生' : '对手'}, ${c.gender === 'female' ? '女' : '男'}): ${statStr}`
    })
    .join('\n')

  /* 玩家称呼 */
  const genderCall = state.playerGender === 'male'
    ? '（NPC称呼: 哥/社长/老板）'
    : state.playerGender === 'female'
      ? '（NPC称呼: 姐/社长/老板）'
      : '（NPC称呼: 老师/社长/老板）'

  let prompt = `你是 K-pop 偶像养成文字冒险游戏《首尔星梦事务所》的 AI 叙述者。

## 世界观
现代首尔，K-pop 产业黄金时代。玩家继承了姑姑濒临倒闭的小型练习生事务所。
事务所只有 3 位练习生，要在 36 个月内完成出道。对手是业界巨头 NOVA Entertainment。
这是一个关于梦想、成长、羁绊和残酷现实的故事。

## 玩家身份
玩家「${state.playerName}」是事务所的新任社长，接管了姑姑的事务所。${genderCall}
- 没有任何经纪行业经验，全靠真心和直觉
- 每月需要支付 ${state.monthlyExpense} 万韩元运营开支
- 必须在 ${state.debutCountdown} 个月内带领练习生完成出道

## 叙述风格
- 现代都市风格：生动自然，侧重对话和情感描写
- 第二人称"你"为主角展开
- NPC 对话用【角色名】前缀标记，动作用（）包裹
- 对话用中文双引号""
- 数值变化用【角色名 数值名+X】格式标注
- 全局资源变化用【金钱+X】【名声+X】格式标注
- 每次回复末尾必须输出：
  第X/${MAX_MONTHS}月 ${period?.name || '清晨'} 行动力X/${MAX_ACTION_POINTS}
  出道倒计时: ${state.debutCountdown}月
  💰${state.globalResources.money}万 ⭐${state.globalResources.fame}

## 当前章节
第${chapter.id}章「${chapter.name}」(M${chapter.monthRange[0]}-${chapter.monthRange[1]})
${chapter.description}
章节目标: ${chapter.objectives.join('、')}
叙事氛围: ${chapter.atmosphere}

## 关键机制
- 每月自动扣除 ${state.monthlyExpense} 万韩元运营费，金钱归零触发破产 BE
- 压力每月自动+2，压力>80 会影响训练效率和心情
- 训练消耗金钱但提升技能，公演和赞助带来收入和名声
- 3 位练习生共享 9 维度数值（信任/依赖/心情/健康/压力/舞蹈/歌唱/综艺感/人气）
- 对手姜雅琳只有 1 维度（态度），态度>60 会暗中帮助

## NPC 行为准则
- 金敏秀: 内向天才主唱，信任<30沉默回避，>60主动倾诉，舞台恐惧需要耐心克服
- 朴智妍: 倔强主舞，信任<30敌意测试，>60成为核心，隐藏膝伤是关键秘密
- 崔成勋: 阳光综艺，信任<30嬉皮笑脸，>60分享家庭压力，36月期限是心结
- 姜雅琳: 对手王牌，态度<30蔑视，>60暗中帮助甚至考虑跳槽`

  if (char) {
    const stats = state.characterStats[char.id]
    const statStr = char.statMetas
      .map((m) => `${m.label}${stats?.[m.key] ?? 0}`)
      .join(' ')
    const level = getStatLevel(stats?.[char.statMetas[0]?.key] ?? 0)
    prompt += `\n\n## 当前互动角色
- 姓名：${char.name}（${char.title}，${char.age}岁，${char.gender === 'female' ? '女' : '男'}）
- 性格：${char.personality}
- 简介：${char.description}
- 说话风格：${char.speakingStyle}
- 行为模式：${char.behaviorPatterns}
- 雷点：${char.triggerPoints.join('、')}
- 当前关系：${level.name}（${statStr}）
- 隐藏秘密：${char.secret}`
  }

  prompt += `\n\n## 当前状态
- 玩家：${state.playerName}
- 时间：第 ${state.currentMonth}/${MAX_MONTHS} 月 · ${period?.name}
- 行动力：${state.actionPoints}/${MAX_ACTION_POINTS}
- 场景：${scene?.icon} ${scene?.name} — ${scene?.description}
- 出道倒计时：${state.debutCountdown} 月
- 💰 金钱：${state.globalResources.money} 万韩元（月支出 ${state.monthlyExpense} 万）
- ⭐ 名声：${state.globalResources.fame}

## 所有角色当前数值
${allStats}`

  return prompt
}

// ============================================================
// Store
// ============================================================

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // --- 初始状态 ---
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
    currentChapter: 1,
    triggeredEvents: [],
    unlockedScenes: ['practice', 'meeting', 'lounge', 'studio'],
    globalResources: { money: INITIAL_MONEY, fame: 0 },
    monthlyExpense: MONTHLY_EXPENSE,
    debutCountdown: MAX_MONTHS,
    inventory: { 'aunt-note': 1 },
    messages: [],
    historySummary: '',
    isTyping: false,
    streamingContent: '',
    endingType: null,
    activePanel: null,

    // --- 操作 ---
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
        s.activePanel = null
        s.streamingContent = ''
      })
      trackGameStart()
    },

    selectCharacter: (id) => {
      set((s) => { s.currentCharacter = id })
    },

    selectScene: (id) => {
      set((s) => {
        s.currentScene = id
        s.currentCharacter = null
      })
      const scene = SCENES[id]
      if (scene) {
        get().addSystemMessage(`你来到了${scene.icon} ${scene.name}。${scene.description}`)
      }
    },

    togglePanel: (panel) => {
      set((s) => {
        s.activePanel = s.activePanel === panel ? null : panel
      })
    },

    closePanel: () => {
      set((s) => { s.activePanel = null })
    },

    sendMessage: async (text: string) => {
      const state = get()
      const char = state.currentCharacter ? state.characters[state.currentCharacter] : null

      set((s) => {
        s.messages.push({ id: makeId(), role: 'user', content: text, timestamp: Date.now() })
        s.isTyping = true
        s.streamingContent = ''
      })

      try {
        /* 上下文压缩 */
        let historySummary = state.historySummary
        let recentMessages = state.messages.slice(-20)

        if (state.messages.length > 15 && !state.historySummary) {
          const oldMessages = state.messages.slice(0, -10)
          const summaryText = oldMessages
            .map((m) => `[${m.role}]: ${m.content.slice(0, 200)}`)
            .join('\n')

          try {
            historySummary = await chat([{
              role: 'user',
              content: `请用200字以内概括以下 K-pop 养成游戏的对话历史，保留关键剧情、角色互动和数值变化：\n\n${summaryText}`,
            }])
            set((s) => { s.historySummary = historySummary })
            recentMessages = state.messages.slice(-10)
          } catch {
            // 压缩失败，继续
          }
        }

        const systemPrompt = buildSystemPrompt(get(), char)
        const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...(historySummary ? [{ role: 'system' as const, content: `[历史摘要] ${historySummary}` }] : []),
          ...recentMessages.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
          { role: 'user' as const, content: text },
        ]

        let fullContent = ''

        await streamChat(
          apiMessages,
          (chunk) => {
            fullContent += chunk
            set((s) => { s.streamingContent = fullContent })
          },
          () => {}
        )

        if (!fullContent) {
          const fallbacks = char
            ? [
                `【${char.name}】（看了看你）"嗯...社长？"`,
                `【${char.name}】（擦了擦汗）"怎么了？"`,
                `【${char.name}】（放下耳机）"有什么事吗？"`,
              ]
            : [
                '练习室里传来节拍器的声音，规律而执着。窗外首尔的霓虹灯在夜色中闪烁。',
                '事务所的走廊静悄悄的，只有远处隐约传来练习的歌声。',
                '你看了看桌上的月度计划表，距离出道的日子又近了一天。',
              ]
          fullContent = fallbacks[Math.floor(Math.random() * fallbacks.length)]
        }

        /* 解析数值变化 — 双轨 */
        const { charChanges, globalChanges } = parseStatChanges(fullContent, get().characters)
        set((s) => {
          for (const c of charChanges) {
            const stats = s.characterStats[c.charId]
            if (stats) {
              stats[c.stat] = Math.max(0, Math.min(100, (stats[c.stat] ?? 0) + c.delta))
            }
          }
          for (const g of globalChanges) {
            if (g.resource === 'money') {
              s.globalResources.money = Math.max(0, s.globalResources.money + g.delta)
            } else if (g.resource === 'fame') {
              s.globalResources.fame = Math.max(0, s.globalResources.fame + g.delta)
            }
          }
        })

        set((s) => {
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: fullContent,
            character: state.currentCharacter ?? undefined,
            timestamp: Date.now(),
          })
          s.isTyping = false
          s.streamingContent = ''
        })

        /* 自动存档 */
        get().saveGame()
      } catch {
        set((s) => {
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: char
              ? `【${char.name}】（似乎在想什么）"...算了，没什么。"`
              : '手机震了一下，是姑姑之前设置的事务所提醒——"别忘了今天的训练计划"。',
            character: state.currentCharacter ?? undefined,
            timestamp: Date.now(),
          })
          s.isTyping = false
          s.streamingContent = ''
        })
      }
    },

    advanceTime: () => {
      set((s) => {
        s.currentPeriodIndex++
        if (s.currentPeriodIndex >= PERIODS.length) {
          s.currentPeriodIndex = 0
          s.currentMonth++

          /* 月度开支扣除 */
          s.globalResources.money = Math.max(0, s.globalResources.money - s.monthlyExpense)

          /* 出道倒计时 */
          s.debutCountdown = Math.max(0, s.debutCountdown - 1)

          /* 压力自增（从 statMetas.autoIncrement 读取） */
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

          s.actionPoints = MAX_ACTION_POINTS
        }

        /* 章节推进 */
        const newChapter = getCurrentChapter(s.currentMonth)
        if (newChapter.id !== s.currentChapter) {
          s.currentChapter = newChapter.id
        }
      })

      const state = get()
      const period = PERIODS[state.currentPeriodIndex]
      trackTimeAdvance(state.currentMonth, period.name)

      /* 章节推进消息 */
      const chapter = getCurrentChapter(state.currentMonth)
      if (chapter.id !== state.currentChapter) {
        trackChapterEnter(chapter.id)
      }

      /* 时间推进消息 */
      const timeMsg = `时间来到了第 ${state.currentMonth} 月 · ${period.name}`
      const moneyMsg = state.debutCountdown <= 6 ? ` 🎤 出道倒计时: ${state.debutCountdown}月` : ''
      get().addSystemMessage(timeMsg + moneyMsg)

      /* 破产检查 */
      if (state.globalResources.money <= 0 && state.currentPeriodIndex === 0) {
        trackBankrupt()
        set((s) => { s.endingType = 'be-bankrupt' })
        return
      }

      /* 检查强制事件 */
      const events = getMonthEvents(state.currentMonth, state.triggeredEvents)
      for (const event of events) {
        if (event.triggerPeriod === undefined || event.triggerPeriod === state.currentPeriodIndex) {
          set((s) => { s.triggeredEvents.push(event.id) })
          get().addSystemMessage(`🎬 【${event.name}】${event.description}`)
        }
      }

      /* 全员流失检查 */
      const traineeIds = Object.entries(state.characters)
        .filter(([, c]) => c.isTrainee)
        .map(([id]) => id)
      const allLowTrust = traineeIds.every(
        (id) => (state.characterStats[id]?.['trust'] ?? 0) < 20
      )
      if (allLowTrust && state.currentMonth > 6) {
        set((s) => { s.endingType = 'be-all-leave' })
        return
      }

      /* 最终月结局检查 */
      if (state.currentMonth >= MAX_MONTHS && state.currentPeriodIndex === PERIODS.length - 1) {
        get().checkEnding()
      }
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

      /* 消耗道具 */
      if (item.type === 'consumable' || item.type === 'social') {
        set((s) => { s.inventory[itemId] = Math.max(0, (s.inventory[itemId] ?? 0) - 1) })
      }

      /* 道具效果 */
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
      const traineeIds = Object.entries(state.characters)
        .filter(([, c]) => c.isTrainee)
        .map(([id]) => id)

      /* BE: 破产 */
      if (state.globalResources.money <= 0) {
        set((s) => { s.endingType = 'be-bankrupt' })
        return
      }

      /* BE: 全员流失 */
      const allLowTrust = traineeIds.every(
        (id) => (state.characterStats[id]?.['trust'] ?? 0) < 20
      )
      if (allLowTrust) {
        set((s) => { s.endingType = 'be-all-leave' })
        return
      }

      /* 计算综合实力 */
      const avgTrust = traineeIds.reduce(
        (sum, id) => sum + (state.characterStats[id]?.['trust'] ?? 0), 0
      ) / traineeIds.length

      const avgSkill = traineeIds.reduce((sum, id) => {
        const stats = state.characterStats[id]
        const dance = stats?.['dance'] ?? 0
        const singing = stats?.['singing'] ?? 0
        const variety = stats?.['variety'] ?? 0
        return sum + (dance + singing + variety) / 3
      }, 0) / traineeIds.length

      const hasAuntTruth = state.triggeredEvents.includes('aunt-truth')
      const allHighTrust = traineeIds.every(
        (id) => (state.characterStats[id]?.['trust'] ?? 0) >= 70
      )

      /* TE: 星光传承 */
      if (allHighTrust && hasAuntTruth && avgSkill >= 50) {
        set((s) => { s.endingType = 'te-legacy' })
        return
      }

      /* HE: 梦想绽放 */
      if (avgTrust >= 50 && avgSkill >= 40) {
        set((s) => { s.endingType = 'he-debut' })
        return
      }

      /* NE: 软着陆 */
      set((s) => { s.endingType = 'ne-landing' })
    },

    addSystemMessage: (content: string) => {
      set((s) => {
        s.messages.push({ id: makeId(), role: 'system', content, timestamp: Date.now() })
      })
    },

    resetGame: () => {
      set((s) => {
        s.gameStarted = false
        s.messages = []
        s.historySummary = ''
        s.streamingContent = ''
        s.endingType = null
      })
      get().clearSave()
    },

    // --- 存档系统 ---
    saveGame: () => {
      const s = get()
      const data = {
        version: 1,
        playerGender: s.playerGender,
        playerName: s.playerName,
        characters: s.characters,
        currentMonth: s.currentMonth,
        currentPeriodIndex: s.currentPeriodIndex,
        actionPoints: s.actionPoints,
        currentScene: s.currentScene,
        currentCharacter: s.currentCharacter,
        characterStats: s.characterStats,
        currentChapter: s.currentChapter,
        triggeredEvents: s.triggeredEvents,
        unlockedScenes: s.unlockedScenes,
        globalResources: s.globalResources,
        monthlyExpense: s.monthlyExpense,
        debutCountdown: s.debutCountdown,
        inventory: s.inventory,
        messages: s.messages.slice(-30),
        historySummary: s.historySummary,
        endingType: s.endingType,
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
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
          s.characters = data.characters || buildCharacters(data.playerGender || 'unspecified')
          s.currentMonth = data.currentMonth
          s.currentPeriodIndex = data.currentPeriodIndex
          s.actionPoints = data.actionPoints
          s.currentScene = data.currentScene
          s.currentCharacter = data.currentCharacter
          s.characterStats = data.characterStats
          s.currentChapter = data.currentChapter || 1
          s.triggeredEvents = data.triggeredEvents || []
          s.unlockedScenes = data.unlockedScenes || ['practice', 'meeting', 'lounge', 'studio']
          s.globalResources = data.globalResources || { money: INITIAL_MONEY, fame: 0 }
          s.monthlyExpense = data.monthlyExpense ?? MONTHLY_EXPENSE
          s.debutCountdown = data.debutCountdown ?? MAX_MONTHS
          s.inventory = data.inventory
          s.messages = data.messages
          s.historySummary = data.historySummary || ''
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
      localStorage.removeItem(SAVE_KEY)
    },
  }))
)

// 导出 data.ts 的所有内容
export {
  SCENES, ITEMS, PERIODS, CHAPTERS,
  MAX_MONTHS, MAX_ACTION_POINTS, INITIAL_MONEY, MONTHLY_EXPENSE,
  STORY_INFO, FORCED_EVENTS, ENDINGS,
  buildCharacters, getStatLevel,
  getAvailableCharacters, getCurrentChapter,
} from '@/lib/data'

export type {
  Character, CharacterStats, Scene, GameItem, Chapter,
  ForcedEvent, Ending, TimePeriod, Message, StatMeta,
} from '@/lib/data'
