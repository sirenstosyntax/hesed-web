import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, passage, created_at, study_content')
    .eq('user_id', user.id)
    .not('study_content', 'is', null)
    .order('created_at', { ascending: false })

  // Group by month
  const grouped = {}
  for (const session of sessions || []) {
    const date = new Date(session.created_at)
    const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(session)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: 'Georgia, serif',
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
        <h1 style={{ color: '#5c3d1e', margin: 0, fontSize: '20px' }}>Study History</h1>
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 20px' }}>

        {Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📚</div>
            <p style={{ fontSize: '16px', color: '#5c3d1e' }}>No studies yet</p>
            <p style={{ fontSize: '14px' }}>
              <Link href="/study/new" style={{ color: '#c9a96e' }}>Start your first study →</Link>
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([month, monthSessions]) => (
            <div key={month} style={{ marginBottom: '36px' }}>
              <h2 style={{
                color: '#5c3d1e',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid #e0d5c8',
              }}>
                {month}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {monthSessions.map(session => (
                  <Link
                    key={session.id}
                    href={`/study/${session.id}`}
                    style={{
                      background: 'white',
                      border: '1px solid #e0d5c8',
                      borderRadius: '8px',
                      padding: '16px 18px',
                      textDecoration: 'none',
                      display: 'block',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ color: '#5c3d1e', fontSize: '15px', marginBottom: '4px' }}>
                      {session.passage}
                    </div>
                    <div style={{ color: '#bbb', fontSize: '12px' }}>
                      {new Date(session.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                      })}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
