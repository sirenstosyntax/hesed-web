'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        background: 'none',
        border: '1px solid #e0d5c8',
        borderRadius: '5px',
        padding: '6px 14px',
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#888',
        cursor: 'pointer',
      }}
    >
      Sign Out
    </button>
  )
}
