import { supabase } from './supabase'
import { Card, Player, GameState, Rank } from '@/types/game'
import { dealCards, findClubSeven, hasQuads, sortCards } from './cards'

export async function createRoom(hostName: string, roomCode: string) {
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .insert({
      room_code: roomCode,
      status: 'waiting',
      max_players: 8
    })
    .select()
    .single()

  if (roomError) throw roomError

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      player_name: hostName,
      player_order: 0,
      is_host: true,
      cards: []
    })
    .select()
    .single()

  if (playerError) throw playerError

  await supabase
    .from('game_rooms')
    .update({ host_id: player.id })
    .eq('id', room.id)

  return { room, player }
}

export async function joinRoom(roomCode: string, playerName: string) {
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single()

  if (roomError) throw new Error('Raum nicht gefunden')
  if (room.status !== 'waiting') throw new Error('Spiel läuft bereits')

  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id)

  if (count && count >= room.max_players) throw new Error('Raum voll')

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      player_name: playerName,
      player_order: count || 0,
      is_host: false,
      cards: []
    })
    .select()
    .single()

  if (playerError) throw playerError

  return { room, player }
}

export async function startGame(roomId: string) {
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('player_order')

  if (error || !players || players.length < 2) {
    throw new Error('Mindestens 2 Spieler benötigt')
  }

  const hands = dealCards(players.length)
  const startPlayerIndex = findClubSeven(hands)

  for (let i = 0; i < players.length; i++) {
    await supabase
      .from('players')
      .update({ 
        cards: sortCards(hands[i]),
        player_order: i,
        is_active: true,
        placement: null,
        is_winner: null,
        ready_for_rematch: false
      })
      .eq('id', players[i].id)
  }

  await supabase
    .from('game_state')
    .delete()
    .eq('room_id', roomId)

  await supabase
    .from('game_state')
    .insert({
      room_id: roomId,
      current_player_id: players[startPlayerIndex].id,
      pile_cards: [],
      last_claim: null,
      last_claim_rank: null,
      last_claim_count: null,
      removed_quads: []
    })

  await supabase
    .from('game_rooms')
    .update({ status: 'playing' })
    .eq('id', roomId)

  return { startPlayerId: players[startPlayerIndex].id }
}

// KRITISCHER FIX: Nur Spieler mit 0 Karten bekommen Platzierung!
async function assignPlacements(roomId: string) {
  const { data: allPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('player_order')

  if (!allPlayers) return

  // NUR Spieler die 0 Karten haben und noch keine Platzierung
  const playersWithNoCardsNeedingPlacement = allPlayers.filter(p => 
    (p.cards?.length || 0) === 0 && p.placement === null
  )

  // Vergebe Platzierungen für Spieler mit 0 Karten
  for (const player of playersWithNoCardsNeedingPlacement) {
    const placedPlayers = allPlayers.filter(p => p.placement !== null)
    const nextPlacement = placedPlayers.length + 1

    await supabase
      .from('players')
      .update({ 
        placement: nextPlacement,
        is_active: false 
      })
      .eq('id', player.id)
  }

  // WICHTIG: Reload players nach updates
  const { data: updatedPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)

  if (!updatedPlayers) return

  // Alle Spieler die eine Platzierung haben
  const playersWithPlacement = updatedPlayers.filter(p => p.placement !== null)

  // KRITISCH: Spiel ist NUR vorbei wenn:
  // - Alle Spieler eine Platzierung haben (jeder wurde platziert)
  // - ODER nur noch 1 Spieler übrig ist UND der hat 0 Karten
  
  // Check: Sind alle Spieler platziert?
  if (playersWithPlacement.length === updatedPlayers.length) {
    await supabase
      .from('game_rooms')
      .update({ status: 'finished' })
      .eq('id', roomId)
  }
  // Check: Ist nur noch 1 Spieler ohne Platzierung UND hat der 0 Karten?
  else {
    const playersWithoutPlacement = updatedPlayers.filter(p => p.placement === null)
    
    if (playersWithoutPlacement.length === 1 && 
        (playersWithoutPlacement[0].cards?.length || 0) === 0) {
      // Gib dem letzten Spieler die letzte Platzierung
      const lastPlace = updatedPlayers.length
      
      await supabase
        .from('players')
        .update({ 
          placement: lastPlace,
          is_active: false 
        })
        .eq('id', playersWithoutPlacement[0].id)
      
      // JETZT room auf finished
      await supabase
        .from('game_rooms')
        .update({ status: 'finished' })
        .eq('id', roomId)
    }
  }
}

export async function playCards(
  roomId: string,
  playerId: string,
  cards: Card[],
  claimRank?: Rank,
  claimCount?: number
) {
  const { data: gameState } = await supabase
    .from('game_state')
    .select('*')
    .eq('room_id', roomId)
    .single()

  if (!gameState) throw new Error('Spiel nicht gefunden')

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()

  if (!player) throw new Error('Spieler nicht gefunden')

  let remainingCards = player.cards.filter(
    (card: Card) => !cards.some(c => c.id === card.id)
  )

  const removedQuads = [...(gameState.removed_quads || [])]
  let quads = hasQuads(remainingCards)
  
  while (quads !== null) {
    remainingCards = remainingCards.filter((card: Card) => card.rank !== quads!.rank)
    if (!removedQuads.includes(quads.rank)) {
      removedQuads.push(quads.rank)
    }
    quads = hasQuads(remainingCards)
  }

  await supabase
    .from('players')
    .update({ cards: sortCards(remainingCards) })
    .eq('id', playerId)

  const newPile = [...gameState.pile_cards, ...cards]

  const { data: allPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .eq('is_active', true)
    .order('player_order')

  const currentIndex = allPlayers?.findIndex(p => p.id === playerId) || 0
  const nextPlayer = allPlayers?.[((currentIndex + 1) % (allPlayers?.length || 1))]

  await supabase
    .from('game_state')
    .update({
      pile_cards: newPile,
      current_player_id: nextPlayer?.id,
      last_claim: claimRank ? `${claimCount}x ${claimRank}` : gameState.last_claim,
      last_claim_rank: claimRank || gameState.last_claim_rank,
      last_claim_count: claimCount || gameState.last_claim_count,
      removed_quads: removedQuads
    })
    .eq('room_id', roomId)

  await supabase
    .from('game_actions')
    .insert({
      room_id: roomId,
      player_id: playerId,
      action_type: 'play_card',
      action_data: {
        cards_count: cards.length,
        claim: claimRank ? `${claimCount}x ${claimRank}` : null
      }
    })

  // Vergebe Platzierungen nach diesem Zug
  await assignPlacements(roomId)
}

export async function callLiar(roomId: string, callerId: string) {
  const { data: gameState } = await supabase
    .from('game_state')
    .select('*')
    .eq('room_id', roomId)
    .single()

  if (!gameState) throw new Error('Spiel nicht gefunden')

  const { data: lastAction } = await supabase
    .from('game_actions')
    .select('*')
    .eq('room_id', roomId)
    .eq('action_type', 'play_card')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastAction) throw new Error('Keine letzte Aktion gefunden')

  const lastPlayerId = lastAction.player_id
  const claimedRank = gameState.last_claim_rank
  const claimedCount = gameState.last_claim_count

  const pileCards: Card[] = gameState.pile_cards
  const lastCards = pileCards.slice(-claimedCount!)

  const actualCount = lastCards.filter(card => card.rank === claimedRank).length
  const wasLying = actualCount !== claimedCount

  let loser: string
  let winner: string

  if (wasLying) {
    loser = lastPlayerId!
    winner = callerId
  } else {
    loser = callerId
    winner = lastPlayerId!
  }

  const { data: loserPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('id', loser)
    .single()

  let newCards = [...loserPlayer!.cards, ...pileCards]
  
  const removedQuads = [...(gameState.removed_quads || [])]
  let quads = hasQuads(newCards)
  
  while (quads !== null) {
    newCards = newCards.filter((card: Card) => card.rank !== quads!.rank)
    if (!removedQuads.includes(quads.rank)) {
      removedQuads.push(quads.rank)
    }
    quads = hasQuads(newCards)
  }

  await supabase
    .from('players')
    .update({
      cards: sortCards(newCards),
      is_active: true
    })
    .eq('id', loser)

  await supabase
    .from('game_state')
    .update({
      pile_cards: [],
      current_player_id: winner,
      last_claim: null,
      last_claim_rank: null,
      last_claim_count: null,
      removed_quads: removedQuads
    })
    .eq('room_id', roomId)

  await supabase
    .from('game_actions')
    .insert({
      room_id: roomId,
      player_id: callerId,
      action_type: 'call_liar',
      action_data: {
        was_lying: wasLying,
        revealed_cards: lastCards,
        loser,
        winner
      }
    })

  // Vergebe Platzierungen NACH dem Lügner-Call
  await assignPlacements(roomId)

  return { wasLying, revealedCards: lastCards, loser, winner }
}

export async function requestRematch(roomId: string, playerId: string) {
  await supabase
    .from('players')
    .update({ ready_for_rematch: true })
    .eq('id', playerId)

  const { data: allPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)

  if (!allPlayers) return { allReady: false, readyCount: 0, totalCount: 0 }

  const readyPlayers = allPlayers.filter(p => p.ready_for_rematch === true)
  const allReady = readyPlayers.length === allPlayers.length

  if (allReady) {
    await startGame(roomId)
  }

  return {
    allReady,
    readyCount: readyPlayers.length,
    totalCount: allPlayers.length
  }
}
