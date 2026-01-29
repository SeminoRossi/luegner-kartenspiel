export type Suit = '♣' | '♠' | '♥' | '♦'
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: Suit
  rank: Rank
  id: string
}

export interface Player {
  id: string
  room_id: string
  player_name: string
  player_order: number
  cards: Card[]
  is_host: boolean
  is_active: boolean
  joined_at: string
}

export interface GameRoom {
  id: string
  room_code: string
  host_id: string | null
  status: 'waiting' | 'playing' | 'finished'
  max_players: number
  current_round: number
  created_at: string
  updated_at: string
}

export interface GameState {
  room_id: string
  current_player_id: string | null
  pile_cards: Card[]
  last_claim: string | null
  last_claim_rank: Rank | null
  last_claim_count: number | null
  updated_at: string
}

export interface GameAction {
  id: string
  room_id: string
  player_id: string | null
  action_type: 'play_card' | 'call_liar' | 'new_round' | 'game_end'
  action_data: any
  created_at: string
}
