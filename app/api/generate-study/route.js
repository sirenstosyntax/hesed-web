import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { redirect } from 'next/navigation'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TRANSLATIONS = {
  NIV: '78a9f6124f344018-01',
  MSG: '6f11a7de016f942e-01',
  AMP: 'a81b73293d3080c9-01',
  KJV: 'de4e12af7f28f599-02',
  ESV: '106da70f-e1a0-48a5-a98b-10fa06064c8c-01',
}

async function fetchPassage(reference) {
  const apiKey = process.env.BIBLE_API_KEY
  const results = []

  for (const [name, bibleId] of Object.entries(TRANSLATIONS)) {
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
      // Skip failed translations silently
    }
  }

  return results
}

async function gatherResearch(reference) {
  const tools = [
    {
      name: 'web_search',
      description: 'Search the web for information about a Bible passage',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' }
        },
        required: ['query']
      }
    }
  ]

  const messages = [{
    role: 'user',
    content: `Research the Bible passage ${reference}. Search for:
1. Historical and cultural context
2. What scholars commonly overlook in this passage
3. Greek or Hebrew word insights

Provide a comprehensive research summary.`
  }]

  let response
  while (true) {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      tools,
      messages,
    })

    if (response.stop_reason === 'end_turn') {
      return response.content.find(b => b.type === 'text')?.text || ''
    }

    messages.push({ role: 'assistant', content: response.content })

    const toolResults = []
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'web_search') {
        try {
          const searchRes = await fetch(
            `https://api.tavily.com/search`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: block.input.query,
                max_results: 4,
              }),
            }
          )
          const searchData = await searchRes.json()
          const results = searchData.results?.map(r => `${r.title}: ${r.content}`).join('\n\n') || 'No results'
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: results })
        } catch {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'Search failed' })
        }
      }
    }
    messages.push({ role: 'user', content: toolResults })
  }
}

async function extractStructuredContent(reference, research, translations) {
  const passageText = translations.map(t => `[${t.name}]\n${t.text}`).join('\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    system: 'You are a helpful assistant that structures Bible study research into JSON format. Return only valid JSON with no markdown or extra text.',
    messages: [{
      role: 'user',
      content: `Structure this Bible study for ${reference} into JSON.

Passage texts:
${passageText}

Research:
${research}

Return a JSON object with these exact keys:
- passage: object with translations array (each has name and text fields) — use the passage texts provided above
- context: object with summary string and sections array (each has heading and content)
- deeper: object with summary string and sections array (each has heading, content, and optional isWordStudy boolean)
- application: object with hesedConnection string and sections array (each has heading and content)
- journal: object with prompt string

Be thorough. Return only the JSON object.`
    }]
  })

  const raw = response.content[0].text.replace(/```json|```/g, '').trim()
  return JSON.parse(raw)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { passage } = await request.json()
  if (!passage) {
    return Response.json({ error: 'Passage is required' }, { status: 400 })
  }

  // Create session placeholder immediately so we have an ID to return
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
    return Response.json({ error: 'Could not create session' }, { status: 500 })
  }

  // Return session ID immediately — generation continues in background
  const sessionId = session.id

  // Run generation asynchronously
  ;(async () => {
    try {
      const [translations, research] = await Promise.all([
        fetchPassage(passage),
        gatherResearch(passage),
      ])

      const studyContent = await extractStructuredContent(passage, research, translations)

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
