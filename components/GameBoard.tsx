'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Player, GameState, GameRoom, Card, Rank } from '@/types/game'
import { startGame, playCards, callLiar, requestRematch } from '@/lib/gameLogic'
import PlayerList from './PlayerList'
import PlayerHand from './PlayerHand'

interface GameBoardProps {
  roomCode: string
  initialPlayers: Player[]
  initialRoom: GameRoom
}

const RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']

const PLACEMENT_MEDALS: { [key: number]: string } = {
  1: '🥇',
  2: '🥈', 
  3: '🥉'
}

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
  const rankedPlayers = [...players]
    .filter(p => p.placement !== null)
    .sort((a, b) => (a.placement || 0) - (b.placement || 0))

  const readyForRematchCount = players.filter(p => p.ready_for_rematch === true).length
  const allPlayersReady = readyForRematchCount === players.length && players.length > 0

  const myPlacementSet = myPlayer?.placement !== null && myPlayer?.placement !== undefined
  const isMyTurn = gameState?.current_player_id === myPlayerId

  async function reloadAllData() {
    const { data: updatedPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', initialRoom.id)
      .order('player_order')
    
    if (updatedPlayers) setPlayers(updatedPlayers)

    const { data: updatedRoom } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', initialRoom.id)
      .single()
    
    if (updatedRoom) setRoom(updatedRoom)

    const { data: updatedState } = await supabase
      .from('game_state')
      .select('*')
      .eq('room_id', initialRoom.id)
      .maybeSingle()
    
    if (updatedState) setGameState(updatedState)
  }

  useEffect(() => {
    const playerName = localStorage.getItem('player_name')
    const player = players.find(p => p.player_name === playerName)
    if (player) setMyPlayerId(player.id)

    const playersChannel = supabase
      .channel('players-realtime-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${initialRoom.id}` },
        async () => {
          await reloadAllData()
        }
      )
      .subscribe()

    const roomChannel = supabase
      .channel('room-realtime-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${initialRoom.id}` },
        async () => {
          await reloadAllData()
        }
      )
      .subscribe()

    const stateChannel = supabase
      .channel('state-realtime-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `room_id=eq.${initialRoom.id}` },
        async () => {
          await reloadAllData()
        }
      )
      .subscribe()

    reloadAllData()

    return () => {
      playersChannel.unsubscribe()
      roomChannel.unsubscribe()
      stateChannel.unsubscribe()
    }
  }, [initialRoom.id])

  async function handleStartGame() {
    setLoading(true)
    setIsShuffling(true)
    
    try {
      await startGame(initialRoom.id)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      await reloadAllData()
      
      setTimeout(() => {
        setIsShuffling(false)
      }, 1500)
    } catch (err: any) {
      console.error('Fehler beim Spielstart:', err)
      alert(err.message)
      setIsShuffling(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleRematch() {
    if (!myPlayer) return
    
    setLoading(true)
    setIsShuffling(true)
    
    try {
      await requestRematch(initialRoom.id, myPlayer.id)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      await reloadAllData()
      
      if (room?.status === 'playing') {
        setTimeout(() => {
          setIsShuffling(false)
        }, 1500)
      } else {
        setIsShuffling(false)
      }
    } catch (err: any) {
      console.error('Fehler beim Rematch:', err)
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
      
      setTimeout(async () => {
        await reloadAllData()
      }, 500)
    } catch (err: any) {
      console.error('Fehler beim Karten legen:', err)
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
      
      setTimeout(async () => {
        await reloadAllData()
      }, 500)
    } catch (err: any) {
      console.error('Fehler beim Lügner rufen:', err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const canStart = room.status === 'waiting' && myPlayer?.is_host && players.length >= 2
  const canCallLiar = isMyTurn && (gameState?.pile_cards?.length || 0) > 0
  const myPlayerReady = myPlayer?.ready_for_rematch === true

  const shouldShowEndScreen = room.status === 'finished' || myPlacementSet

  const getClaimSuit = (rank: string) => {
    const redRanks = ['7', '9', 'J', 'K']
    return redRanks.includes(rank) ? '♦' : '♠'
  }

  const removedQuads = gameState?.removed_quads || []

  return (
    <div className="container mx-auto py-4 px-2 space-y-4 md:py-8 md:space-y-6">
      <div className="card">
        <div className="card__body">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">🎴 Lügner</h1>
              <p className="text-sm md:text-base text-color-text-secondary">Raum: {roomCode}</p>
            </div>
            <div className="text-right">
              <div className="status status--info text-xs md:text-sm">
                {room.status === 'waiting' && 'Warte...'}
                {room.status === 'playing' && !myPlacementSet && 'Läuft'}
                {shouldShowEndScreen && 'Beendet'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {room.status === 'playing' && removedQuads.length > 0 && (
        <div className="card bg-color-bg-4">
          <div className="card__body">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪦</span>
                <h3 className="text-sm md:text-base font-semibold">Friedhof</h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                {removedQuads.map((rank, idx) => {
                  const suit = getClaimSuit(rank)
                  const suitColor = ['♥', '♦'].includes(suit) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
                  return (
                    <div 
                      key={idx}
                      style={{ width: '50px', height: '75px' }}
                      className="rounded-lg border-2 border-gray-400 bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center opacity-70"
                    >
                      <span className={`text-2xl ${suitColor}`}>{suit}</span>
                      <span className={`text-lg font-bold ${suitColor}`}>{rank}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {isShuffling && (
        <div className="card bg-color-bg-1 border-2 border-color-primary">
          <div className="card__body text-center">
            <div className="text-4xl md:text-6xl mb-4 animate-bounce">🎴</div>
            <h2 className="text-xl md:text-2xl font-bold">Karten werden gemischt...</h2>
          </div>
        </div>
      )}

      {shouldShowEndScreen && rankedPlayers.length > 0 && (
        <div className="card bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 border-4 border-yellow-300 shadow-2xl">
          <div className="card__body text-center py-8">
            <div className="text-5xl md:text-7xl mb-6 animate-bounce">🏁</div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Endstand</h2>
            
            <div className="space-y-4 mb-8">
              {rankedPlayers.map(player => {
                const isMe = player.id === myPlayerId
                const placement = player.placement || 0
                const isWinner = placement === 1
                const isLoser = placement === players.length
                const medal = PLACEMENT_MEDALS[placement] || `${placement}.`
                
                return (
                  <div 
                    key={player.id} 
                    className={`p-4 rounded-xl ${
                      isWinner ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 animate-pulse' :
                      isLoser ? 'bg-gradient-to-r from-gray-600 to-gray-800' :
                      'bg-white/20'
                    } ${isMe ? 'border-4 border-white' : 'border-2 border-white/50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl md:text-5xl">{medal}</span>
                        <div className="text-left">
                          <div className="text-xl md:text-2xl font-bold text-white">
                            {player.player_name} {isMe && '(Du)'}
                          </div>
                          {isWinner && (
                            <div className="text-sm md:text-base text-yellow-200 font-semibold">
                              🏆 Gewinner!
                            </div>
                          )}
                          {isLoser && (
                            <div className="text-sm md:text-base text-gray-300">
                              Verlierer
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg md:text-xl font-bold text-white">
                          Platz {placement}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {rankedPlayers.length < players.length && (
              <div className="mb-6 p-4 bg-white/10 rounded-xl">
                <p className="text-white text-lg">
                  ⏳ Warte auf die anderen Spieler...
                </p>
                <p className="text-white/70 text-sm mt-2">
                  {rankedPlayers.length} / {players.length} Spieler fertig
                </p>
              </div>
            )}

            {rankedPlayers.length === players.length && (
              <div className="mt-8 p-6 bg-white/10 rounded-xl">
                <p className="text-white text-lg mb-4">
                  {myPlayerReady 
                    ? '✅ Du bist bereit!' 
                    : 'Möchtest du nochmal spielen?'}
                </p>
                <p className="text-white/80 text-sm mb-6">
                  {readyForRematchCount} / {players.length} Spieler bereit
                </p>
                
                <button
                  onClick={handleRematch}
                  disabled={loading || myPlayerReady}
                  className={`btn ${myPlayerReady ? 'btn--secondary' : 'btn--primary'} text-lg md:text-xl px-8 py-4`}
                >
                  {loading ? '⏳ Warte...' : myPlayerReady ? '✅ Bereit!' : '🔄 Nochmal spielen'}
                </button>

                {allPlayersReady && !loading && (
                  <p className="text-yellow-300 font-bold text-xl mt-4 animate-pulse">
                    🎉 Alle bereit! Spiel startet...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {room.status === 'waiting' && (
        <div className="card">
          <div className="card__body text-center">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Warte auf Spieler (min. 2)</h2>
            <p className="text-sm md:text-base text-color-text-secondary mb-6">
              Code: <span className="font-mono font-bold text-color-primary text-lg md:text-xl">{roomCode}</span>
            </p>
            {canStart && (
              <button
                onClick={handleStartGame}
                disabled={loading}
                className="btn btn--primary text-base md:text-lg px-6 md:px-8 py-2 md:py-3"
              >
                {loading ? 'Starte...' : '🎴 Spiel starten'}
              </button>
            )}
          </div>
        </div>
      )}

      {!shouldShowEndScreen && room.status === 'playing' && gameState && myPlayer && (
        <>
          <div className="card">
            <div className="card__body text-center">
              {gameState.last_claim_rank ? (
                <>
                  <p className="text-xs md:text-sm text-color-text-secondary mb-3">Aktuelle Ansage:</p>
                  
                  <div className="flex justify-center items-center mb-4">
                    <div className="relative">
                      <div 
                        style={{ width: '140px', height: '210px' }}
                        className="md:w-[180px] md:h-[270px] rounded-2xl border-4 border-color-primary bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center shadow-2xl"
                      >
                        <span className={`text-7xl md:text-8xl mb-2 ${['♥', '♦'].includes(getClaimSuit(gameState.last_claim_rank)) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                          {getClaimSuit(gameState.last_claim_rank)}
                        </span>
                        <span className={`text-5xl md:text-6xl font-bold ${['♥', '♦'].includes(getClaimSuit(gameState.last_claim_rank)) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                          {gameState.last_claim_rank}
                        </span>
                      </div>
                      
                      <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-xl animate-pulse">
                        <span className="text-2xl md:text-3xl font-bold text-white">
                          {gameState.last_claim_count}×
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs md:text-sm text-color-text-secondary mt-2">
                    📚 Stapel: {gameState.pile_cards?.length || 0} Karten
                  </p>
                </>
              ) : (
                <p className="text-base md:text-xl text-color-text-secondary">
                  Erste Ansage wählen...
                </p>
              )}
            </div>
          </div>

          {revealedCards && (
            <div className="card bg-color-bg-1 border-2 border-color-primary">
              <div className="card__body text-center">
                <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">{revealMessage}</h3>
                <p className="text-xs md:text-sm text-color-text-secondary mb-3 md:mb-4">Aufgedeckte Karten:</p>
                <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
                  {revealedCards.map((card, idx) => {
                    const suitColor = ['♥', '♦'].includes(card.suit) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
                    return (
                      <div key={idx} style={{ width: '80px', height: '120px' }} className="md:w-24 md:h-36 rounded-xl border-2 border-color-border bg-color-surface flex flex-col items-center justify-center shadow-xl">
                        <span className={`text-4xl md:text-5xl mb-1 md:mb-2 ${suitColor}`}>{card.suit}</span>
                        <span className={`text-2xl md:text-3xl font-bold ${suitColor}`}>{card.rank}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {myPlayer.cards && myPlayer.cards.length > 0 && (
            <PlayerHand
              cards={myPlayer.cards}
              selectedCards={selectedCards}
              onSelectCard={handleSelectCard}
              disabled={!isMyTurn || loading}
            />
          )}

          {isMyTurn && (
            <div className="card bg-color-bg-1 border-2 border-color-primary">
              <div className="card__body space-y-4 md:space-y-5">
                <div className="text-center">
                  <span className="inline-block px-4 md:px-5 py-2 md:py-3 bg-color-primary text-color-btn-primary-text rounded-full font-bold text-base md:text-lg">
                    ⭐ Du bist am Zug!
                  </span>
                </div>

                {/* Buttons nebeneinander mit Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {canCallLiar && (
                    <button
                      onClick={handleCallLiar}
                      disabled={loading}
                      className="btn text-xl md:text-2xl py-5 md:py-6 font-bold"
                      style={{ backgroundColor: '#ef4444', color: 'white' }}
                    >
                      {loading ? 'Prüfe...' : '🚨 LÜGNER!'}
                    </button>
                  )}
                  
                  {myPlayer.cards && myPlayer.cards.length > 0 && (
                    <button
                      onClick={handlePlayCards}
                      disabled={selectedCards.length === 0 || loading}
                      className="btn btn--primary text-xl md:text-2xl py-5 md:py-6 font-bold"
                    >
                      {loading ? 'Lege...' : `🃏 ${selectedCards.length || '?'} Karte(n)`}
                    </button>
                  )}
                </div>
                
                {!gameState.last_claim_rank && myPlayer.cards && myPlayer.cards.length > 0 && (
                  <div className="form-group mt-4">
                    <label className="form-label text-lg md:text-xl mb-3">Wähle deine Ansage:</label>
                    <select
                      value={claimRank}
                      onChange={(e) => setClaimRank(e.target.value as Rank)}
                      className="form-control text-xl md:text-2xl py-3 md:py-4"
                    >
                      {RANKS.map(rank => (
                        <option key={rank} value={rank}>{rank}</option>
                      ))}
                    </select>
                  </div>
                )}
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
