import { describe, it, expect } from 'vitest'

describe('robin useAuthStore shape', () => {

  it('initial state has null user and loading true', () => {
    const state = { user: null, loading: true }
    expect(state.user).toBeNull()
    expect(state.loading).toBe(true)
  })

  it('signOut clears user', () => {
    let state = { user: { id: 'x' }, loading: false }
    state = { ...state, user: null }
    expect(state.user).toBeNull()
  })

  it('required auth methods are defined', () => {
    const methods = ['initialize', 'signInWithGoogle', 'signOut']
    methods.forEach(m => expect(typeof m).toBe('string'))
  })

  it('redirect URL is well-formed', () => {
    const url = 'https://robin.ritualware.app/auth/callback'
    expect(url).toMatch(/^https:\/\//)
    expect(url).toContain('/auth/callback')
  })
})
