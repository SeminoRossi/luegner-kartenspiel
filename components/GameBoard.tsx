'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Player, GameState, GameRoom, Card, Rank } from '@/types/game'
import { startGame, playCards, callLiar } from '@/lib/gameLogic'
import PlayerList from './PlayerList'
import PlayerHand from './PlayerHand'

interface GameBoardProps {
  roomCode: string
  initialPlayers: Player[]
  initialRoom: GameRoom
}

const RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export default function GameBoard({ roomCode, initialPlayers, initialRoom }: GameBoardProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [room, setRoom] = useState<GameRoom>(initialRoom)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string>('')
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const [claimRank, setClaimRank] = useState<Rank>('7')
  const [loading, setLoading] = useState(false)
  const [revealedCards, setRevealedCards] = useState<Card[] | null>(null)
  const [revealMessage, setRevealMessage] = useState('')
  const [isShuffling, setIsShuffling] = useState(false)

  const myPlayer = players.find(p => p.id === myPlayerId)

  useEffect(() => {
    const playerName = localStorage.getItem('player_name')
    const player = players.find(p => p.player_name === playerName)
    if (player) setMyPlayerId(player.id)

    const playersChannel = supabase
      .channel('players-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${initialRoom.id}` },
        async () => {
          const { data } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', initialRoom.id)
            .order('player_order')
          if (data) setPlayers(data)
        }
      )
      .subscribe()

    const roomChannel = supabase
      .channel('room-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${initialRoom.id}` },
        async () => {
          const { data } = await supabase
            .from('game_rooms')
            .select('*')
            .eq('id', initialRoom.id)
            .single()
          if (data) setRoom(data)
        }
      )
      .subscribe()

    const stateChannel = supabase
      .channel('state-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `room_id=eq.${initialRoom.id}` },
        async () => {
          const { data } = await supabase
            .from('game_state')
            .select('*')
            .eq('room_id', initialRoom.id)
            .single()
          if (data) setGameState(data)
        }
      )
      .subscribe()

    loadGameState()

    return () => {
      playersChannel.unsubscribe()
      roomChannel.unsubscribe()
      stateChannel.unsubscribe()
    }
  }, [initialRoom.id, players])

  async function loadGameState() {
    const { data } = await supabase
      .from('game_state')
      .select('*')
      .eq('room_id', initialRoom.id)
      .single()
    
    if (data) setGameState(data)
  }

  async function handleStartGame() {
    setLoading(true)
    setIsShuffling(true)
    
    try {
      await startGame(initialRoom.id)
      
      setTimeout(() => {
        setIsShuffling(false)
      }, 2000)
    } catch (err: any) {
      alert(err.message)
      setIsShuffling(false)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectCard(card: Card) {
    if (selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id))
    } else if (selectedCards.length < 3) {
      setSelectedCards([...selectedCards, card])
    }
  }

  async function handlePlayCards() {
    if (selectedCards.length === 0) {
      alert('Bitte wähle 1-3 Karten aus')
      return
    }

    if (!myPlayer) return

    setLoading(true)
    try {
      const isFirstRound = !gameState?.last_claim_rank
      
      await playCards(
        initialRoom.id,
        myPlayer.id,
        selectedCards,
        isFirstRound ? claimRank : undefined,
        isFirstRound ? selectedCards.length : undefined
      )
      
      setSelectedCards([])
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCallLiar() {
    if (!myPlayer) return

    setLoading(true)
    try {
      const result = await callLiar(initialRoom.id, myPlayer.id)
      
      setRevealedCards(result.revealedCards)
      setRevealMessage(
        result.wasLying 
          ? '🎉 Richtig! Der Spieler hat gelogen!' 
          : '❌ Falsch! Der Spieler hat die Wahrheit gesagt!'
      )
      
      setTimeout(() => {
        setRevealedCards(null)
        setRevealMessage('')
      }, 5000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isMyTurn = gameState?.current_player_id === myPlayerId
  const canStart = room.status === 'waiting' && myPlayer?.is_host && players.length >= 2
  const canCallLiar = !isMyTurn && (gameState?.pile_cards?.length || 0) > 0

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="card">
        <div className="card__body">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🎴 Lügner</h1>
              <p className="text-color-text-secondary">Raum: {roomCode}</p>
            </div>
            <div className="text-right">
              <div className="status status--info">
                {room.status === 'waiting' && 'Warte auf Spieler...'}
                {room.status === 'playing' && 'Spiel läuft'}
                {room.status === 'finished' && 'Spiel beendet'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isShuffling && (
        <div className="card bg-color-bg-1 border-2 border-color-primary">
          <div className="card__body text-center">
            <div className="text-6xl mb-4 animate-bounce">🎴</div>
            <h2 className="text-2xl font-bold">Karten werden gemischt...</h2>
          </div>
        </div>
      )}

      {room.status === 'waiting' && (
        <div className="card">
          <div className="card__body text-center">
            <h2 className="text-xl font-semibold mb-4">Warte auf Spieler (min. 2)</h2>
            <p className="text-color-text-secondary mb-6">
              Teile den Code <span className="font-mono font-bold text-color-primary">{roomCode}</span> mit deinen Freunden!
            </p>
            {canStart && (
              <button
                onClick={handleStartGame}
                disabled={loading}
                className="btn btn--primary text-lg px-8 py-3"
              >
                {loading ? 'Starte...' : '🎴 Spiel starten'}
              </button>
            )}
          </div>
        </div>
      )}

      {room.status === 'playing' && gameState && myPlayer && (
        <>
          <div className="card">
            <div className="card__body text-center">
              {gameState.last_claim_rank ? (
                <>
                  <p className="text-color-text-secondary mb-2">Aktuelle Ansage:</p>
                  <h2 className="text-5xl font-bold text-color-primary mb-2">
                    {gameState.last_claim_count}x {gameState.last_claim_rank}
                  </h2>
                  <p className="text-sm text-color-text-secondary mt-2">
                    📚 Stapel: {gameState.pile_cards?.length || 0} Karten
                  </p>
                </>
              ) : (
                <p className="text-xl text-color-text-secondary">
                  Erste Ansage wählen...
                </p>
              )}
            </div>
          </div>

          {canCallLiar && (
            <div className="card bg-red-500/10 border-2 border-red-500">
              <div className="card__body">
                <button
                  onClick={handleCallLiar}
                  disabled={loading}
                  className="btn btn--full-width text-xl py-4"
                  style={{ backgroundColor: '#ef4444', color: 'white' }}
                >
                  {loading ? 'Prüfe...' : '🚨 LÜGNER! 🚨'}
                </button>
                <p className="text-center text-sm text-color-text-secondary mt-2">
                  Klicke hier, wenn du denkst dass die Ansage gelogen ist!
                </p>
              </div>
            </div>
          )}

          {revealedCards && (
            <div className="card bg-color-bg-1 border-2 border-color-primary">
              <div className="card__body text-center">
                <h3 className="text-2xl font-bold mb-6">{revealMessage}</h3>
                <p className="text-sm text-color-text-secondary mb-4">Aufgedeckte Karten:</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  {revealedCards.map((card, idx) => {
                    const suitColor = ['♥', '♦'].includes(card.suit) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
                    return (
                      <div key={idx} style={{ width: '96px', height: '144px' }} className="rounded-xl border-2 border-color-border bg-color-surface flex flex-col items-center justify-center shadow-xl">
                        <span className={`text-5xl mb-2 ${suitColor}`}>{card.suit}</span>
                        <span className={`text-3xl font-bold ${suitColor}`}>{card.rank}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <PlayerHand
            cards={myPlayer.cards || []}
            selectedCards={selectedCards}
            onSelectCard={handleSelectCard}
            disabled={!isMyTurn || loading}
          />

          {isMyTurn && (
            <div className="card bg-color-bg-1 border-2 border-color-primary">
              <div className="card__body space-y-4">
                <div className="text-center mb-4">
                  <span className="inline-block px-4 py-2 bg-color-primary text-color-btn-primary-text rounded-full font-bold">
                    ⭐ Du bist am Zug!
                  </span>
                </div>
                
                {!gameState.last_claim_rank && (
                  <div className="form-group">
                    <label className="form-label text-lg">Wähle deine Ansage:</label>
                    <select
                      value={claimRank}
                      onChange={(e) => setClaimRank(e.target.value as Rank)}
                      className="form-control text-xl py-3"
                    >
                      {RANKS.map(rank => (
                        <option key={rank} value={rank}>{rank}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handlePlayCards}
                  disabled={selectedCards.length === 0 || loading}
                  className="btn btn--primary btn--full-width text-xl py-4"
                >
                  {loading ? 'Lege...' : `🃏 ${selectedCards.length} Karte(n) ablegen`}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <PlayerList
        players={players}
        currentPlayerId={gameState?.current_player_id || null}
        myPlayerId={myPlayerId}
      />
    </div>
  )
}
