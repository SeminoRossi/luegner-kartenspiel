'use client'

import { Card } from '@/types/game'

interface PlayerHandProps {
  cards: Card[]
  selectedCards: Card[]
  onSelectCard: (card: Card) => void
  disabled?: boolean
}

export default function PlayerHand({ cards, selectedCards, onSelectCard, disabled }: PlayerHandProps) {
  return (
    <div className="card">
      <div className="card__header">
        <h3 className="font-semibold">Deine Karten ({cards.length})</h3>
      </div>
      <div className="card__body">
        <div className="flex flex-wrap gap-2">
          {cards.map((card) => {
            const isSelected = selectedCards.some(c => c.id === card.id)
            const suitColor = ['♥', '♦'].includes(card.suit) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
            
            return (
              <button
                key={card.id}
                onClick={() => onSelectCard(card)}
                disabled={disabled}
                className={`
                  relative w-16 h-24 rounded-lg border-2 flex flex-col items-center justify-center
                  font-bold text-lg transition-all
                  ${isSelected 
                    ? 'border-color-primary bg-color-bg-1 -translate-y-3 shadow-lg' 
                    : 'border-color-border bg-color-surface hover:border-color-primary hover:-translate-y-1'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span className={`text-2xl ${suitColor}`}>{card.suit}</span>
                <span className={`text-xl ${suitColor}`}>{card.rank}</span>
              </button>
            )
          })}
        </div>
        {cards.length === 0 && (
          <p className="text-color-text-secondary text-center py-8">
            Keine Karten mehr! 🎉
          </p>
        )}
      </div>
    </div>
  )
}
