import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TRANSLATIONS = {
  NIV: '78a9f6124f344018-01',
  MSG: '6f11a7de016f942e-01',
  KJV: 'de4e12af7f28f599-02',
}

async function fetchPassages(reference) {
  const apiKey = process.env.BIBLE_API_KEY
  const results = []

  await Promise.all(
    Object.entries(TRANSLATIONS).map(async ([name, bibleId]) => {
      try {
        const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/search?query=${encodeURIComponent(reference)}&limit=1`
        const res = await fetch(url, {
          headers: { 'api-key': apiKey },
          signal: AbortSignal.timeout(8000),
        })
        const data = await res.json()
        const passages = data?.data?.passages || []
        if (passages[0]) {
          const text = passages[0].content.replace(/<[^>]+>/g, '').trim()
          results.push({ name, text })
        }
      } catch {
        // Skip failed translations
      }
    })
  )

  return results
}

async function searchContext(reference) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${reference} Bible historical context commentary Greek Hebrew word study`,
        max_results: 5,
      }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    return data.results?.map(r => `${r.title}: ${r.content}`).join('\n\n') || ''
  } catch {
    return ''
  }
}

async function generateStudyContent(reference, translations, webContext) {
  const passageText = translations.map(t => `[${t.name}]\n${t.text}`).join('\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    system: 'You are a Bible study assistant. Return only valid JSON with no markdown or extra text.',
    messages: [{
      role: 'user',
      content: `Create a comprehensive Bible study for ${reference}.

Passage texts:
${passageText}

Research context:
${webContext || 'Use your knowledge of historical context, Greek/Hebrew insights, and biblical scholarship.'}

Structure everything as a JSON object with these keys:
- passage: object with translations array (each has name and text — use the passage texts above verbatim)
- context: object with summary string and sections array (each has heading and content) — cover historical background, cultural setting, geographic details
- deeper: object with summary string and sections array (each has heading, content, optional isWordStudy boolean) — cover what scholars miss, Greek/Hebrew words, cross-references  
- application: object with hesedConnection string (how this reveals God's steadfast love) and sections array (each has heading and content) — cover reflection, questions, prayer
- journal: object with prompt string — one thoughtful journal prompt

Be thorough and write with theological depth and pastoral warmth. Return only the JSON object.`
    }]
  })

  const raw = response.content[0].text.replace(/```json|```/g, '').trim()
  return JSON.parse(raw)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  console.log('Auth check - user:', user?.id, 'error:', authError?.message)

  if (!user) {
    return Response.json({ error: 'Unauthorized', authError: authError?.message }, { status: 401 })
  }
  const { passage: rawPassage } = await request.json()
  if (!rawPassage) {
    return Response.json({ error: 'Passage is required' }, { status: 400 })
  }

  // Normalize shorthand references like "Ephesians 1" to full verse ranges
  let passage = rawPassage
  try {
    const normRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      system: 'You are a Bible reference normalizer. Return only the normalized reference, nothing else.',
      messages: [{
        role: 'user',
        content: (
          'Normalize this Bible reference to include full verse range. ' +
          'If it already has verses, return it unchanged. ' +
          'If it is just a chapter, expand to the full chapter verse range. ' +
          'Examples: Ephesians 1 -> Ephesians 1:1-23, John 3 -> John 3:1-36. ' +
          'Reference: ' + rawPassage
        )
      }]
    })
    const normalized = normRes.content[0].text.trim()
    if (normalized && normalized.length < 50) {
      passage = normalized
    }
  } catch {
    // If normalization fails, use original
  }

  // Create session placeholder
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      passage,
      study_html: 'generating...',
    })
    .select()
    .single()

  if (sessionError) {
    console.error('Session insert error:', JSON.stringify(sessionError))
    return Response.json({ error: 'Could not create session', detail: sessionError.message }, { status: 500 })
  }
  const sessionId = session.id

  // Run generation in background
  ;(async () => {
    try {
      // Fetch passages and search context in parallel
      const [translations, webContext] = await Promise.all([
        fetchPassages(passage),
        searchContext(passage),
      ])

      // Single Claude call combining research and formatting
      const studyContent = await generateStudyContent(passage, translations, webContext)

      await supabase
        .from('sessions')
        .update({ study_content: studyContent, study_html: 'generated' })
        .eq('id', sessionId)
    } catch (err) {
      console.error('Generation error:', err)
      await supabase
        .from('sessions')
        .update({ study_html: 'error' })
        .eq('id', sessionId)
    }
  })()

  return Response.json({ sessionId })
}
