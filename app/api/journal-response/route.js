import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Crisis detection ───────────────────────────────────────────────────────
const CRISIS_PATTERNS = [
  // Suicidal ideation
  /\b(suicide|suicidal|kill myself|end my life|take my life|don't want to (be here|live|exist)|want to die|ready to die|better off dead|no reason to live)\b/i,
  // Self-harm
  /\b(cutting|self[- ]harm|hurt myself|burning myself|hurting myself)\b/i,
  // Hopelessness signals
  /\b(can't go on|can't do this anymore|no way out|nothing to live for|no point in (living|going on))\b/i,
  // Abuse / safety
  /\b(being abused|he hits me|she hits me|they hurt me|not safe at home|afraid (for my life|of him|of her|of them))\b/i,
]

function detectCrisis(text) {
  return CRISIS_PATTERNS.some(pattern => pattern.test(text))
}

const CRISIS_RESOURCES_HTML = `
<div style="margin-top: 24px; padding: 16px; background: #fff8f0; border: 1px solid #e8c9a0; border-radius: 8px;">
  <p style="margin: 0 0 8px 0; font-weight: 600; color: #5c3d1e;">You don't have to carry this alone.</p>
  <p style="margin: 0 0 12px 0; color: #4a4a4a; font-size: 0.95em;">If you're in a dark place, please reach out to someone who can help:</p>
  <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 0.95em; line-height: 1.8;">
    <li><strong>988 Suicide &amp; Crisis Lifeline</strong> — call or text <strong>988</strong></li>
    <li><strong>Crisis Text Line</strong> — text HOME to <strong>741741</strong></li>
    <li><strong>International Association for Suicide Prevention</strong> — <a href="https://www.iasp.info/resources/Crisis_Centres/" target="_blank" style="color: #5c3d1e;">find a crisis center near you</a></li>
  </ul>
  <p style="margin: 12px 0 0 0; color: #4a4a4a; font-size: 0.9em; font-style: italic;">Reaching out is not weakness. It's one of the bravest things you can do.</p>
</div>
`

// ── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a warm, spiritually perceptive companion responding to someone's personal reflection on a Bible passage. Your responses model the way Jesus engaged with people — meeting them exactly where they are, never compromising truth, but always leading with love and genuine curiosity.

Guidelines:
- Keep your response to 3-5 sentences followed by one genuine question
- Be conversational and warm, never preachy or lecture-y
- Respond to what the person ACTUALLY wrote, not a generic reflection
- Draw a natural connection back to the passage when it fits organically
- On core Christian doctrine (the gospel, sin, resurrection, the nature of God, salvation) — hold the line gently but clearly, never softening truth
- On secondary interpretive issues where sincere believers differ (eschatology, spiritual gifts, baptism, etc.) — present perspectives with context, don't take sides
- Never assume where the person is spiritually
- Format your response as clean HTML paragraphs using <p> tags only. No markdown.`

// ── Route ──────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { journalEntry, passage, sessionId, conversationHistory } = await request.json()

    if (!journalEntry?.trim()) {
      return Response.json({ error: 'No journal entry provided' }, { status: 400 })
    }

    // ── Crisis check (before AI call) ──────────────────────────────────────
    const hasCrisisSignals = detectCrisis(journalEntry)

    // ── Build messages ─────────────────────────────────────────────────────
    const messages = []

    if (conversationHistory?.length > 0) {
      messages.push(...conversationHistory)
    } else {
      messages.push({
        role: 'user',
        content: `I've been studying ${passage || 'a Bible passage'} and here's my reflection:\n\n${journalEntry}`
      })
    }

    // ── Call Claude ────────────────────────────────────────────────────────
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages,
    })

    let aiResponse = response.content[0].text

    // ── Append crisis resources if needed ─────────────────────────────────
    if (hasCrisisSignals) {
      aiResponse += CRISIS_RESOURCES_HTML
    }

    // ── Save journal entry ─────────────────────────────────────────────────
    if (sessionId && (!conversationHistory || conversationHistory.length === 0)) {
      await supabase.table('journal_entries').insert({
        user_id: user.id,
        session_id: sessionId,
        entry: journalEntry,
        ai_response: aiResponse,
      })

      // Extract theme for future personalization
      await supabase.table('user_context').insert({
        user_id: user.id,
        context_type: 'journal_theme',
        content: journalEntry.slice(0, 200),
      })
    }

    return Response.json({ response: aiResponse, flaggedForCrisis: hasCrisisSignals })

  } catch (error) {
    console.error('Journal response error:', error)
    return Response.json({ error: 'Failed to generate response' }, { status: 500 })
  }
}