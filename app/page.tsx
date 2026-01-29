import CreateRoom from '@/components/CreateRoom'
import JoinRoom from '@/components/JoinRoom'

export default function Home() {
  return (
    <main className="min-h-screen bg-color-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">🎴 Lügner</h1>
          <p className="text-xl text-color-text-secondary">
            Das Kartenspiel wo Lügen erlaubt ist!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <CreateRoom />
          <JoinRoom />
        </div>

        <div className="mt-12 card">
          <div className="card__body">
            <h2 className="text-xl font-semibold mb-4">📖 Spielregeln</h2>
            <ul className="space-y-2 text-color-text-secondary">
              <li>• 2-8 Spieler mit 32 Skatkarten</li>
              <li>• Spieler mit Kreuz 7 beginnt</li>
              <li>• Lege 1-3 Karten und sage was du legst</li>
              <li>• Du darfst lügen! 🤥</li>
              <li>• Andere können "Lüge!" rufen</li>
              <li>• Wer erwischt wird, nimmt alle Karten vom Stapel</li>
              <li>• Ziel: Als erster alle Karten loswerden!</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
