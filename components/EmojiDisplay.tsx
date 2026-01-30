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
    <div className="fixed inset-0 z-40 pointer-events-none flex items-start justify-center pt-32">
      <div className="flex gap-2">
        {reactions.slice(0,4).map((reaction) => (
          <div key={reaction.id} className="bg-white/90 backdrop-blur border border-color-primary rounded-xl px-4 py-2 shadow-xl animate-pop-in flex items-center gap-2 min-w-0">
            <span className="text-2xl flex-shrink-0">{reaction.emoji}</span>
            <span className="font-bold text-color-primary text-sm truncate">{reaction.player_name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
