import { supabase } from './supabase'

// Calls the generate-narrative edge function with a trimmed slice of the
// user's already-fetched moduleData, then persists the result. The edge
// function itself derives the user from the caller's JWT (not from anything
// in the payload), so this can't be used to generate a narrative for anyone
// but the signed-in user.
export async function generateNarrative(moduleData) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const payload = {
    profile:      moduleData.ritualwear?.profile ?? null,
    rules:        moduleData.ritualwear?.rules ?? [],
    glow:         moduleData.glowup?.glowUp?.result ?? null,
    styleFinder:  moduleData.glowup?.styleFinder?.result ?? null,
    neighborhood: moduleData.ritualwhere?.neighborhood ?? null,
    dating:       moduleData.ritualwhere?.dating ?? null,
    goals:        moduleData.matelier?.goals ?? [],
    atelier:      moduleData.matelier?.projects ?? [],
  }

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-narrative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ payload }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Generation failed (${res.status})`)
  }

  const { narrative } = await res.json()
  await supabase.from('ritual_narratives').upsert({ user_id: session.user.id, narrative })
  return narrative
}

export async function loadNarrative(userId) {
  const { data } = await supabase.from('ritual_narratives').select('narrative').eq('user_id', userId).maybeSingle()
  return data?.narrative ?? null
}
