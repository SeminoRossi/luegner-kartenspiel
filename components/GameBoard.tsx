'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Player, GameState, GameRoom, Card, Rank } from '@/types/game'
import { startGame, playCards, callLiar, requestRematch } from '@/lib/gameLogic'
import PlayerList from './PlayerList'
import PlayerHand from './PlayerHand'
import EmojiPanel from './EmojiPanel'
import EmojiDisplay from './EmojiDisplay'

interface GameBoardProps {
  roomCode: string
  initialPlayers: Player[]
  initialRoom: GameRoom
}

interface EmojiReaction {
  id: string
  player_name: string
  emoji: string
  created_at: string
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
  const [emojiReactions, setEmojiReactions] = useState<EmojiReaction[]>([])

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

  async function loadEmojiReactions() {
    const { data } = await supabase
      .from('emoji_reactions')
      .select('*')
      .eq('room_id', initialRoom.id)
      .order('created_at', { ascending: false })
      .limit(3)
    
    if (data) setEmojiReactions(data)
  }

  async function sendEmoji(emoji: string) {
    if (!myPlayer) return

    await supabase
      .from('emoji_reactions')
      .insert({
        room_id: initialRoom.id,
        player_name: myPlayer.player_name,
        emoji: emoji
      })
  }

  useEffect(() => {
    const storedName = localStorage.getItem('player_name')
    if (storedName) {
      const player = players.find(p => p.player_name === storedName)
      if (player) setMyPlayerId(player.id)
    }

    reloadAllData()
    loadEmojiReactions()

    const playersChannel = supabase
      .channel(`players-${initialRoom.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${initialRoom.id}` },
        reloadAllData
      )
      .subscribe()

    const roomChannel = supabase
      .channel(`room-${initialRoom.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${initialRoom.id}` },
        reloadAllData
      )
      .subscribe()

    const stateChannel = supabase
      .channel(`state-${initialRoom.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `room_id=eq.${initialRoom.id}` },
        reloadAllData
      )
      .subscribe()

    const emojiChannel = supabase
      .channel(`emoji-${initialRoom.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emoji_reactions', filter: `room_id=eq.${initialRoom.id}` },
        loadEmojiReactions
      )
      .subscribe()

    return () => {
      playersChannel.unsubscribe()
      roomChannel.unsubscribe()
      stateChannel.unsubscribe()
      emojiChannel.unsubscribe()
    }
  }, [initialRoom.id, players])

  const canStart = myPlayer?.is_host && players.length >= 2
  const canCallLiar = gameState?.last_claim_rank !== null
  const shouldShowEndScreen = room.status === 'finished'
  const myPlayerReady = myPlayer?.ready_for_rematch === true

  const availableRanks = RANKS

  function getClaimSuit(rank: Rank): string {
    const redRanks: Rank[] = ['7', '8', '10', 'K']
    return redRanks.includes(rank) ? '♥' : '♠'
  }

  async function handleStartGame() {
    if (!canStart || loading) return
    setLoading(true)
    setIsShuffling(true)

    try {
      await startGame(initialRoom.id)
      await new Promise(resolve => setTimeout(resolve, 1500))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
      setIsShuffling(false)
    }
  }

  function handleSelectCard(card: Card) {
    setSelectedCards(prev => {
      const isSelected = prev.some(c => c.id === card.id)
      if (isSelected) {
        return prev.filter(c => c.id !== card.id)
      } else if (prev.length < 3) {
        return [...prev, card]
      }
      return prev
    })
  }

  async function handlePlayCards() {
    if (selectedCards.length === 0 || !isMyTurn || loading || !myPlayer) return
    setLoading(true)

    try {
      await playCards(initialRoom.id, myPlayer.id, selectedCards, claimRank)
      setSelectedCards([])
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCallLiar() {
    if (!canCallLiar || loading || !myPlayer) return
    setLoading(true)

    try {
      const result = await callLiar(initialRoom.id, myPlayer.id)
      setRevealedCards(result.revealedCards)
      
      // Build message from result
      const message = result.wasLying 
        ? `🚨 ${result.loser} hat gelogen! Nimmt den Stapel.`
        : `✅ ${result.loser} hatte recht! ${result.winner} nimmt den Stapel.`
      setRevealMessage(message)
      
      setTimeout(() => {
        setRevealedCards(null)
        setRevealMessage('')
      }, 4000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRematch() {
    if (!myPlayer || loading) return
    setLoading(true)

    try {
      await requestRematch(initialRoom.id, myPlayer.id)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-color-background via-color-surface to-color-background py-8">
      <div className="container mx-auto px-4 max-w-6xl space-y-6">
        
        {/* Header mit Emoji Panel */}
        <div className="card bg-gradient-to-r from-color-primary to-color-primary-hover">
          <div className="card__body">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">🎴 Lügner</h1>
                <p className="text-white/90 text-sm md:text-base">
                  Raum: <span className="font-mono font-bold text-xl">{roomCode}</span>
                </p>
              </div>
              <EmojiPanel onSendEmoji={sendEmoji} disabled={!myPlayer} />
            </div>
          </div>
        </div>

        <EmojiDisplay reactions={emojiReactions} />

        {isShuffling && (
          <div className="card bg-gradient-to-br from-color-bg-1 to-color-bg-2 border-2 border-color-primary">
            <div className="card__body text-center py-12">
              <div className="text-8xl mb-6 animate-bounce">🃏</div>
              <p className="text-3xl font-bold text-color-primary mb-4">Karten werden gemischt...</p>
              <div className="flex justify-center gap-3 mt-6">
                <div className="w-4 h-4 bg-color-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-4 h-4 bg-color-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-4 h-4 bg-color-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        )}

        {/* End Screen */}
        {shouldShowEndScreen && (
          <div className="space-y-6">
            <div className="card bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 border-4 border-yellow-300">
              <div className="card__body text-center py-12">
                <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-8 drop-shadow-lg">
                  🎉 Spiel Beendet! 🎉
                </h2>
                
                <div className="space-y-4 max-w-2xl mx-auto">
                  {rankedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="bg-white/95 backdrop-blur rounded-2xl p-6 shadow-2xl transform hover:scale-105 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-5xl">{PLACEMENT_MEDALS[player.placement!] || `${player.placement}.`}</span>
                          <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">
                              {player.player_name}
                              {player.id === myPlayerId && ' (Du)'}
                            </p>
                            <p className="text-gray-600">Platz {player.placement}</p>
                          </div>
                        </div>
                        {player.placement === 1 && (
                          <div className="text-4xl animate-bounce">👑</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {rankedPlayers.length < players.length && (
                  <div className="mt-8 p-6 bg-white/20 backdrop-blur rounded-2xl">
                    <p className="text-white text-2xl font-bold">⏳ Warte auf die anderen Spieler...</p>
                    <p className="text-white/80 text-lg mt-2">
                      {rankedPlayers.length} / {players.length} Spieler fertig
                    </p>
                  </div>
                )}

                {rankedPlayers.length === players.length && (
                  <div className="mt-8 card">
                    <div className="card__body">
                      <p className="text-2xl font-bold mb-4">
                        {myPlayerReady ? '✅ Du bist bereit!' : 'Möchtest du nochmal spielen?'}
                      </p>
                      <p className="text-color-text-secondary text-lg mb-6">
                        {readyForRematchCount} / {players.length} Spieler bereit
                      </p>
                      
                      <button
                        onClick={handleRematch}
                        disabled={loading || myPlayerReady}
                        className={`btn ${myPlayerReady ? 'btn--secondary' : 'btn--primary'} btn--lg`}
                      >
                        {loading ? '⏳ Warte...' : myPlayerReady ? '✅ Bereit!' : '🔄 Nochmal spielen'}
                      </button>

                      {allPlayersReady && !loading && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl">
                          <p className="text-white font-bold text-2xl animate-pulse">
                            🎉 Alle bereit! Spiel startet...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Waiting Screen */}
        {room.status === 'waiting' && (
          <div className="card">
            <div className="card__body text-center py-12">
              <div className="text-6xl mb-6">👥</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Warte auf Spieler (min. 2)</h2>
              <p className="text-lg text-color-text-secondary mb-8">
                Code: <span className="font-mono font-bold text-color-primary text-2xl">{roomCode}</span>
              </p>
              {canStart && (
                <button
                  onClick={handleStartGame}
                  disabled={loading}
                  className="btn btn--primary btn--lg"
                >
                  {loading ? 'Starte...' : '🎴 Spiel starten'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Playing Screen */}
        {!shouldShowEndScreen && room.status === 'playing' && gameState && myPlayer && (
          <>
            {/* Current Claim Card */}
            <div className="card bg-gradient-to-br from-color-bg-1 to-color-bg-2">
              <div className="card__body text-center">
                {gameState.last_claim_rank ? (
                  <>
                    <p className="text-sm text-color-text-secondary mb-4">Aktuelle Ansage:</p>
                    
                    <div className="flex justify-center items-center mb-6">
                      <div className="relative">
                        {/* Modern Card Design */}
                        <div 
                          className="w-40 h-60 md:w-48 md:h-72 rounded-3xl border-4 border-color-primary bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 flex flex-col items-center justify-center shadow-2xl transform hover:scale-105 transition-all"
                        >
                          <span className={`text-8xl md:text-9xl mb-4 drop-shadow-lg ${['♥', '♦'].includes(getClaimSuit(gameState.last_claim_rank)) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                            {getClaimSuit(gameState.last_claim_rank)}
                          </span>
                          <span className={`text-6xl md:text-7xl font-extrabold drop-shadow ${['♥', '♦'].includes(getClaimSuit(gameState.last_claim_rank)) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                            {gameState.last_claim_rank}
                          </span>
                        </div>
                        
                        {/* Count Badge */}
                        <div className="absolute -top-4 -right-4 w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-2xl animate-pulse">
                          <span className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-lg">
                            {gameState.last_claim_count}×
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-color-text-secondary">
                      📚 Stapel: <span className="font-bold text-color-primary">{gameState.pile_cards?.length || 0} Karten</span>
                    </p>
                  </>
                ) : (
                  <div className="py-8">
                    <div className="text-6xl mb-4">🎴</div>
                    <p className="text-xl text-color-text-secondary">Erste Ansage wählen...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Revealed Cards */}
            {revealedCards && (
              <div className="card bg-gradient-to-br from-color-bg-4 to-color-bg-1 border-2 border-color-primary">
                <div className="card__body text-center">
                  <h3 className="text-2xl md:text-3xl font-bold mb-6">{revealMessage}</h3>
                  <p className="text-sm text-color-text-secondary mb-4">Aufgedeckte Karten:</p>
                  <div className="flex justify-center gap-3 flex-wrap">
                    {revealedCards.map((card, idx) => {
                      const suitColor = ['♥', '♦'].includes(card.suit) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
                      return (
                        <div 
                          key={idx} 
                          className="w-24 h-36 md:w-28 md:h-42 rounded-2xl border-3 border-color-border bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center shadow-xl animate-bounce-in"
                        >
                          <span className={`text-5xl md:text-6xl mb-2 ${suitColor}`}>{card.suit}</span>
                          <span className={`text-3xl md:text-4xl font-bold ${suitColor}`}>{card.rank}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Player Hand */}
            {myPlayer.cards && myPlayer.cards.length > 0 && (
              <PlayerHand
                cards={myPlayer.cards}
                selectedCards={selectedCards}
                onSelectCard={handleSelectCard}
                disabled={!isMyTurn || loading}
              />
            )}

            {/* Action Buttons - für Spieler der AM ZUG ist */}
            {isMyTurn && (
              <div className="card bg-gradient-to-br from-color-bg-1 to-color-bg-3 border-4 border-color-primary shadow-2xl">
                <div className="card__body space-y-6">
                  <div className="text-center">
                    <span className="inline-block px-8 py-4 bg-gradient-to-r from-color-primary to-color-primary-hover text-white rounded-full font-extrabold text-2xl md:text-3xl shadow-lg animate-pulse">
                      ⭐ Du bist am Zug! ⭐
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-center gap-6">
                    {/* LÜGNER Button */}
                    {canCallLiar && (
                      <button
                        onClick={handleCallLiar}
                        disabled={loading}
                        className="flex-1 max-w-xs rounded-3xl text-white font-extrabold text-2xl md:text-3xl py-12 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-red-500 to-red-600"
                      >
                        <span className="text-5xl">🚨</span>
                        <span>{loading ? 'Prüfe...' : 'LÜGNER!'}</span>
                      </button>
                    )}
                    
                    {/* ABLEGEN Button */}
                    {myPlayer.cards && myPlayer.cards.length > 0 && (
                      <button
                        onClick={handlePlayCards}
                        disabled={selectedCards.length === 0 || loading}
                        className="flex-1 max-w-xs rounded-3xl bg-gradient-to-br from-color-primary to-color-primary-hover text-white font-extrabold text-2xl md:text-3xl py-12 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-3"
                      >
                        <span className="text-5xl">🃏</span>
                        <span>{loading ? 'Lege...' : `${selectedCards.length} ABLEGEN`}</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Rank Selection */}
                  {!gameState.last_claim_rank && myPlayer.cards && myPlayer.cards.length > 0 && availableRanks.length > 0 && (
                    <div className="form-group">
                      <label className="form-label text-xl md:text-2xl mb-4 font-bold text-center block">
                        📢 Wähle deine Ansage:
                      </label>
                      <select
                        value={claimRank}
                        onChange={(e) => setClaimRank(e.target.value as Rank)}
                        className="form-control text-2xl md:text-3xl py-6 font-bold text-center"
                      >
                        {availableRanks.map(rank => (
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

        {/* Player List */}
        <PlayerList
          players={players}
          currentPlayerId={gameState?.current_player_id || null}
          myPlayerId={myPlayerId}
        />
      </div>
    </div>
  )
}
