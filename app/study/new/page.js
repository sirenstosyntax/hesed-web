import { Suspense } from 'react'
import NewStudyClient from './NewStudyClient'

export default function NewStudyPage() {
  return (
    <Suspense fallback={
      <main style={{
        minHeight: '100vh',
        background: '#faf8f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, serif',
      }}>
        <p style={{ color: '#888' }}>Loading...</p>
      </main>
    }>
      <NewStudyClient />
    </Suspense>
  )
}
