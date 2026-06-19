import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    let done = false
    const go = () => { if (!done) { done = true; window.location.replace('/') } }

    // detectSessionInUrl may have already processed the token before this
    // component mounted — check immediately before subscribing
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { go(); return }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          subscription.unsubscribe()
          go()
        }
      })
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0F0E' }}>
      <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#5a5048', letterSpacing: '0.15em' }}>authenticating…</p>
    </div>
  )
}
