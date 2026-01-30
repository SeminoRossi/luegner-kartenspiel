'use client'

interface EmojiReaction {
  id: string
  player_name: string
  emoji: string
  created_at: string
}

interface EmojiDisplayProps {
  reactions: EmojiReaction[]
}

export default function EmojiDisplay({ reactions }: EmojiDisplayProps) {
  if (reactions.length === 0) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex flex-col gap-2 items-center">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="animate-bounce-in bg-color-surface border-2 border-color-primary rounded-full px-4 py-2 shadow-2xl flex items-center gap-2"
          >
            <span className="text-3xl">{reaction.emoji}</span>
            <span className="text-sm font-bold text-color-primary">
              {reaction.player_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
