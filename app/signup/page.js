'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('')
  const supabase = createClient()

  async function handleSignUp(e) {
    e.preventDefault()
    setErrorMessage('')

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.')
      return
    }

    setStatus('loading')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://hesedstudy.com/login',
      },
    })

    if (error) {
      setStatus('error')
      if (error.message.includes('already registered')) {
        setErrorMessage('An account with this email already exists. Try signing in.')
      } else {
        setErrorMessage(error.message || 'Could not create account. Please try again.')
      }
      return
    }

    setStatus('success')
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#faf8f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        padding: '48px',
        borderRadius: '8px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        width: '100%',
        maxWidth: '440px',
      }}>

        {status === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✉️</div>
            <h2 style={{ color: '#5c3d1e', marginBottom: '12px' }}>Check your email</h2>
            <p style={{ color: '#666', lineHeight: '1.7', marginBottom: '24px' }}>
              We sent a confirmation link to <strong>{email}</strong>.
              Click it to activate your account and start studying.
            </p>
            <Link href="/login" style={{ color: '#c9a96e', fontSize: '14px' }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ color: '#5c3d1e', marginBottom: '6px', fontSize: '26px' }}>
              Create an account
            </h1>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              Hesed — God's steadfast, covenant love
            </p>
            <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '28px', lineHeight: '1.6' }}>
              Personalized Bible studies that deepen over time as Hesed learns what you are walking through.
            </p>

            <form onSubmit={handleSignUp}>
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

              <div style={{ marginBottom: '16px' }}>
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

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#5c3d1e', marginBottom: '6px', fontSize: '14px' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
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

              {errorMessage && (
                <p style={{ color: '#c0392b', fontSize: '14px', marginBottom: '16px' }}>
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: status === 'loading' ? '#c9a96e' : '#5c3d1e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontFamily: 'Georgia, serif',
                  fontSize: '16px',
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                }}
              >
                {status === 'loading' ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '20px', color: '#888', fontSize: '14px' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: '#c9a96e' }}>Sign in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
