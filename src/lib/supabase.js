import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const COOKIE_DOMAIN = import.meta.env.DEV ? null : '.ritualware.app'
const SESSION_KEY   = 'ritual-session'

const cookieStorage = {
  getItem(key) {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(key)}=([^;]*)`))
    return match ? decodeURIComponent(match[1]) : null
  },
  setItem(key, value) {
    const maxAge = 60 * 60 * 24 * 365
    const domain = COOKIE_DOMAIN ? `; domain=${COOKIE_DOMAIN}` : ''
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/${domain}; max-age=${maxAge}; SameSite=Lax; Secure`
  },
  removeItem(key) {
    const domain = COOKIE_DOMAIN ? `; domain=${COOKIE_DOMAIN}` : ''
    document.cookie = `${encodeURIComponent(key)}=; path=/${domain}; max-age=0`
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: cookieStorage,
    storageKey: SESSION_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
