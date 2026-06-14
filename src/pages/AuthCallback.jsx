import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    supabase.auth.getSession().then(() => {
      window.location.replace('/')
    })
  }, [])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0F0E' }}>
      <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#5a5048', letterSpacing: '0.15em' }}>authenticating…</p>
    </div>
  )
}
