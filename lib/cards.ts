import { Card, Suit, Rank } from '@/types/game'

const SUITS: Suit[] = ['♣', '♠', '♥', '♦']
const RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}`
      })
    }
  }
  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function dealCards(playerCount: number): Card[][] {
  const deck = shuffleDeck(createDeck())
  const hands: Card[][] = Array.from({ length: playerCount }, () => [])
  
  deck.forEach((card, index) => {
    hands[index % playerCount].push(card)
  })
  
  return hands
}

export function findClubSeven(hands: Card[][]): number {
  return hands.findIndex(hand => 
    hand.some(card => card.suit === '♣' && card.rank === '7')
  )
}

export function hasQuads(cards: Card[]): { rank: Rank; cards: Card[] } | null {
  const rankCounts = new Map<Rank, Card[]>()
  
  for (const card of cards) {
    if (!rankCounts.has(card.rank)) {
      rankCounts.set(card.rank, [])
    }
    rankCounts.get(card.rank)!.push(card)
  }
  
  for (const [rank, rankCards] of rankCounts) {
    if (rankCards.length === 4) {
      return { rank, cards: rankCards }
    }
  }
  
  return null
}

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
