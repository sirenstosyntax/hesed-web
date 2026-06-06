import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a warm, spiritually perceptive companion responding to someone's personal reflection on a Bible passage. Your responses model the way Jesus engaged with people — meeting them exactly where they are, never compromising truth, but always leading with love and genuine curiosity.

Guidelines:
- Keep your response to 3-5 sentences followed by one genuine question
- Be conversational and warm, never preachy or lecture-y
- Respond to what the person ACTUALLY wrote, not a generic reflection
- Draw a natural connection back to the passage when it fits organically
- On core Christian doctrine (the gospel, sin, resurrection, the nature of God, salvation) — hold the line gently but clearly, never softening truth
- On secondary interpretive issues where sincere believers differ (eschatology, spiritual gifts, baptism, etc.) — present perspectives openly, noting why thoughtful people read it differently
- Never assume where the person is spiritually — a seeker and a lifelong believer might write similar things
- Never use churchy jargon without explanation
- Never close with a summary that repeats what they said back to them
- Your question should open a door, not corner them`

async function extractThemes(journalEntry, passage) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: 'You extract emotional and spiritual themes from journal entries for use in personalizing future Bible studies. Return only a JSON array of 1-2 short theme strings (under 15 words each). No preamble, no markdown.',
      messages: [{
        role: 'user',
        content: `Passage: ${passage}\n\nJournal entry: ${journalEntry}\n\nExtract 1-2 themes this person is walking through. Focus on emotional or spiritual struggles, longings, or growth edges — not Bible facts. Return only a JSON array like ["theme one", "theme two"].`
      }]
    })

    const raw = response.content[0].text.trim()
    const themes = JSON.parse(raw)
    return Array.isArray(themes) ? themes : []
  } catch {
    return []
  }
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { journalEntry, passage, journalPrompt } = await request.json()

  if (!journalEntry?.trim()) {
    return Response.json({ error: 'Journal entry is required' }, { status: 400 })
  }

  try {
    // Generate reflection and extract themes in parallel
    const [reflectionResponse, themes] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Passage being studied: ${passage}
${journalPrompt ? `\nReflection prompt given: ${journalPrompt}` : ''}
Person's journal entry:
${journalEntry}
Respond warmly and personally to what they've written.`
        }]
      }),
      extractThemes(journalEntry, passage)
    ])

    const reflection = reflectionResponse.content[0].text

    // Save AI response to journal entry
    await supabase.from('journal_entries')
      .update({ ai_response: reflection })
      .eq('user_id', user.id)
      .eq('response', journalEntry)
      .order('created_at', { ascending: false })
      .limit(1)

    // Save extracted themes to user_context
    if (themes.length > 0) {
      const themeRows = themes.map(theme => ({
        user_id: user.id,
        context_type: 'journal_theme',
        content: theme,
      }))
      await supabase.from('user_context').insert(themeRows)
    }

    return Response.json({ reflection })

  } catch (err) {
    console.error('Journal response error:', err)
    return Response.json({ error: 'Could not generate response' }, { status: 500 })
  }
}
