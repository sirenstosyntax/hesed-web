import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BASE_SYSTEM = `You are a warm, spiritually perceptive conversation partner responding to someone who is processing a Bible passage and their own reflections on it. Your tone models the way Jesus engaged with seekers — meeting them exactly where they are, never compromising truth, always leading with love and genuine curiosity.

Guidelines:
- Be conversational and warm, like a trusted friend who knows Scripture deeply
- Respond to what the person ACTUALLY said, not a generic spiritual answer
- Draw natural connections back to the passage when it fits organically
- On core Christian doctrine (the gospel, sin, resurrection, the nature of God) — hold the line gently but clearly
- On secondary interpretive issues where sincere believers differ — present perspectives openly
- Never be preachy or apply pressure
- Ask one genuine question per response to keep the conversation moving
- Keep responses to 4-6 sentences plus one question
- Never use churchy jargon without explanation
- Never assume where the person is spiritually`

const COMMUNITY_NUDGE = `

At some point naturally woven into your response (not as a footer or separate paragraph), gently acknowledge that these kinds of questions are worth exploring with real people too, and that finding a good local church or spiritual community can be part of that journey. Make it feel like something you would naturally say in a real conversation, not a disclaimer.`

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message, sessionId, passage, journalEntry, conversationId } = await request.json()

  if (!message?.trim()) {
    return Response.json({ error: 'Message is required' }, { status: 400 })
  }

  try {
    // Get or create conversation
    let conversation
    let messages = []

    if (conversationId) {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (data) {
        conversation = data
        messages = data.messages || []
      }
    }

    if (!conversation) {
      const { data } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          messages: [],
        })
        .select()
        .single()
      conversation = data
    }

    const messageCount = messages.length
    const shouldNudge = messageCount >= 8 && messageCount % 4 === 0

    const systemPrompt = BASE_SYSTEM + (shouldNudge ? COMMUNITY_NUDGE : '')

    // Build context for Claude
    const contextIntro = [
      {
        role: 'user',
        content: (
          `Context for this conversation:\n` +
          `Passage being studied: ${passage}\n` +
          `Their journal reflection: ${journalEntry}\n\n` +
          `Now they want to continue the conversation. Respond warmly to their messages.`
        )
      },
      {
        role: 'assistant',
        content: 'I understand the context. I will respond warmly and thoughtfully to their messages, drawing on the passage and their reflection as relevant.'
      }
    ]

    // Add conversation history
    const history = messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Add new message
    const newMessage = { role: 'user', content: message }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [...contextIntro, ...history, newMessage],
    })

    const reply = response.content[0].text

    // Save updated conversation
    const updatedMessages = [
      ...messages,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ]

    await supabase
      .from('conversations')
      .update({
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id)

    return Response.json({
      reply,
      conversationId: conversation.id,
    })

  } catch (err) {
    console.error('Chat error:', err)
    return Response.json({ error: 'Could not generate response' }, { status: 500 })
  }
}
