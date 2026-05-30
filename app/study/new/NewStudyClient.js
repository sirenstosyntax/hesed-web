'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LOADING_MESSAGES = [
  'Gathering the text across translations...',
  'Researching historical and cultural context...',
  'Exploring what scholars often miss...',
  'Studying the Greek and Hebrew...',
  'Weaving it all together...',
]

export default function NewStudyClient() {
  const [passage, setPassage] = useState('')
  const [status, setStatus] = useState('idle')
  const [loadingMessage, setLoadingMessage] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const p = searchParams.get('passage')
    if (p) setPassage(p)
  }, [searchParams])

  useEffect(() => {
    if (status !== 'generating' && status !== 'polling') return
    const interval = setInterval(() => {
      setLoadingMessage(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [status])

  useEffect(() => {
    if (status !== 'polling' || !sessionId) return

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('sessions')
        .select('study_content')
        .eq('id', sessionId)
        .single()

      if (data?.study_content) {
        clearInterval(interval)

        const trackId = searchParams.get('track')
        const trackIndex = searchParams.get('index')
        if (trackId && trackIndex !== null) {
          await supabase
            .from('tracks')
            .update({ current_index: parseInt(trackIndex) + 1 })
            .eq('id', trackId)
        }

        router.push(`/study/${sessionId}`)
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [status, sessionId])

  async function handleGenerate(e) {
    e.preventDefault()
    if (!passage.trim()) return

    setStatus('generating')
    setErrorMessage('')

    try {
      const response = await fetch('/api/generate-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passage: passage.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setSessionId(data.sessionId)
      setStatus('polling')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err.message || 'Something went wrong. Please try again.')
    }
  }

  const isLoading = status === 'generating' || status === 'polling'

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
        <a href="/" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>
          ← Dashboard
        </a>
        <h1 style={{ color: '#5c3d1e', margin: 0, fontSize: '20px' }}>New Study</h1>
      </header>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        {!isLoading ? (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '40px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            width: '100%',
            maxWidth: '480px',
          }}>
            <h2 style={{ color: '#5c3d1e', marginTop: 0, marginBottom: '8px' }}>
              What would you like to study?
            </h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '28px' }}>
              Enter a passage reference — a verse, a chapter, or a range.
            </p>

            <form onSubmit={handleGenerate}>
              <input
                type="text"
                value={passage}
                onChange={e => setPassage(e.target.value)}
                placeholder="e.g. John 4:1-26, Romans 8, Psalm 23"
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

              {status === 'error' && (
                <p style={{ color: '#c0392b', fontSize: '14px', marginBottom: '16px' }}>
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={!passage.trim()}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: passage.trim() ? '#5c3d1e' : '#c9a96e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontFamily: 'Georgia, serif',
                  fontSize: '16px',
                  cursor: passage.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Generate Study
              </button>
            </form>

            <div style={{ marginTop: '24px', padding: '16px', background: '#faf8f5', borderRadius: '5px' }}>
              <p style={{ color: '#888', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                Hesed will research the passage across multiple translations, explore the historical
                context, and prepare word studies and journal prompts. This takes about 60-90 seconds.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>📖</div>
            <h2 style={{ color: '#5c3d1e', marginBottom: '12px' }}>
              Studying {passage}
            </h2>
            <p style={{ color: '#888', fontSize: '15px', lineHeight: '1.7', minHeight: '48px' }}>
              {LOADING_MESSAGES[loadingMessage]}
            </p>
            <div style={{
              marginTop: '32px',
              height: '3px',
              background: '#e0d5c8',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                background: '#c9a96e',
                borderRadius: '2px',
                animation: 'pulse 2s ease-in-out infinite',
                width: '60%',
              }} />
            </div>
            <style>{`
              @keyframes pulse {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(260%); }
              }
            `}</style>
          </div>
        )}
      </div>
    </main>
  )
}
