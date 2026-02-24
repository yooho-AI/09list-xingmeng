/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 useBgm hook
 * [POS]: lib 的音频管理模块，被 App.tsx 和 mobile-layout.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect, useRef, useCallback } from 'react'

const BGM_URL = '/audio/bgm.mp3'
const BGM_VOLUME = 0.15

// 全局单例
let globalAudio: HTMLAudioElement | null = null
let hasAutoPlayed = false

export function useBgm() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 初始化音频并自动播放
  useEffect(() => {
    // 已有全局实例
    if (globalAudio) {
      audioRef.current = globalAudio
      setIsPlaying(!globalAudio.paused)
      return
    }

    const audio = new Audio(BGM_URL)
    audio.loop = true
    audio.volume = BGM_VOLUME
    audio.preload = 'auto'

    // 监听播放状态变化
    audio.onplay = () => setIsPlaying(true)
    audio.onpause = () => setIsPlaying(false)

    audio.oncanplaythrough = () => {
      globalAudio = audio
      audioRef.current = audio

      // 默认自动播放
      if (!hasAutoPlayed) {
        hasAutoPlayed = true
        audio.play().catch(() => {
          // 浏览器阻止自动播放，等待用户首次点击
          const playOnInteraction = () => {
            audio.play().catch(() => {})
            document.removeEventListener('click', playOnInteraction)
            document.removeEventListener('touchstart', playOnInteraction)
          }
          document.addEventListener('click', playOnInteraction, { once: true })
          document.addEventListener('touchstart', playOnInteraction, { once: true })
        })
      }
    }

    audio.onerror = () => console.warn('[BGM] 加载失败')
  }, [])

  // 切换播放/暂停
  const toggle = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    const audio = audioRef.current || globalAudio
    if (!audio) return

    if (audio.paused) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [])

  return { isPlaying, toggle }
}
