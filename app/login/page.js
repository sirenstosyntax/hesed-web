'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
      } else if (error.message.toLowerCase().includes('confirm')) {
        setError('Please confirm your email address before signing in.')
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
      fontFamily: 'Georgia, serif',
    }}>

      {/* Left panel — explanation */}
      <div style={{
        flex: 1,
        background: '#5c3d1e',
        padding: '60px 48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        color: 'white',
      }}
        className="hesed-left-panel"
      >
        <h1 style={{ fontSize: '36px', marginBottom: '12px', color: 'white' }}>Hesed</h1>
        <p style={{ fontSize: '16px', opacity: 0.7, marginBottom: '32px', letterSpacing: '0.5px' }}>
          /ˈkhe·sed/  •  Hebrew
        </p>
        <p style={{ fontSize: '18px', lineHeight: '1.8', marginBottom: '24px', opacity: 0.95 }}>
          The steadfast, covenant love of God — relentless, pursuing, and transforming.
          Not earned. Not revoked. Always present.
        </p>
        <p style={{ fontSize: '15px', lineHeight: '1.8', opacity: 0.75 }}>
          Hesed is a Bible study companion built to help you encounter that love,
          not just learn about it. Studies deepen over time as Hesed learns what
          you are walking through — meeting you where you are, wherever that is.
        </p>
        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '8px',
          borderLeft: '3px solid #c9a96e',
        }}>
          <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.85, lineHeight: '1.7', fontSize: '14px' }}>
            "I have loved you with an everlasting love; I have drawn you with unfailing kindness."
          </p>
          <p style={{ margin: '8px 0 0 0', opacity: 0.55, fontSize: '13px' }}>
            Jeremiah 31:3
          </p>
        </div>
      </div>

      {/* Right panel — sign in form */}
      <div style={{
        width: '420px',
        padding: '60px 48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: 'white',
      }}
        className="hesed-right-panel"
      >
        <h2 style={{ color: '#5c3d1e', marginBottom: '28px', fontSize: '22px' }}>
          Sign in
        </h2>

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
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#888', fontSize: '14px' }}>
          New to Hesed?{' '}
          <Link href="/signup" style={{ color: '#c9a96e' }}>Create an account</Link>
        </p>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .hesed-left-panel { display: none; }
          .hesed-right-panel { width: 100% !important; padding: 40px 24px !important; }
        }
      `}</style>
    </main>
  )
}
