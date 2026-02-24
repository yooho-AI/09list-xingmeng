/**
 * [INPUT]: 无外部依赖（颜色硬编码，避免循环依赖）
 * [OUTPUT]: 对外提供 parseStoryParagraph, parseInlineContent, escapeHtml
 * [POS]: lib 的 AI 回复文本解析器，被 dialogue-panel 和 mobile-layout 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================
// 角色配色表（4 NPC 硬编码，避免运行时依赖动态角色）
// ============================================================

const CHARACTER_COLORS: Record<string, string> = {
  '金敏秀': '#3b82f6',
  '朴智妍': '#ec4899',
  '崔成勋': '#fbbf24',
  '姜雅琳': '#6b7280',
}

// ============================================================
// 数值配色表（11 种数值）
// ============================================================

const STAT_COLORS: Record<string, string> = {
  '信任': '#e91e8c',
  '信任度': '#e91e8c',
  '依赖': '#ff6b9d',
  '依赖度': '#ff6b9d',
  '心情': '#ffd700',
  '健康': '#00d4ff',
  '压力': '#9333ea',
  '舞蹈': '#f97316',
  '歌唱': '#10b981',
  '综艺感': '#f59e0b',
  '人气': '#ec4899',
  '态度': '#6b7280',
  '金钱': '#ffd700',
  '资金': '#ffd700',
  '名声': '#e91e8c',
  '声望': '#e91e8c',
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function parseInlineContent(text: string): string {
  if (!text) return ''
  let result = ''
  let remaining = text
  let safety = 0

  while (remaining.length > 0 && safety < 100) {
    safety++
    remaining = remaining.trim()
    if (!remaining) break

    /* （动作） */
    const actionMatch = remaining.match(/^[（(]([^）)]+)[）)]/)
    if (actionMatch) {
      result += `<span class="action">（${escapeHtml(actionMatch[1])}）</span>`
      remaining = remaining.slice(actionMatch[0].length)
      continue
    }

    /* *动作* */
    const starMatch = remaining.match(/^\*([^*]+)\*/)
    if (starMatch) {
      result += `<span class="action">*${escapeHtml(starMatch[1])}*</span>`
      remaining = remaining.slice(starMatch[0].length)
      continue
    }

    /* "对话" 或 "对话" */
    const dialogueMatch = remaining.match(/^[""\u201c]([^""\u201d]+)[""\u201d]/)
    if (dialogueMatch) {
      result += `<span class="dialogue">\u201c${escapeHtml(dialogueMatch[1])}\u201d</span>`
      remaining = remaining.slice(dialogueMatch[0].length)
      continue
    }

    /* 下一个特殊标记 */
    const nextAction = remaining.search(/[（(]/)
    const nextStar = remaining.search(/\*/)
    const nextDialogue = remaining.search(/[""\u201c]/)
    const positions = [nextAction, nextStar, nextDialogue].filter((p) => p > 0)

    if (positions.length > 0) {
      const nextPos = Math.min(...positions)
      const plain = remaining.slice(0, nextPos).trim()
      if (plain) result += `<span class="plain-text">${escapeHtml(plain)}</span>`
      remaining = remaining.slice(nextPos)
    } else {
      const plain = remaining.trim()
      if (plain) result += `<span class="plain-text">${escapeHtml(plain)}</span>`
      break
    }
  }
  return result
}

export function parseStoryParagraph(content: string): { narrative: string; statHtml: string } {
  if (!content) return { narrative: '', statHtml: '' }

  const lines = content.split('\n').filter((l) => l.trim())
  const storyParts: string[] = []
  const statChanges: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    /* 数值变化 【好感度+2】 */
    const statMatch = trimmed.match(/^【([^】]*[+-]\d+[^】]*)】$/)
    if (statMatch) {
      statChanges.push(statMatch[1])
      continue
    }

    /* 【角色名】开头 */
    const charMatch = trimmed.match(/^【([^】]+)】(.*)/)
    if (charMatch) {
      const charName = charMatch[1]
      const rest = charMatch[2].trim()
      if (charName.match(/[+-]\d+/)) {
        statChanges.push(charName)
        continue
      }
      const color = CHARACTER_COLORS[charName] || '#e91e8c'
      const lineHtml = parseInlineContent(rest)
      storyParts.push(
        `<p class="dialogue-line"><span class="char-name" style="color:${color}">【${escapeHtml(charName)}】</span>${lineHtml}</p>`
      )
      continue
    }

    /* 纯旁白 vs 混合内容 */
    const hasDialogue = trimmed.match(/[""\u201c][^""\u201d]+[""\u201d]/)
    const hasAction = trimmed.match(/[（(][^）)]+[）)]/) || trimmed.match(/\*[^*]+\*/)
    if (!hasDialogue && !hasAction) {
      storyParts.push(`<p class="narration">${escapeHtml(trimmed)}</p>`)
    } else {
      const lineHtml = parseInlineContent(trimmed)
      if (lineHtml) storyParts.push(`<p class="dialogue-line">${lineHtml}</p>`)
    }
  }

  let narrative = storyParts.join('')
  let statHtml = ''

  if (statChanges.length > 0) {
    const statText = statChanges
      .map((s) => {
        let color = '#9b9a97'
        for (const [keyword, c] of Object.entries(STAT_COLORS)) {
          if (s.includes(keyword)) { color = c; break }
        }
        return `<span style="color:${color}">【${escapeHtml(s)}】</span>`
      })
      .join(' ')
    statHtml = `<p class="narration" style="font-style:normal;border-left:none;padding-left:0;margin-bottom:0;font-size:13px">${statText}</p>`
  }

  return { narrative, statHtml }
}
