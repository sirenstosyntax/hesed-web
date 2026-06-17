import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Crisis detection ───────────────────────────────────────────────────────
const CRISIS_PATTERNS = [
  /\b(suicide|suicidal|kill myself|end my life|take my life|don't want to (be here|live|exist)|want to die|ready to die|better off dead|no reason to live)\b/i,
  /\b(cutting|self[- ]harm|hurt myself|burning myself|hurting myself)\b/i,
  /\b(can't go on|can't do this anymore|no way out|nothing to live for|no point in (living|going on))\b/i,
  /\b(being abused|he hits me|she hits me|they hurt me|not safe at home|afraid (for my life|of him|of her|of them))\b/i,
]

function detectCrisis(text) {
  if (!text) return false
  return CRISIS_PATTERNS.some(pattern => pattern.test(text))
}

const CRISIS_RESOURCES_HTML = `
<div style="margin-top: 24px; padding: 16px; background: #fff8f0; border: 1px solid #e8c9a0; border-radius: 8px;">
  <p style="margin: 0 0 8px 0; font-weight: 600; color: #5c3d1e;">You don't have to carry this alone.</p>
  <p style="margin: 0 0 12px 0; color: #4a4a4a; font-size: 0.95em;">If you're in a dark place right now, please reach out to someone who can help:</p>
  <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 0.95em; line-height: 1.8;">
    <li><strong>988 Suicide &amp; Crisis Lifeline</strong> — call or text <strong>988</strong> (US, 24/7)</li>
    <li><strong>Crisis Text Line</strong> — text HOME to <strong>741741</strong></li>
    <li><strong>International Association for Suicide Prevention</strong> — <a href="https://www.iasp.info/resources/Crisis_Centres/" target="_blank" rel="noopener" style="color: #5c3d1e;">find a crisis center near you</a></li>
  </ul>
  <p style="margin: 12px 0 0 0; color: #4a4a4a; font-size: 0.9em; font-style: italic;">Reaching out is not weakness. It's one of the bravest things a person can do.</p>
</div>
`

// ── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a warm, spiritually perceptive companion responding to someone's personal reflection on a Bible passage. Your responses model the way Jesus engaged with people — meeting them exactly where they are, never compromising truth, but always leading with love and genuine curiosity.

Guidelines:
- Keep your response to 3-5 sentences followed by one genuine question
- Be conversational and warm, never preachy or lecture-y
- Respond to what the person ACTUALLY wrote, not a generic reflection
- Draw a natural connection back to the passage when it fits organically
- On core Christian doctrine (the gospel, sin, the resurrection, the nature of God, salvation) — hold the line gently but clearly, never softening truth
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

    const body = await request.json()
    const { journalEntry, passage, journalPrompt, conversationHistory } = body

    if (!journalEntry?.trim()) {
      return Response.json({ error: 'No journal entry provided' }, { status: 400 })
    }

    // ── Crisis check — covers the initial entry AND any follow-up messages ──
    const allUserText = [
      journalEntry,
      ...(conversationHistory || [])
        .filter(msg => msg.role === 'user')
        .map(msg => (typeof msg.content === 'string' ? msg.content : '')),
    ].join(' ')
    const hasCrisisSignals = detectCrisis(allUserText)

    // ── Build messages ─────────────────────────────────────────────────────
    const messages = []
    if (conversationHistory?.length > 0) {
      messages.push(...conversationHistory)
    } else {
      const promptLine = journalPrompt ? `The journal prompt was: "${journalPrompt}"\n\n` : ''
      messages.push({
        role: 'user',
        content: `I've been studying ${passage || 'a Bible passage'}.\n\n${promptLine}Here's my reflection:\n\n${journalEntry}`,
      })
    }

    // ── Call Claude ────────────────────────────────────────────────────────
    let reflection = ''
    try {
      const completion = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages,
      })
      reflection = completion.content[0]?.text || ''
    } catch (aiError) {
      console.error('Anthropic call failed:', aiError)
      // Even if the reflection fails, we still want to surface crisis resources
      reflection = hasCrisisSignals
        ? ''
        : '<p>Thank you for writing honestly. Take a moment to sit with what you wrote — sometimes the writing itself is the prayer.</p>'
    }

    // ── Append crisis resources if needed ──────────────────────────────────
    if (hasCrisisSignals) {
      reflection += CRISIS_RESOURCES_HTML
    }

    return Response.json({
      reflection,
      flaggedForCrisis: hasCrisisSignals,
    })

  } catch (error) {
    console.error('Journal response route error:', error)
    return Response.json({ error: 'Failed to generate response' }, { status: 500 })
  }
}
