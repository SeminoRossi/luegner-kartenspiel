import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import GameBoard from '@/components/GameBoard'

interface PageProps {
  params: Promise<{
    code: string
  }>
}

export default async function RoomPage({ params }: PageProps) {
  const resolvedParams = await params
  const roomCode = resolvedParams.code.toUpperCase()

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single()

  if (!room) {
    notFound()
  }

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('player_order')

  if (!players) {
    notFound()
  }

  return <GameBoard roomCode={roomCode} initialPlayers={players} initialRoom={room} />
}
