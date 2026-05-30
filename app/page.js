import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SignOutButton from './components/SignOutButton'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch active tracks
  const { data: tracks } = await supabase
    .from('tracks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const activeTracks = (tracks || []).filter(
    t => t.current_index < t.passages.length
  )
  const activeTrack = activeTracks[0] || null
  const nextPassage = activeTrack
    ? activeTrack.passages[activeTrack.current_index]
    : null

  // Fetch recent studies
  const { data: recentStudies } = await supabase
    .from('sessions')
    .select('id, passage, created_at, study_content')
    .eq('user_id', user.id)
    .not('study_content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(6)

  return (
    <main style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: 'Georgia, serif',
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e0d5c8',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ color: '#5c3d1e', margin: 0, fontSize: '22px' }}>Hesed</h1>
        <SignOutButton />
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Active Track */}
        {activeTrack && nextPassage && (
          <div style={{
            background: '#5c3d1e',
            borderRadius: '8px',
            padding: '28px',
            marginBottom: '32px',
            color: 'white',
          }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Continue in {activeTrack.book}
            </p>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '22px' }}>
              {nextPassage.reference}
            </h2>
            <p style={{ margin: '0 0 20px 0', opacity: 0.85, fontSize: '15px' }}>
              {nextPassage.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Link
                href={`/study/new?passage=${encodeURIComponent(nextPassage.reference)}&track=${activeTrack.id}&index=${activeTrack.current_index}`}
                style={{
                  background: '#c9a96e',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '5px',
                  textDecoration: 'none',
                  fontSize: '15px',
                }}
              >
                Continue →
              </Link>
              <span style={{ opacity: 0.6, fontSize: '13px' }}>
                {activeTrack.passages.length - activeTrack.current_index} passages remaining
              </span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '40px',
        }}>
          <Link href="/study/new" style={{
            background: 'white',
            border: '1px solid #e0d5c8',
            borderRadius: '8px',
            padding: '20px',
            textDecoration: 'none',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📖</div>
            <div style={{ color: '#5c3d1e', fontSize: '14px', fontWeight: 'bold' }}>New Study</div>
            <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>Study any passage</div>
          </Link>

          <Link href="/tracks/new" style={{
            background: 'white',
            border: '1px solid #e0d5c8',
            borderRadius: '8px',
            padding: '20px',
            textDecoration: 'none',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</div>
            <div style={{ color: '#5c3d1e', fontSize: '14px', fontWeight: 'bold' }}>New Track</div>
            <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>Work through a book</div>
          </Link>

          <Link href="/history" style={{
            background: 'white',
            border: '1px solid #e0d5c8',
            borderRadius: '8px',
            padding: '20px',
            textDecoration: 'none',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📚</div>
            <div style={{ color: '#5c3d1e', fontSize: '14px', fontWeight: 'bold' }}>History</div>
            <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>Past studies</div>
          </Link>
        </div>

        {/* Recent Studies */}
        {recentStudies && recentStudies.length > 0 && (
          <div>
            <h2 style={{ color: '#5c3d1e', fontSize: '16px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Recent Studies
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {recentStudies.map(session => (
                <Link
                  key={session.id}
                  href={`/study/${session.id}`}
                  style={{
                    background: 'white',
                    border: '1px solid #e0d5c8',
                    borderRadius: '8px',
                    padding: '18px',
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  <div style={{ color: '#5c3d1e', fontSize: '15px', marginBottom: '6px' }}>
                    {session.passage}
                  </div>
                  <div style={{ color: '#999', fontSize: '12px' }}>
                    {new Date(session.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!recentStudies || recentStudies.length === 0) && !activeTrack && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📖</div>
            <p style={{ fontSize: '16px', marginBottom: '8px', color: '#5c3d1e' }}>Welcome to Hesed</p>
            <p style={{ fontSize: '14px' }}>Start a study or begin working through a book of the Bible.</p>
          </div>
        )}

      </div>
    </main>
  )
}
