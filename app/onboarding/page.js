'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const JOURNEY_OPTIONS = [
  {
    id: 'believer',
    label: 'I follow Jesus',
    description: 'I have a faith foundation and want to go deeper.',
  },
  {
    id: 'returning',
    label: 'I am finding my way back',
    description: 'I walked away for a while and am open to returning.',
  },
  {
    id: 'church_hurt',
    label: 'I have been hurt by the church',
    description: 'I believe in God but have been wounded by religious community.',
  },
  {
    id: 'seeker',
    label: 'I am exploring',
    description: 'I am curious about faith but not sure what I believe.',
  },
]

export default function OnboardingPage() {
  const [journeyType, setJourneyType] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleContinue() {
    if (!journeyType) return
    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Save journey_type to user_context
      const { error: insertError } = await supabase
        .from('user_context')
        .insert({
          user_id: user.id,
          context_type: 'journey_type',
          content: journeyType,
        })

      if (insertError) throw insertError

      router.push('/')
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: 'Georgia, serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '48px',
        maxWidth: '560px',
        width: '100%',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>📖</div>
          <h1 style={{ color: '#5c3d1e', fontSize: '24px', margin: '0 0 12px 0' }}>
            Welcome to Hesed
          </h1>
          <p style={{ color: '#666', lineHeight: '1.7', margin: 0, fontSize: '15px' }}>
            To help make your studies meaningful, we have one question.
            You can always update this later.
          </p>
        </div>

        <p style={{ color: '#5c3d1e', fontWeight: 'bold', marginBottom: '16px', fontSize: '15px' }}>
          Where are you on your journey right now?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
          {JOURNEY_OPTIONS.map(option => (
            <button
              key={option.id}
              onClick={() => setJourneyType(option.id)}
              style={{
                padding: '16px 20px',
                border: journeyType === option.id ? '2px solid #5c3d1e' : '1px solid #e0d5c8',
                borderRadius: '8px',
                background: journeyType === option.id ? '#faf3e8' : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'Georgia, serif',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                color: '#5c3d1e',
                fontSize: '15px',
                fontWeight: journeyType === option.id ? 'bold' : 'normal',
                marginBottom: '4px',
              }}>
                {option.label}
              </div>
              <div style={{ color: '#888', fontSize: '13px', lineHeight: '1.5' }}>
                {option.description}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p style={{ color: '#c0392b', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
        )}

        <button
          onClick={handleContinue}
          disabled={!journeyType || saving}
          style={{
            width: '100%',
            padding: '14px',
            background: journeyType && !saving ? '#5c3d1e' : '#c9a96e',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            cursor: journeyType && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Saving...' : 'Begin →'}
        </button>
      </div>
    </main>
  )
}
