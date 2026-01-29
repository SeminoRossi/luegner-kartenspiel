'use client'

import { Card } from '@/types/game'

interface PlayerHandProps {
  cards: Card[]
  selectedCards: Card[]
  onSelectCard: (card: Card)
  disabled?: boolean
}

export default function PlayerHand({ cards, selectedCards, onSelectCard, disabled }: PlayerHandProps) {
  return (
    <div className="card">
      <div className="card__header">
        <h3 className="font-semibold">Deine Karten ({cards.length})</h3>
      </div>
      <div className="card__body">
        <div className="flex flex-wrap gap-3 justify-center">
          {cards.map((card) => {
            const isSelected = selectedCards.some(c => c.id === card.id)
            const suitColor = ['♥', '♦'].includes(card.suit) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
            
            return (
              <button
                key={card.id}
                onClick={() => onSelectCard(card)}
                disabled={disabled}
                className={`
                  relative w-24 h-36 rounded-xl border-2 flex flex-col items-center justify-center
                  font-bold transition-all transform hover:scale-105
                  ${isSelected 
                    ? 'border-color-primary bg-color-bg-1 -translate-y-4 shadow-2xl scale-110' 
                    : 'border-color-border bg-color-surface hover:border-color-primary hover:-translate-y-2 shadow-lg'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span className={`text-5xl mb-2 ${suitColor}`}>{card.suit}</span>
                <span className={`text-3xl font-bold ${suitColor}`}>{card.rank}</span>
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-color-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                    ✓
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {cards.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-xl font-bold text-color-primary">
              Keine Karten mehr! Du hast gewonnen!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
