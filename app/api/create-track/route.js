import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { book } = await request.json()
  if (!book) {
    return Response.json({ error: 'Book is required' }, { status: 400 })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: 'You are a Bible scholar. Return only valid JSON with no markdown or extra text.',
      messages: [{
        role: 'user',
        content: `Break the book of ${book} into natural narrative or thematic study passages (roughly 20-40 verses each).

Return a JSON array:
[
  {"reference": "John 1:1-18", "title": "The Word Became Flesh"},
  {"reference": "John 1:19-51", "title": "John's Testimony and the First Disciples"}
]`
      }]
    })

    const raw = response.content[0].text.replace(/```json|```/g, '').trim()
    const passages = JSON.parse(raw)

    const { data: track, error } = await supabase
      .from('tracks')
      .insert({
        user_id: user.id,
        book,
        passages,
        current_index: 0,
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ track })

  } catch (err) {
    console.error('Track creation error:', err)
    return Response.json(
      { error: 'Could not create track. Check the book name and try again.' },
      { status: 500 }
    )
  }
}
