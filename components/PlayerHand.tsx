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
        <div className="flex gap-2 md:gap-4 flex-wrap justify-center">
          {cards.map((card) => {
            const isSelected = selectedCards.some(c => c.id === card.id)
            const suitColor = ['♥', '♦'].includes(card.suit) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
            
            return (
              <button
                key={card.id}
                onClick={() => !disabled && onSelectCard(card)}
                disabled={disabled}
                style={{ 
                  width: '100px',  // Mobile: noch kleiner (vorher 120px)
                  height: '150px'  // Mobile: noch kleiner (vorher 180px)
                }}
                className={`
                  md:w-[160px] md:h-[240px]
                  rounded-xl border-2 flex flex-col items-center justify-center
                  transition-all duration-200 shadow-lg
                  ${isSelected 
                    ? 'border-color-primary bg-color-secondary -translate-y-4 shadow-2xl scale-105 ring-4 ring-color-primary ring-opacity-50' 
                    : 'border-color-border bg-color-surface hover:bg-color-secondary hover:-translate-y-2'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl hover:scale-105'}
                `}
              >
                <span className={`text-4xl md:text-7xl mb-1 md:mb-3 ${suitColor}`}>{card.suit}</span>
                <span className={`text-2xl md:text-5xl font-bold ${suitColor}`}>{card.rank}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
