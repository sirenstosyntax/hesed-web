import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import StudyViewer from './StudyViewer'

export default async function StudyPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!session || !session.study_content) notFound()

  return <StudyViewer session={session} userId={user.id} />
}
