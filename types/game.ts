export type Suit = '♠' | '♥' | '♦' | '♣'
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
}

export interface Player {
  id: string
  room_id: string
  player_name: string
  player_order: number
  is_host: boolean
  is_active: boolean
  cards: Card[]
  created_at?: string
  placement?: number | null
  is_winner?: boolean | null
}

export interface GameRoom {
  id: string
  room_code: string
  host_id: string | null
  status: 'waiting' | 'playing' | 'finished'
  max_players: number
  created_at?: string
}

export interface GameState {
  id: string
  room_id: string
  current_player_id: string
  pile_cards: Card[]
  last_claim: string | null
  last_claim_rank: Rank | null
  last_claim_count: number | null
  removed_quads: Rank[]
  created_at?: string
  updated_at?: string
}

export interface GameAction {
  id: string
  room_id: string
  player_id: string
  action_type: 'play_card' | 'call_liar'
  action_data: any
  created_at?: string
}
