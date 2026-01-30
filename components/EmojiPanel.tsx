'use client'

import { useState } from 'react'

interface EmojiPanelProps {
  onSendEmoji: (emoji: string) => void
  disabled?: boolean
}

const EMOJIS = ['👍', '❤️', '😂', '🎉', '😱', '🔥', '💪', '👎', '😎', '🤔']

export default function EmojiPanel({ onSendEmoji, disabled = false }: EmojiPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  function handleEmojiClick(emoji: string) {
    onSendEmoji(emoji)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="btn btn--secondary text-2xl px-4 py-2 hover:scale-110 transition-transform"
        title="Emoji senden"
      >
        😊
      </button>

      {isOpen && (
        <>
          {/* Overlay zum Schließen */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Emoji-Grid */}
          <div className="absolute bottom-full left-0 mb-2 bg-color-surface border-2 border-color-border rounded-xl shadow-2xl p-3 z-20">
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
          </div>
        </>
      )}
    </div>
  )
}
