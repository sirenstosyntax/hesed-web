import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: 'Georgia, serif',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#5c3d1e', borderBottom: '2px solid #c9a96e', paddingBottom: '12px' }}>
          Hesed
        </h1>
        <p style={{ color: '#666' }}>Welcome, {user.email}</p>
        <p style={{ color: '#888', marginTop: '32px' }}>Dashboard coming soon.</p>
      </div>
    </main>
  )
}
