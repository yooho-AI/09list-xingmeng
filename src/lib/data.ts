/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供游戏类型定义 + 数据常量 + 工具函数
 * [POS]: lib 的游戏数据层，4角色/4场景/6道具/3章节/5强制事件/5结局/6时段
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================
// 类型定义 — 同构数值系统 + category 分组
// ============================================================

/** 数值元数据：驱动 UI 和逻辑，按 category 分组渲染 */
export interface StatMeta {
  key: string
  label: string
  color: string
  icon: string
  category: 'relation' | 'status' | 'skill'
  autoIncrement?: number
  decayRate?: number
}

/** 角色数值 — 动态键值对，由 statMetas 描述 */
export type CharacterStats = Record<string, number>

export interface Character {
  id: string
  name: string
  portrait: string
  gender: 'female' | 'male'
  age: number
  title: string
  description: string
  personality: string
  speakingStyle: string
  secret: string
  triggerPoints: string[]
  behaviorPatterns: string
  themeColor: string
  joinMonth: number
  isTrainee: boolean
  statMetas: StatMeta[]
  initialStats: CharacterStats
}

export interface Scene {
  id: string
  name: string
  icon: string
  description: string
  background: string
  atmosphere: string
  tags: string[]
}

export interface GameItem {
  id: string
  name: string
  icon: string
  type: 'consumable' | 'collectible' | 'quest' | 'social' | 'upgrade'
  description: string
  maxCount: number
  cost?: number
}

export interface Chapter {
  id: number
  name: string
  monthRange: [number, number]
  description: string
  objectives: string[]
  atmosphere: string
}

export interface ForcedEvent {
  id: string
  name: string
  triggerMonth: number
  triggerPeriod?: number
  description: string
}

export interface Ending {
  id: string
  name: string
  type: 'TE' | 'HE' | 'BE' | 'NE'
  description: string
  condition: string
}

export interface TimePeriod {
  index: number
  name: string
  icon: string
  hours: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  character?: string
  timestamp: number
  type?: 'scene-transition' | 'month-change'
  sceneId?: string
  monthInfo?: { month: number; period: string; chapter: string }
}

export interface StoryRecord {
  id: string
  month: number
  period: string
  title: string
  content: string
}

export interface GlobalResources {
  money: number
  fame: number
}

// ============================================================
// 游戏配置
// ============================================================

export const MAX_MONTHS = 36
export const MAX_ACTION_POINTS = 6
export const INITIAL_MONEY = 100
export const MONTHLY_EXPENSE = 30

// ============================================================
// 时间系统 — 6 时段
// ============================================================

export const PERIODS: TimePeriod[] = [
  { index: 0, name: '清晨', icon: '🌅', hours: '06:00-08:59' },
  { index: 1, name: '上午', icon: '☀️', hours: '09:00-11:59' },
  { index: 2, name: '中午', icon: '🌞', hours: '12:00-13:59' },
  { index: 3, name: '下午', icon: '⛅', hours: '14:00-16:59' },
  { index: 4, name: '傍晚', icon: '🌇', hours: '17:00-19:59' },
  { index: 5, name: '深夜', icon: '🌙', hours: '20:00-05:59' },
]

// ============================================================
// Fallback 快捷选项（AI 未返回选项时使用）
// ============================================================

export const QUICK_ACTIONS = ['安排训练', '团队建设', '制定计划', '私下谈心']

// ============================================================
// 结局类型映射 — 驱动 EndingModal 样式
// ============================================================

export const ENDING_TYPE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  TE: { label: 'True Ending', color: '#ffd700', icon: '👑' },
  HE: { label: 'Happy Ending', color: '#e91e8c', icon: '🌟' },
  BE: { label: 'Bad Ending', color: '#6b7280', icon: '💔' },
  NE: { label: 'Normal Ending', color: '#f59e0b', icon: '🌙' },
}

// ============================================================
// 3 练习生共享 StatMeta 模板
// ============================================================

const TRAINEE_STAT_METAS: StatMeta[] = [
  { key: 'trust', label: '信任', color: '#e91e8c', icon: '💕', category: 'relation' },
  { key: 'dependency', label: '依赖', color: '#ff6b9d', icon: '🤝', category: 'relation' },
  { key: 'mood', label: '心情', color: '#ffd700', icon: '😊', category: 'status' },
  { key: 'health', label: '健康', color: '#00d4ff', icon: '💪', category: 'status' },
  { key: 'stress', label: '压力', color: '#9333ea', icon: '😰', category: 'status', autoIncrement: 2 },
  { key: 'dance', label: '舞蹈', color: '#f97316', icon: '💃', category: 'skill' },
  { key: 'singing', label: '歌唱', color: '#10b981', icon: '🎤', category: 'skill' },
  { key: 'variety', label: '综艺感', color: '#f59e0b', icon: '🎭', category: 'skill' },
  { key: 'popularity', label: '人气', color: '#ec4899', icon: '⭐', category: 'skill' },
]

// ============================================================
// NPC 数据 — 3 练习生 + 1 对手
// ============================================================

/** 金敏秀 — 男，实力派，内向但极有天赋 */
const MINSU: Character = {
  id: 'minsu',
  name: '金敏秀',
  portrait: '/characters/minsu.jpg',
  gender: 'male',
  age: 19,
  title: '练习生·主唱',
  description: '从小城镇来首尔追梦的少年，歌唱天赋惊人但性格内向敏感。曾在学校被欺凌，极度缺乏自信，害怕舞台。你是他第一个真正信任的人。',
  personality: '内向敏感 | 天赋极高 + 缺乏自信 + 完美主义',
  speakingStyle: '声音柔和，常用省略号，紧张时结巴，唱歌时却判若两人',
  secret: '离家出走来的首尔，家人反对他当艺人。曾患过恐慌症，现在舞台恐惧是后遗症',
  triggerPoints: ['提及"回家"或"放弃"', '被批评唱功', '被迫在陌生人面前表演'],
  behaviorPatterns: '信任<30沉默回避，30-60逐渐敞开心扉，>60会主动找你倾诉',
  themeColor: '#3b82f6',
  joinMonth: 1,
  isTrainee: true,
  statMetas: TRAINEE_STAT_METAS,
  initialStats: {
    trust: 50, dependency: 30, mood: 60, health: 80,
    stress: 20, dance: 30, singing: 70, variety: 20, popularity: 15,
  },
}

/** 朴智妍 — 女，舞蹈担当，倔强好胜 */
const JIYEON: Character = {
  id: 'jiyeon',
  name: '朴智妍',
  portrait: '/characters/jiyeon.jpg',
  gender: 'female',
  age: 18,
  title: '练习生·主舞',
  description: '从大型经纪公司被淘汰的练习生，舞蹈实力顶级但曾遭受职场霸凌。外表冷酷倔强，内心渴望被认可。对"事务所"这个词有创伤反应。',
  personality: '倔强好胜 | 外冷内热 + 创伤后应激 + 不信任权威',
  speakingStyle: '简短直接，常用反问，嘴硬心软，生气时语速极快',
  secret: '在前公司被前辈霸凌导致膝盖受伤，现在高强度舞蹈后会疼。一直隐瞒伤势',
  triggerPoints: ['提及"前公司"或"被淘汰"', '被强制做不想做的事', '发现她的膝伤秘密'],
  behaviorPatterns: '信任<30充满敌意测试你，30-60表面配合暗中观察，>60真正接纳成为核心',
  themeColor: '#ec4899',
  joinMonth: 1,
  isTrainee: true,
  statMetas: TRAINEE_STAT_METAS,
  initialStats: {
    trust: 35, dependency: 15, mood: 45, health: 65,
    stress: 40, dance: 75, singing: 35, variety: 40, popularity: 25,
  },
}

/** 崔成勋 — 男，综艺天才，乐观开朗 */
const SEONGHOON: Character = {
  id: 'seonghoon',
  name: '崔成勋',
  portrait: '/characters/seonghoon.jpg',
  gender: 'male',
  age: 20,
  title: '练习生·综艺',
  description: '富二代出身却执意要当艺人的阳光大男孩，综艺感天生但唱跳都是短板。父亲给了他36个月期限——出道失败就回家继承公司。',
  personality: '乐观开朗 | 综艺天才 + 隐藏压力 + 不想被当少爷',
  speakingStyle: '活泼话多，爱用网络流行语，搞笑段子信手拈来，认真时反差萌',
  secret: '父亲是韩国某财阀分支。36个月期限不是空话，父亲已安排好接班计划。私下偷偷加练到凌晨',
  triggerPoints: ['提及"有钱人"或"少爷"', '质疑他的认真程度', '发现他深夜独自练习'],
  behaviorPatterns: '信任<30嘻嘻哈哈遮掩真心，30-60展现认真的一面，>60分享家庭压力和真实恐惧',
  themeColor: '#fbbf24',
  joinMonth: 1,
  isTrainee: true,
  statMetas: TRAINEE_STAT_METAS,
  initialStats: {
    trust: 60, dependency: 40, mood: 85, health: 90,
    stress: 15, dance: 25, singing: 30, variety: 80, popularity: 45,
  },
}

/** 姜雅琳 — 女，对手事务所的王牌，只有 attitude 一个维度 */
const ARIN: Character = {
  id: 'arin',
  name: '姜雅琳',
  portrait: '/characters/arin.jpg',
  gender: 'female',
  age: 19,
  title: 'NOVA Ent. 王牌练习生',
  description: '对手大公司的绝对王牌，实力颜值兼具的完美练习生。表面高傲冷漠，实际是被公司当作武器培养、失去自我的可怜人。',
  personality: '高傲冷漠 | 完美主义 + 内心空虚 + 渴望真正的友情',
  speakingStyle: '冷淡礼貌，敬语为主，偶尔露出真性情时语气会突然变软',
  secret: '其实厌倦了被公司操控的生活。曾偷偷观看你们事务所的公演视频，羡慕那种真实的快乐',
  triggerPoints: ['嘲笑小事务所', '展现真诚态度', '在她面前承认弱点'],
  behaviorPatterns: '态度<30完全敌对蔑视，30-60好奇但保持距离，>60暗中帮助甚至考虑跳槽',
  themeColor: '#6b7280',
  joinMonth: 1,
  isTrainee: false,
  statMetas: [
    { key: 'attitude', label: '态度', color: '#6b7280', icon: '💎', category: 'relation' },
  ],
  initialStats: { attitude: 40 },
}

/** 工厂函数 — 根据玩家性别构建角色 */
export function buildCharacters(_playerGender: 'male' | 'female' | 'unspecified'): Record<string, Character> {
  return {
    minsu: MINSU,
    jiyeon: JIYEON,
    seonghoon: SEONGHOON,
    arin: ARIN,
  }
}

// ============================================================
// 场景数据 — 4 个场景（全部初始解锁）
// ============================================================

export const SCENES: Record<string, Scene> = {
  practice: {
    id: 'practice',
    name: '练习室',
    icon: '🎵',
    description: '铺着镜面的宽敞练习室，音响设备一应俱全。汗水和梦想交织的地方，每一面镜子都映射着练习生的努力。',
    background: '/scenes/practice.jpg',
    atmosphere: '热血、汗水、努力',
    tags: ['训练', '舞蹈', '歌唱'],
  },
  meeting: {
    id: 'meeting',
    name: '会议室',
    icon: '📋',
    description: '事务所的决策中心，白板上贴满了训练计划和出道时间表。姑姑留下的笔记还散落在桌上。',
    background: '/scenes/meeting.jpg',
    atmosphere: '严肃、决策、规划',
    tags: ['管理', '策划', '商务'],
  },
  lounge: {
    id: 'lounge',
    name: '休息室',
    icon: '🛋️',
    description: '温馨的小休息室，有沙发、零食柜和一台老旧电视。练习生们在这里放松、聊天、偶尔吵架又和好。',
    background: '/scenes/lounge.jpg',
    atmosphere: '温馨、放松、日常',
    tags: ['休息', '社交', '治愈'],
  },
  studio: {
    id: 'studio',
    name: '录音室',
    icon: '🎙️',
    description: '隔音良好的专业录音室，虽然设备老旧但保养得很好。墙上贴着姑姑曾经制作人时代的金唱片。',
    background: '/scenes/studio.jpg',
    atmosphere: '专注、创作、灵感',
    tags: ['录音', '创作', '专业'],
  },
}

// ============================================================
// 道具数据 — 6 种
// ============================================================

export const ITEMS: Record<string, GameItem> = {
  'aunt-note': {
    id: 'aunt-note',
    name: '姑姑的笔记',
    icon: '📝',
    type: 'quest',
    description: '姑姑留下的经营笔记，记录着事务所的历史和她对练习生们的期望。字迹潦草但充满感情。',
    maxCount: 1,
  },
  'training-gear': {
    id: 'training-gear',
    name: '专业训练设备',
    icon: '🎧',
    type: 'upgrade',
    description: '高品质训练设备套装，能显著提升训练效果。需要 50 万韩元购入。',
    maxCount: 1,
    cost: 50,
  },
  'debut-invitation': {
    id: 'debut-invitation',
    name: '出道舞台邀请函',
    icon: '💌',
    type: 'quest',
    description: '电视台发来的出道舞台邀请函。这是你们梦寐以求的机会，但准备时间只有一个月。',
    maxCount: 1,
  },
  'comfort': {
    id: 'comfort',
    name: '安慰鼓励',
    icon: '🫂',
    type: 'social',
    description: '温暖的话语和拥抱，能有效缓解练习生的压力和负面情绪。',
    maxCount: 99,
  },
  'encourage': {
    id: 'encourage',
    name: '激励训话',
    icon: '🔥',
    type: 'social',
    description: '热血沸腾的激励演讲，能激发练习生的斗志和训练热情。',
    maxCount: 99,
  },
  'strict': {
    id: 'strict',
    name: '严格管教',
    icon: '📏',
    type: 'social',
    description: '严厉但公正的批评指导。短期压力增加但长期技能提升更快。',
    maxCount: 99,
  },
}

// ============================================================
// 章节数据 — 3 章
// ============================================================

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: '破晓时分',
    monthRange: [1, 6],
    description: '姑姑突然消失，留下一间濒临倒闭的事务所和三个性格各异的练习生。你必须在混乱中建立秩序。',
    objectives: ['了解每位练习生的性格和需求', '制定基础训练计划', '维持事务所不破产'],
    atmosphere: '迷茫中带着希望',
  },
  {
    id: 2,
    name: '星光初现',
    monthRange: [7, 18],
    description: '练习生们开始展露光芒，但竞争对手 NOVA Ent. 虎视眈眈。内部矛盾和外部压力交织，考验你的管理智慧。',
    objectives: ['提升练习生综合实力', '应对 NOVA 的挖角和打压', '策划第一次公演'],
    atmosphere: '紧张、成长、竞争',
  },
  {
    id: 3,
    name: '璀璨之夜',
    monthRange: [19, 36],
    description: '出道之路进入最后冲刺。练习生们必须面对最终选拔的残酷考验，而你必须做出影响所有人命运的抉择。',
    objectives: ['完成出道准备', '处理每位练习生的个人危机', '在出道舞台上绽放'],
    atmosphere: '悲壮、希望、绽放',
  },
]

// ============================================================
// 强制事件 — 5 个
// ============================================================

export const FORCED_EVENTS: ForcedEvent[] = [
  {
    id: 'recruit',
    name: '接管事务所',
    triggerMonth: 1,
    triggerPeriod: 0,
    description: '你推开事务所的门，三双眼睛望向你——金敏秀紧张地低头，朴智妍冷冷地打量你，崔成勋笑着递上咖啡。姑姑的办公桌上放着一封信。',
  },
  {
    id: 'first-show',
    name: '首次公演',
    triggerMonth: 6,
    description: '事务所的首次公开表演来了。虽然只是商场小舞台，但对练习生们来说意义非凡。准备得怎么样了？',
  },
  {
    id: 'poach-attempt',
    name: 'NOVA 的挖角',
    triggerMonth: 10,
    triggerPeriod: 2,
    description: 'NOVA Ent. 的制作人直接来到你的事务所，当着你的面向练习生们抛出橄榄枝。姜雅琳站在他身后，表情复杂。',
  },
  {
    id: 'scandal-crisis',
    name: '丑闻危机',
    triggerMonth: 15,
    description: '网上突然出现针对你事务所练习生的恶意爆料。真假参半的信息疯狂传播，事务所的名声岌岌可危。',
  },
  {
    id: 'debut-stage',
    name: '出道舞台',
    triggerMonth: 36,
    triggerPeriod: 3,
    description: '最终时刻到来。聚光灯亮起，镜头对准舞台中央。三位练习生站在出道舞台上，你在后台屏住呼吸...',
  },
]

// ============================================================
// 结局定义 — 5 种
// ============================================================

export const ENDINGS: Ending[] = [
  {
    id: 'te-legacy',
    name: '星光传承',
    type: 'TE',
    description: '三位练习生不仅成功出道，更成为引领新时代的偶像。姑姑回来了，看着你把事务所经营得比她当年还好，留下骄傲的泪水。你发现了姑姑离开的真相——她是为了让你找到自己的道路。这间小事务所，成了所有人的家。',
    condition: '全员信任≥70 + 发现姑姑真相 + 成功出道',
  },
  {
    id: 'he-debut',
    name: '梦想绽放',
    type: 'HE',
    description: '出道舞台上灯光璀璨，三位练习生完美演绎了你们共同创作的出道曲。虽然只是小公司的出道，但每个音符都饱含真心。你在后台热泪盈眶——他们真的做到了。',
    condition: '均信任≥50 + 技能达标 + 成功出道',
  },
  {
    id: 'be-bankrupt',
    name: '梦碎首尔',
    type: 'BE',
    description: '账户余额归零。银行的催款电话响个不停，房东贴出了限期搬离通知。练习生们默默收拾行李，谁也不看谁。金敏秀走的时候说了句"谢谢你"。你一个人坐在空荡荡的练习室里，霓虹灯在窗外忽明忽暗。',
    condition: '金钱降至 0',
  },
  {
    id: 'be-all-leave',
    name: '众叛亲离',
    type: 'BE',
    description: '最后一个练习生也走了。你站在空无一人的事务所里，墙上还贴着当初的训练计划。所有的梦想、承诺、汗水，都随着关门声消散在首尔的夜色中。',
    condition: '所有练习生信任<20',
  },
  {
    id: 'ne-landing',
    name: '软着陆',
    type: 'NE',
    description: '出道不算失败，但也谈不上成功。在竞争残酷的 K-pop 界，他们只是众多新人中不起眼的一组。但至少你们尝试过了，至少你们拥有彼此。有些梦想不需要轰轰烈烈，平安着地已是万幸。',
    condition: '出道但综合评分不足',
  },
]

// ============================================================
// 开场信笺
// ============================================================

export const STORY_INFO = {
  genre: 'K-pop 养成',
  title: '首尔星梦事务所',
  subtitle: 'Seoul Star Dream Agency · K-pop 养成冒险',
  description:
    '一通深夜来电打破了你平静的生活——' +
    '姑姑经营的练习生事务所濒临倒闭，而她本人不知去向。' +
    '你赶到首尔，推开那间小事务所的门，' +
    '三个怀揣梦想的年轻人正等着一个答案：这个事务所，还能继续吗？',
  goals: [
    '在 36 个月内培养 3 位练习生成功出道',
    '维持事务所的资金运转不破产',
    '赢得每位练习生的信任和成长',
    '应对对手 NOVA Ent. 的竞争和危机',
  ],
}

// ============================================================
// 工具函数
// ============================================================

/** 数值等级（通用） */
export function getStatLevel(value: number) {
  if (value >= 80) return { level: 4, name: '深度信赖' }
  if (value >= 60) return { level: 3, name: '伙伴关系' }
  if (value >= 30) return { level: 2, name: '逐渐了解' }
  return { level: 1, name: '初步接触' }
}

/** 获取当月可见角色（根据 joinMonth 过滤） */
export function getAvailableCharacters(
  month: number,
  characters: Record<string, Character>
): Record<string, Character> {
  return Object.fromEntries(
    Object.entries(characters).filter(([, char]) => char.joinMonth <= month)
  )
}

/** 获取当前章节 */
export function getCurrentChapter(month: number): Chapter {
  return CHAPTERS.find((ch) => month >= ch.monthRange[0] && month <= ch.monthRange[1]) ?? CHAPTERS[0]
}

/** 获取当月需要触发的强制事件 */
export function getMonthEvents(month: number, triggeredEvents: string[]): ForcedEvent[] {
  return FORCED_EVENTS.filter(
    (e) => e.triggerMonth === month && !triggeredEvents.includes(e.id)
  )
}
