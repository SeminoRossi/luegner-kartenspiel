'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom } from '@/lib/gameLogic'
import { generateRoomCode } from '@/lib/cards'

export default function CreateRoom() {
  const [playerName, setPlayerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleCreate() {
    if (!playerName.trim()) {
      setError('Bitte gib deinen Namen ein')
      return
    }

    setLoading(true)
    setError('')

    try {
      const roomCode = generateRoomCode()
      const { room } = await createRoom(playerName, roomCode)
      
      localStorage.setItem('player_name', playerName)
      localStorage.setItem('room_code', room.room_code)
      
      router.push(`/room/${room.room_code}`)
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen des Raums')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="card__body">
        <h2 className="text-2xl font-bold mb-6">Neuen Raum erstellen</h2>
        
        <div className="form-group">
          <label className="form-label" htmlFor="create-name">
            Dein Name
          </label>
          <input
            id="create-name"
            type="text"
            className="form-control"
            placeholder="z.B. Julian"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            maxLength={20}
          />
        </div>

        {error && (
          <div className="status status--error mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="btn btn--primary btn--full-width"
        >
          {loading ? 'Erstelle Raum...' : 'Raum erstellen'}
        </button>
      </div>
    </div>
  )
}
