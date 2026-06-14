import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars missing — add them to .env.local')
}

const COOKIE_DOMAIN = import.meta.env.DEV ? null : '.ritualware.app'
const SESSION_KEY   = 'ritual-session'
const CHUNK_SIZE    = 3500

function setCookie(name, value, maxAge = 60 * 60 * 24 * 365) {
  const domain = COOKIE_DOMAIN ? `; domain=${COOKIE_DOMAIN}` : ''
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/${domain}; max-age=${maxAge}; SameSite=Lax; Secure`
}

function getCookie(name) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(name)}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function removeCookie(name) {
  const domain = COOKIE_DOMAIN ? `; domain=${COOKIE_DOMAIN}` : ''
  document.cookie = `${encodeURIComponent(name)}=; path=/${domain}; max-age=0`
}

const cookieStorage = {
  getItem(key) {
    const chunks = []
    let i = 0
    while (true) {
      const chunk = getCookie(`${key}.${i}`)
      if (chunk === null) break
      chunks.push(chunk)
      i++
    }
    if (chunks.length > 0) return chunks.join('')
    return getCookie(key)
  },
  setItem(key, value) {
    this.removeItem(key)
    if (!value || value.length <= CHUNK_SIZE) {
      setCookie(key, value ?? '')
    } else {
      let i = 0
      for (let start = 0; start < value.length; start += CHUNK_SIZE) {
        setCookie(`${key}.${i}`, value.slice(start, start + CHUNK_SIZE))
        i++
      }
    }
  },
  removeItem(key) {
    removeCookie(key)
    let i = 0
    while (getCookie(`${key}.${i}`) !== null) {
      removeCookie(`${key}.${i}`)
      i++
    }
  },
}

export const supabase = createClient(
  SUPABASE_URL ?? 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY ?? 'placeholder',
  {
    auth: {
      storage: cookieStorage,
      storageKey: SESSION_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)
