'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignIn(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.toLowerCase().includes('invalid')) {
        setError('Incorrect email or password. Please try again.')
      } else {
        setError('Could not sign in. Check your connection and try again.')
      }
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#faf8f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{
        background: 'white',
        padding: '48px',
        borderRadius: '8px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        width: '100%',
        maxWidth: '420px',
      }}>
        <h1 style={{ color: '#5c3d1e', marginBottom: '8px', fontSize: '28px' }}>Hesed</h1>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
          God's steadfast, covenant love
        </p>

        <form onSubmit={handleSignIn}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#5c3d1e', marginBottom: '6px', fontSize: '14px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e0d5c8',
                borderRadius: '5px',
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                background: '#faf8f5',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#5c3d1e', marginBottom: '6px', fontSize: '14px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e0d5c8',
                borderRadius: '5px',
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                background: '#faf8f5',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#c0392b', fontSize: '14px', marginBottom: '16px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#c9a96e' : '#5c3d1e',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontFamily: 'Georgia, serif',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  )
}
