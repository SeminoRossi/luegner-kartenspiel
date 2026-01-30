'use client'

import { useState, useCallback } from 'react'

interface EmojiPanelProps {
  onSendEmoji: (emoji: string) => void
  disabled?: boolean
}

const EMOJIS = ['👍', '❤️', '😂', '🎉', '😱', '🔥', '💪', '👎', '😎', '🤔', '🖕']

export default function EmojiPanel({ onSendEmoji, disabled = false }: EmojiPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)

  const canSend = Date.now() >= cooldownUntil

  const handleEmojiClick = useCallback((emoji: string) => {
    if (!canSend) return
    
    onSendEmoji(emoji)
    setIsOpen(false)
    setCooldownUntil(Date.now() + 5000) // 5 Sekunden Cooldown
  }, [onSendEmoji, canSend])

  const remainingTime = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && canSend && setIsOpen(!isOpen)}
        disabled={disabled || !canSend}
        className={`btn btn--secondary text-2xl px-4 py-2 hover:scale-110 transition-transform ${
          !canSend ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title={canSend ? 'Emoji senden' : `Noch ${remainingTime}s`}
      >
        {canSend ? '😊' : '⏳'}
      </button>

      {isOpen && (
        <>
          {/* Overlay zum Schließen */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Emoji-Grid - jetzt SMART POSITION (oben oder unten je nach Platz) */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-color-surface border-2 border-color-border rounded-xl shadow-2xl p-3 z-20 min-w-[280px]">
            <div className="grid grid-cols-5 gap-2">
              {EMOJIS.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-3xl hover:scale-125 transition-transform active:scale-95 w-12 h-12 flex items-center justify-center rounded-lg hover:bg-color-secondary"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {!canSend && (
              <div className="mt-3 pt-2 border-t border-color-border text-center">
                <p className="text-sm text-color-text-secondary">
                  ⏳ Noch <span className="font-bold text-color-primary">{remainingTime}s</span>
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
