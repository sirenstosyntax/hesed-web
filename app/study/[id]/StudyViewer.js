'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const chatBottomRef = useRef(null)

  const content = session.study_content
  const supabase = createClient()

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  async function handleSaveJournal() {
    if (!journalEntry.trim()) return
    setSaving(true)
    setSaveError('')

    try {
      const { error } = await supabase.from('journal_entries').insert({
        user_id: userId,
        session_id: session.id,
        prompt: content.journal?.prompt || '',
        response: journalEntry,
      })

      if (error) throw error

      setSaved(true)
      setSaving(false)

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
        // Silent fail — save confirmation still shows
      }
      setLoadingResponse(false)

    } catch (err) {
      setSaveError('Could not save your entry. Please try again.')
      setSaving(false)
    }
  }

  async function handleSendChat(e) {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: session.id,
          passage: session.passage,
          journalEntry,
          conversationId,
        }),
      })
      const data = await res.json()
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        setConversationId(data.conversationId)
      }
    } catch {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.'
      }])
    }
    setChatLoading(false)
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
          Dashboard
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
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
              {(content.passage?.translations || content.passage)?.map(t => (
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
                  <div style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap', color: '#2c2c2c' }}>{t.text}</div>
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
                      color: '#2c2c2c',
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

                  {/* AI Reflection */}
                  {loadingResponse && (
                    <div style={{ padding: '16px', color: '#888', fontSize: '14px', fontStyle: 'italic' }}>
                      Reflecting on your entry...
                    </div>
                  )}

                  {aiResponse && !loadingResponse && (
                    <div style={{
                      borderTop: '1px solid #e0d5c8',
                      paddingTop: '20px',
                      marginBottom: '24px',
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
                      <div style={{ lineHeight: '1.9', color: '#333', fontSize: '15px' }}>
                        {aiResponse}
                      </div>

                      {/* Continue conversation prompt */}
                      {!showChat && (
                        <button
                          onClick={() => setShowChat(true)}
                          style={{
                            marginTop: '20px',
                            background: 'none',
                            border: '1px solid #e0d5c8',
                            borderRadius: '5px',
                            padding: '10px 18px',
                            fontFamily: 'Georgia, serif',
                            fontSize: '14px',
                            color: '#888',
                            cursor: 'pointer',
                          }}
                        >
                          Still processing? Continue the conversation →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Chat Interface */}
                  {showChat && (
                    <div style={{
                      borderTop: '1px solid #e0d5c8',
                      paddingTop: '20px',
                    }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#c9a96e',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '16px',
                      }}>
                        Continue the conversation
                      </div>

                      {/* Chat messages */}
                      <div style={{ marginBottom: '16px' }}>
                        {chatMessages.map((msg, i) => (
                          <div key={i} style={{
                            marginBottom: '16px',
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          }}>
                            <div style={{
                              maxWidth: '80%',
                              padding: '12px 16px',
                              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              background: msg.role === 'user' ? '#5c3d1e' : '#f5f0e8',
                              color: msg.role === 'user' ? 'white' : '#333',
                              lineHeight: '1.7',
                              fontSize: '15px',
                            }}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                            <div style={{
                              padding: '12px 16px',
                              borderRadius: '12px 12px 12px 2px',
                              background: '#f5f0e8',
                              color: '#888',
                              fontStyle: 'italic',
                              fontSize: '14px',
                            }}>
                              ...
                            </div>
                          </div>
                        )}
                        <div ref={chatBottomRef} />
                      </div>

                      {/* Chat input */}
                      <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          placeholder="Continue the conversation..."
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            border: '1px solid #e0d5c8',
                            borderRadius: '5px',
                            fontFamily: 'Georgia, serif',
                            fontSize: '15px',
                            background: '#faf8f5',
                          }}
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim() || chatLoading}
                          style={{
                            padding: '10px 20px',
                            background: chatInput.trim() && !chatLoading ? '#5c3d1e' : '#c9a96e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            fontFamily: 'Georgia, serif',
                            fontSize: '15px',
                            cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                          }}
                        >
                          Send
                        </button>
                      </form>
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
