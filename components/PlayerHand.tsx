'use client'

import { Card } from '@/types/game'

interface PlayerHandProps {
  cards: Card[]
  selectedCards: Card[]
  onSelectCard: (card: Card) => void
  disabled?: boolean
}

export default function PlayerHand({ cards, selectedCards, onSelectCard, disabled = false }: PlayerHandProps) {
  return (
    <div className="card">
      <div className="card__body">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Deine Karten ({cards.length})</h3>
        <div className="flex gap-3 md:gap-4 flex-wrap justify-center">
          {cards.map((card) => {
            const isSelected = selectedCards.some(c => c.id === card.id)
            const suitColor = ['♥', '♦'].includes(card.suit) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
            
            return (
              <button
                key={card.id}
                onClick={() => !disabled && onSelectCard(card)}
                disabled={disabled}
                style={{ 
                  width: '160px',  // Doppelt so groß (vorher 80px)
                  height: '240px'  // Doppelt so groß (vorher 120px)
                }}
                className={`
                  rounded-xl border-2 flex flex-col items-center justify-center
                  transition-all duration-200 shadow-lg
                  ${isSelected 
                    ? 'border-color-primary bg-color-secondary -translate-y-4 shadow-2xl' 
                    : 'border-color-border bg-color-surface hover:bg-color-secondary hover:-translate-y-2'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}
                `}
              >
                <span className={`text-7xl md:text-8xl mb-3 md:mb-4 ${suitColor}`}>{card.suit}</span>
                <span className={`text-5xl md:text-6xl font-bold ${suitColor}`}>{card.rank}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
