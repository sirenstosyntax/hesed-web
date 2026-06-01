'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TABS = [
  { id: 'passage', label: '📜 Passage' },
  { id: 'context', label: '🏛️ Context' },
  { id: 'deeper', label: '🔍 Deeper Look' },
  { id: 'application', label: '🌱 Application' },
  { id: 'journal', label: '✍️ Journal' },
]

export default function StudyViewer({ session, userId }) {
  const [activeTab, setActiveTab] = useState('passage')
  const [journalEntry, setJournalEntry] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [loadingResponse, setLoadingResponse] = useState(false)

  const content = session.study_content
  const supabase = createClient()

  async function handleSaveJournal() {
    if (!journalEntry.trim()) return
    setSaving(true)
    setSaveError('')

    try {
      // Save journal entry
      const { error } = await supabase.from('journal_entries').insert({
        user_id: userId,
        session_id: session.id,
        prompt: content.journal?.prompt || '',
        response: journalEntry,
      })

      if (error) throw error

      setSaved(true)
      setSaving(false)

      // Get AI response
      setLoadingResponse(true)
      try {
        const res = await fetch('/api/journal-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            journalEntry,
            passage: session.passage,
            journalPrompt: content.journal?.prompt || '',
          }),
        })
        const data = await res.json()
        if (data.reflection) {
          setAiResponse(data.reflection)
        }
      } catch {
        // AI response failing shouldn't affect the save confirmation
      }
      setLoadingResponse(false)

    } catch (err) {
      setSaveError('Could not save your entry. Please try again.')
      setSaving(false)
    }
  }

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
        gap: '16px',
      }}>
        <Link href="/" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>
          ← Dashboard
        </Link>
        <h1 style={{ color: '#5c3d1e', margin: 0, fontSize: '20px', flex: 1 }}>
          {session.passage}
        </h1>
        <span style={{ color: '#999', fontSize: '13px' }}>
          {new Date(session.created_at).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
          })}
        </span>
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 20px' }}>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '0' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                background: activeTab === tab.id ? '#5c3d1e' : '#e8ddd0',
                color: activeTab === tab.id ? 'white' : '#5c3d1e',
                border: 'none',
                borderRadius: '5px 5px 0 0',
                cursor: 'pointer',
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{
          background: 'white',
          borderRadius: '0 5px 5px 5px',
          padding: '28px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          minHeight: '400px',
        }}>

          {/* Passage Tab */}
          {activeTab === 'passage' && (
            <div>
              <h2 style={{ color: '#5c3d1e', marginTop: 0 }}>The Text</h2>
              {content.passage?.translations?.map(t => (
                <div key={t.name} style={{
                  marginBottom: '24px',
                  padding: '16px',
                  background: '#faf8f5',
                  borderLeft: '4px solid #c9a96e',
                  borderRadius: '0 5px 5px 0',
                }}>
                  <div style={{
                    color: '#5c3d1e',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '10px',
                    fontWeight: 'bold',
                  }}>
                    {t.name}
                  </div>
                  <div style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{t.text}</div>
                </div>
              ))}
            </div>
          )}

          {/* Context Tab */}
          {activeTab === 'context' && (
            <div>
              <h2 style={{ color: '#5c3d1e', marginTop: 0 }}>Historical & Cultural Context</h2>
              {content.context?.summary && (
                <p style={{ color: '#555', lineHeight: '1.8', marginBottom: '24px', fontSize: '16px' }}>
                  {content.context.summary}
                </p>
              )}
              {content.context?.sections?.map((section, i) => (
                <div key={i} style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: '#5c3d1e', marginBottom: '10px' }}>{section.heading}</h3>
                  <p style={{ lineHeight: '1.8', color: '#333' }}>{section.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Deeper Look Tab */}
          {activeTab === 'deeper' && (
            <div>
              <h2 style={{ color: '#5c3d1e', marginTop: 0 }}>Deeper Look</h2>
              {content.deeper?.summary && (
                <p style={{ color: '#555', lineHeight: '1.8', marginBottom: '24px', fontSize: '16px' }}>
                  {content.deeper.summary}
                </p>
              )}
              {content.deeper?.sections?.map((section, i) => (
                <div key={i} style={{
                  marginBottom: '24px',
                  padding: '16px',
                  background: section.isWordStudy ? '#eef5ee' : '#f5f0e8',
                  borderLeft: section.isWordStudy ? '4px solid #5a8a5a' : '4px solid #c9a96e',
                  borderRadius: '0 5px 5px 0',
                }}>
                  <h3 style={{
                    color: section.isWordStudy ? '#3a6a3a' : '#5c3d1e',
                    marginTop: 0,
                    marginBottom: '10px',
                    fontSize: '15px',
                  }}>
                    {section.heading}
                  </h3>
                  <p style={{ lineHeight: '1.8', color: '#333', margin: 0 }}>{section.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Application Tab */}
          {activeTab === 'application' && (
            <div>
              <h2 style={{ color: '#5c3d1e', marginTop: 0 }}>Application</h2>
              {content.application?.hesedConnection && (
                <div style={{
                  background: '#fff8e7',
                  border: '1px solid #c9a96e',
                  borderRadius: '5px',
                  padding: '16px',
                  marginBottom: '24px',
                  fontStyle: 'italic',
                  lineHeight: '1.8',
                  color: '#5c3d1e',
                }}>
                  {content.application.hesedConnection}
                </div>
              )}
              {content.application?.sections?.map((section, i) => (
                <div key={i} style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: '#5c3d1e', marginBottom: '10px' }}>{section.heading}</h3>
                  <p style={{ lineHeight: '1.8', color: '#333' }}>{section.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Journal Tab */}
          {activeTab === 'journal' && (
            <div>
              <h2 style={{ color: '#5c3d1e', marginTop: 0 }}>Journal</h2>
              {content.journal?.prompt && (
                <div style={{
                  background: '#f5f0e8',
                  borderLeft: '4px solid #c9a96e',
                  padding: '16px',
                  borderRadius: '0 5px 5px 0',
                  marginBottom: '24px',
                  lineHeight: '1.8',
                  color: '#333',
                  fontStyle: 'italic',
                }}>
                  {content.journal.prompt}
                </div>
              )}

              {!saved ? (
                <>
                  <textarea
                    value={journalEntry}
                    onChange={e => setJournalEntry(e.target.value)}
                    placeholder="Write your response here..."
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '14px',
                      fontFamily: 'Georgia, serif',
                      fontSize: '15px',
                      lineHeight: '1.8',
                      border: '1px solid #e0d5c8',
                      borderRadius: '5px',
                      background: '#faf8f5',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  {saveError && (
                    <p style={{ color: '#c0392b', fontSize: '14px', marginTop: '8px' }}>{saveError}</p>
                  )}
                  <button
                    onClick={handleSaveJournal}
                    disabled={saving || !journalEntry.trim()}
                    style={{
                      marginTop: '12px',
                      padding: '10px 24px',
                      background: saving || !journalEntry.trim() ? '#c9a96e' : '#5c3d1e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontFamily: 'Georgia, serif',
                      fontSize: '15px',
                      cursor: saving || !journalEntry.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Entry'}
                  </button>
                </>
              ) : (
                <div>
                  {/* Saved entry */}
                  <div style={{
                    background: '#faf8f5',
                    border: '1px solid #e0d5c8',
                    borderRadius: '5px',
                    padding: '16px',
                    marginBottom: '20px',
                    lineHeight: '1.8',
                    color: '#333',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {journalEntry}
                  </div>

                  {/* AI Response */}
                  {loadingResponse && (
                    <div style={{
                      padding: '16px',
                      color: '#888',
                      fontSize: '14px',
                      fontStyle: 'italic',
                    }}>
                      Reflecting on your entry...
                    </div>
                  )}

                  {aiResponse && !loadingResponse && (
                    <div style={{
                      borderTop: '1px solid #e0d5c8',
                      paddingTop: '20px',
                      marginTop: '4px',
                    }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#c9a96e',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '12px',
                      }}>
                        A reflection
                      </div>
                      <div style={{
                        lineHeight: '1.9',
                        color: '#333',
                        fontSize: '15px',
                      }}>
                        {aiResponse}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
