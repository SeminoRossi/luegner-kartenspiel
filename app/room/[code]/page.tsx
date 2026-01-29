import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import GameBoard from '@/components/GameBoard'

export default async function RoomPage({ 
  params 
}: { 
  params: Promise<{ code: string }> 
}) {
  const { code } = await params
  const roomCode = code.toUpperCase()

  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single()

  if (roomError || !room) {
    notFound()
  }

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('player_order')

  if (playersError || !players) {
    notFound()
  }

  return <GameBoard roomCode={roomCode} initialPlayers={players} initialRoom={room} />
}
