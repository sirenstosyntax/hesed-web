'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SUGGESTED_BOOKS = [
  'John', 'Romans', 'Psalms', 'Genesis', 'Matthew',
  'Philippians', 'Ephesians', 'Isaiah', 'Luke', 'Acts'
]

export default function NewTrackPage() {
  const [book, setBook] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleCreate(e) {
    e.preventDefault()
    if (!book.trim()) return

    setStatus('creating')
    setError('')

    try {
      const response = await fetch('/api/create-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: book.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not create track')
      }

      // Redirect to generate the first study
      const firstPassage = data.track.passages[0]
      router.push(
        `/study/new?passage=${encodeURIComponent(firstPassage.reference)}&track=${data.track.id}&index=0`
      )
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: 'Georgia, serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e0d5c8',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <Link href="/" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>
          ← Dashboard
        </Link>
        <h1 style={{ color: '#5c3d1e', margin: 0, fontSize: '20px' }}>New Track</h1>
      </header>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          width: '100%',
          maxWidth: '480px',
        }}>
          <h2 style={{ color: '#5c3d1e', marginTop: 0, marginBottom: '8px' }}>
            Work through a book
          </h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '28px' }}>
            Hesed will break the book into natural passages and guide you through it one study at a time.
          </p>

          <form onSubmit={handleCreate}>
            <input
              type="text"
              value={book}
              onChange={e => setBook(e.target.value)}
              placeholder="e.g. John, Romans, Psalms"
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #e0d5c8',
                borderRadius: '5px',
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                background: '#faf8f5',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />

            {/* Suggested books */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {SUGGESTED_BOOKS.map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBook(b)}
                  style={{
                    padding: '5px 12px',
                    background: book === b ? '#5c3d1e' : '#f0ebe3',
                    color: book === b ? 'white' : '#5c3d1e',
                    border: 'none',
                    borderRadius: '20px',
                    fontFamily: 'Georgia, serif',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {b}
                </button>
              ))}
            </div>

            {error && (
              <p style={{ color: '#c0392b', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={!book.trim() || status === 'creating'}
              style={{
                width: '100%',
                padding: '12px',
                background: book.trim() && status !== 'creating' ? '#5c3d1e' : '#c9a96e',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                cursor: book.trim() && status !== 'creating' ? 'pointer' : 'not-allowed',
              }}
            >
              {status === 'creating' ? 'Preparing your track...' : 'Start Track'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
