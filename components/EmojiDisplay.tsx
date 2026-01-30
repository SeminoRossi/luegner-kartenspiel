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
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex flex-col gap-3 max-w-md items-center">
        {reactions.map((reaction, index) => (
          <div
            key={reaction.id}
            style={{ animationDelay: `${index * 0.1}s` }}
            className="animate-slide-in-fade bg-gradient-to-r from-color-primary/10 to-color-primary/20 backdrop-blur-sm border border-color-primary/50 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-3 min-w-0"
          >
            <span className="text-4xl flex-shrink-0">{reaction.emoji}</span>
            <span className="font-bold text-color-primary text-lg truncate max-w-[150px] sm:max-w-[200px]">
              {reaction.player_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
