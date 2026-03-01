/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 trackEvent 及预定义事件追踪函数
 * [POS]: lib 的数据统计模块，被 store.ts 和 App.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: Record<string, string | number>) => void
    }
  }
}

export function trackEvent(name: string, data?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(name, data)
  }
}

// ============================================================
// 预定义事件 — xm_ 前缀
// ============================================================

export function trackGameStart() {
  trackEvent('xm_game_start')
}

export function trackGameContinue() {
  trackEvent('xm_game_continue')
}

export function trackTimeAdvance(month: number, period: string) {
  trackEvent('xm_time_advance', { month, period })
}

export function trackPlayerCreate(gender: string, name: string) {
  trackEvent('xm_player_create', { gender, name })
}

export function trackChapterEnter(chapter: number) {
  trackEvent('xm_chapter_enter', { chapter })
}

export function trackEndingReached(ending: string) {
  trackEvent('xm_ending_reached', { ending })
}

export function trackBankrupt() {
  trackEvent('xm_bankrupt')
}

export function trackSceneUnlock(scene: string) {
  trackEvent('xm_scene_unlock', { scene })
}

export function trackStressCrisis(charId: string, stress: number) {
  trackEvent('xm_stress_crisis', { charId, stress })
}
