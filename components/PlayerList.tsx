'use client'

import { Player } from '@/types/game'

interface PlayerListProps {
  players: Player[]
  currentPlayerId: string | null
  myPlayerId: string
}

export default function PlayerList({ players, currentPlayerId, myPlayerId }: PlayerListProps) {
  return (
    <div className="card">
      <div className="card__header">
        <h3 className="font-semibold">Spieler ({players.length})</h3>
      </div>
      <div className="card__body">
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                player.id === currentPlayerId
                  ? 'bg-color-bg-1 border-2 border-color-primary'
                  : 'bg-color-secondary'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {player.player_name}
                  {player.id === myPlayerId && ' (Du)'}
                  {player.is_host && ' 👑'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-color-text-secondary">
                  {player.cards.length} Karten
                </span>
                {player.id === currentPlayerId && (
                  <span className="status status--success text-xs">
                    Am Zug
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
