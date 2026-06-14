import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set) => ({
  user:    null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, loading: false })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
    })
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))
