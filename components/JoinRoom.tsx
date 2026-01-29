'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinRoom } from '@/lib/gameLogic'

export default function JoinRoom() {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleJoin() {
    if (!playerName.trim()) {
      setError('Bitte gib deinen Namen ein')
      return
    }

    if (!roomCode.trim()) {
      setError('Bitte gib einen Raum-Code ein')
      return
    }

    setLoading(true)
    setError('')

    try {
      await joinRoom(roomCode.toUpperCase(), playerName)
      
      localStorage.setItem('player_name', playerName)
      localStorage.setItem('room_code', roomCode.toUpperCase())
      
      router.push(`/room/${roomCode.toUpperCase()}`)
    } catch (err: any) {
      setError(err.message || 'Fehler beim Beitreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="card__body">
        <h2 className="text-2xl font-bold mb-6">Raum beitreten</h2>
        
        <div className="form-group">
          <label className="form-label" htmlFor="join-name">
            Dein Name
          </label>
          <input
            id="join-name"
            type="text"
            className="form-control"
            placeholder="z.B. Julian"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="join-code">
            Raum-Code
          </label>
          <input
            id="join-code"
            type="text"
            className="form-control"
            placeholder="z.B. ABC123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={6}
            style={{ textTransform: 'uppercase' }}
          />
        </div>

        {error && (
          <div className="status status--error mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={loading}
          className="btn btn--primary btn--full-width"
        >
          {loading ? 'Trete bei...' : 'Beitreten'}
        </button>
      </div>
    </div>
  )
}
