import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import ThemeDropdown from '../components/ThemeDropdown'
import DoTheDash from './DoTheDash'

const mono  = { fontFamily: 'monospace' }
const serif = { fontFamily: '"Playfair Display", Georgia, serif' }
const sans  = { fontFamily: '"DM Sans", sans-serif' }

// ── Module definitions ─────────────────────────────────────────────

const MODULE_META = {
  ritualwear: {
    label: 'Ritualwear',
    sub: 'oracle',
    color: '#C4717A',
    url: 'https://wear.ritualware.app',
    tagline: 'Your style, decoded.',
  },
  glowup: {
    label: 'Glow Up',
    sub: 'pyramid',
    color: '#C4A96E',
    url: 'https://glowup.ritualware.app',
    tagline: 'Your beauty architecture.',
  },
  ritualwhere: {
    label: 'Ritualwhere?',
    sub: 'map',
    color: '#6AAD8A',
    url: 'https://where.ritualware.app',
    tagline: 'Where you belong.',
  },
  ritualwealth: {
    label: 'Ritualwealth',
    sub: 'fire',
    color: '#A89BC4',
    url: 'https://wealth.ritualware.app',
    tagline: 'Your financial freedom number.',
  },
  matelier: {
    label: "m'atelier",
    sub: 'studio',
    color: '#8B7E72',
    url: 'https://studio.ritualware.app',
    tagline: 'Your creative life, organized.',
  },
}

async function fetchModuleData(userId) {
  const [
    styleProfile, savedLooks,
    glowUp, styleFinder,
    neighborhood, burnout,
    firePlan, savings,
    projects, goals,
  ] = await Promise.all([
    supabase.from('style_profiles').select('kibbe_type,color_season,style_words,undertone').eq('user_id', userId).maybeSingle(),
    supabase.from('saved_looks').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('glow_up_results').select('result').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('style_finder_results').select('archetype,result').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('neighborhood_results').select('top_match').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('burnout_results').select('burnout_type,severity').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('user_fire_plans').select('fire_type,target_number,target_age').eq('user_id', userId).maybeSingle(),
    supabase.from('user_savings_buckets').select('name,target,current').eq('user_id', userId).order('sort_order'),
    supabase.from('atelier_projects').select('name,status').eq('user_id', userId).eq('status', 'active'),
    supabase.from('atelier_goals').select('title,is_complete').eq('user_id', userId),
  ])

  return {
    ritualwear: { profile: styleProfile.data, looksCount: savedLooks.count ?? 0 },
    glowup:     { glowUp: glowUp.data, styleFinder: styleFinder.data },
    ritualwhere:{ neighborhood: neighborhood.data, burnout: burnout.data },
    ritualwealth:{ firePlan: firePlan.data, savings: savings.data ?? [] },
    matelier:   { projects: projects.data ?? [], goals: goals.data ?? [] },
  }
}

// ── Module card contents ───────────────────────────────────────────

function RitualwearContent({ data }) {
  const { profile, looksCount } = data
  if (!profile?.kibbe_type) return (
    <EmptyState label="Style Bible" url="https://wear.ritualware.app" prompt="Complete your Style Bible to unlock this module." />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {profile.kibbe_type && <Chip label="body type" value={profile.kibbe_type.replace(/_/g, ' ')} />}
        {profile.color_season && <Chip label="colour season" value={profile.color_season.replace(/_/g, ' ')} />}
        {profile.undertone && <Chip label="undertone" value={profile.undertone} />}
        {looksCount > 0 && <Chip label="looks saved" value={looksCount} />}
      </div>
      {profile.style_words?.length > 0 && (
        <div>
          <p style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--c-dim)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>style words</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {profile.style_words.slice(0, 5).map(w => (
              <span key={w} style={{ ...mono, fontSize: '0.58rem', color: '#C4717A', background: 'rgba(196,113,122,0.08)', border: '1px solid rgba(196,113,122,0.2)', borderRadius: '3px', padding: '0.2rem 0.5rem' }}>{w}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GlowUpContent({ data }) {
  const { glowUp, styleFinder } = data
  if (!glowUp && !styleFinder) return (
    <EmptyState label="Glow Up" url="https://glowup.ritualware.app" prompt="Run your first audit to unlock this module." />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {glowUp?.result?.overall_tier && <Chip label="glow tier" value={glowUp.result.overall_tier} />}
      {styleFinder?.archetype && <Chip label="style archetype" value={styleFinder.archetype.replace(/_/g, ' ')} />}
      {styleFinder?.result?.persona_name && (
        <p style={{ ...sans, fontSize: '0.78rem', color: 'var(--c-body-text)', lineHeight: 1.4 }}>
          {styleFinder.result.persona_name}
        </p>
      )}
    </div>
  )
}

function RitualwhereContent({ data }) {
  const { neighborhood, burnout } = data
  if (!neighborhood) return (
    <EmptyState label="Ritualwhere?" url="https://where.ritualware.app" prompt="Take the neighborhood quiz to unlock this module." />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {neighborhood?.top_match && <Chip label="your neighborhood" value={neighborhood.top_match} color="#6AAD8A" />}
      {burnout?.burnout_type && <Chip label="burnout type" value={burnout.burnout_type.replace(/_/g, ' ')} />}
      {burnout?.severity != null && <Chip label="severity" value={`${burnout.severity} / 10`} />}
    </div>
  )
}

function RitualwealthContent({ data }) {
  const { firePlan, savings } = data
  if (!firePlan) return (
    <EmptyState label="Ritualwealth" url="https://wealth.ritualware.app" prompt="Map your FIRE plan to unlock this module." />
  )
  const totalSaved  = savings.reduce((s, b) => s + (parseFloat(b.current) || 0), 0)
  const totalTarget = savings.reduce((s, b) => s + (parseFloat(b.target) || 0), 0)
  const pct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {firePlan.fire_type && <Chip label="fire type" value={firePlan.fire_type.replace(/_/g, ' ')} color="#A89BC4" />}
      {firePlan.target_number && (
        <Chip label="target number" value={`$${Number(firePlan.target_number).toLocaleString()}`} color="#A89BC4" />
      )}
      {firePlan.target_age && <Chip label="target age" value={firePlan.target_age} />}
      {pct != null && savings.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <p style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--c-dim)', textTransform: 'uppercase' }}>savings progress</p>
            <p style={{ ...mono, fontSize: '0.5rem', color: '#A89BC4' }}>{Math.round(pct)}%</p>
          </div>
          <div style={{ height: '3px', background: 'var(--c-border-2)', borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', background: '#A89BC4', borderRadius: '2px' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function AtelierContent({ data }) {
  const { projects, goals } = data
  if (!projects.length && !goals.length) return (
    <EmptyState label="m'atelier" url="https://studio.ritualware.app" prompt="Add your first project to unlock this module." />
  )
  const openGoals = goals.filter(g => !g.is_complete)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {projects.slice(0, 3).map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8B7E72', flexShrink: 0 }} />
          <span style={{ ...sans, fontSize: '0.78rem', color: 'var(--c-body-text)' }}>{p.name}</span>
        </div>
      ))}
      {openGoals.length > 0 && (
        <p style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-dim)', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
          {openGoals.length} open {openGoals.length === 1 ? 'goal' : 'goals'}
        </p>
      )}
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────

function Chip({ label, value, color = 'var(--c-muted2)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <p style={{ ...mono, fontSize: '0.47rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--c-dim)' }}>{label}</p>
      <p style={{ ...sans, fontSize: '0.82rem', color, lineHeight: 1 }}>{value}</p>
    </div>
  )
}

function EmptyState({ label, url, prompt }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <p style={{ ...sans, fontSize: '0.78rem', color: 'var(--c-dim)', lineHeight: 1.5, fontStyle: 'italic' }}>{prompt}</p>
      <a href={url} target="_blank" rel="noreferrer"
        style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--c-accent)', textDecoration: 'none' }}>
        open {label} ↗
      </a>
    </div>
  )
}

function ModuleCard({ mod, data, editing, onMoveUp, onMoveDown, onToggle, isFirst, isLast }) {
  const meta    = MODULE_META[mod.id]
  const content = {
    ritualwear:   <RitualwearContent data={data} />,
    glowup:       <GlowUpContent data={data} />,
    ritualwhere:  <RitualwhereContent data={data} />,
    ritualwealth: <RitualwealthContent data={data} />,
    matelier:     <AtelierContent data={data} />,
  }[mod.id]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: mod.enabled ? 1 : 0.35, y: 0 }} viewport={{ once: true }}
      style={{
        padding: '1.5rem 1.75rem',
        background: 'var(--c-surface-1)',
        borderRadius: '1rem',
        border: `1px solid ${editing ? 'var(--c-border-3)' : 'var(--c-border-1)'}`,
        transition: 'opacity 0.2s, border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
        <div>
          <p style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: meta.color, marginBottom: '0.2rem' }}>
            {meta.sub}
          </p>
          <p style={{ ...serif, fontSize: '1.15rem', color: 'var(--c-fg)', lineHeight: 1 }}>{meta.label}</p>
          <p style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-dim)', marginTop: '0.2rem', fontStyle: 'italic' }}>{meta.tagline}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {editing ? (
            <>
              <button onClick={() => onToggle(mod.id)} style={{ ...mono, fontSize: '0.52rem', color: mod.enabled ? 'var(--c-up)' : 'var(--c-dim)', background: 'none', border: '1px solid var(--c-border-3)', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
                {mod.enabled ? 'visible' : 'hidden'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button onClick={() => onMoveUp(mod.id)} disabled={isFirst} style={{ ...mono, fontSize: '0.6rem', color: isFirst ? 'var(--c-border-3)' : 'var(--c-muted)', background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer', lineHeight: 1, padding: '2px' }}>▲</button>
                <button onClick={() => onMoveDown(mod.id)} disabled={isLast} style={{ ...mono, fontSize: '0.6rem', color: isLast ? 'var(--c-border-3)' : 'var(--c-muted)', background: 'none', border: 'none', cursor: isLast ? 'default' : 'pointer', lineHeight: 1, padding: '2px' }}>▼</button>
              </div>
            </>
          ) : (
            <a href={meta.url} target="_blank" rel="noreferrer"
              style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--c-dim)', textDecoration: 'none' }}>
              open ↗
            </a>
          )}
        </div>
      </div>
      {mod.enabled && content}
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────────────

export default function UserDashboard({ user, onExitPreview = null }) {
  const [modules, setModules]   = useState(null)
  const [moduleData, setModuleData] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [showAddTray, setShowAddTray] = useState(false)

  useEffect(() => {
    async function load() {
      const [config, data] = await Promise.all([
        supabase.from('robin_dashboard_config').select('modules').eq('user_id', user.id).maybeSingle(),
        fetchModuleData(user.id),
      ])
      setModules(config.data?.modules ?? null)
      setModuleData(data)
      setLoading(false)
    }
    load()
  }, [user.id])

  const saveModules = async (mods) => {
    setSaving(true)
    await supabase.from('robin_dashboard_config').upsert({
      user_id: user.id, modules: mods,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSaving(false)
  }

  const moveUp = (id) => {
    setModules(prev => {
      const i = prev.findIndex(m => m.id === id)
      if (i === 0) return prev
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      saveModules(next)
      return next
    })
  }

  const moveDown = (id) => {
    setModules(prev => {
      const i = prev.findIndex(m => m.id === id)
      if (i === prev.length - 1) return prev
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      saveModules(next)
      return next
    })
  }

  const toggleModule = (id) => {
    setModules(prev => {
      const next = prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)
      saveModules(next)
      return next
    })
  }

  const addModule = (id) => {
    setModules(prev => {
      const existing = prev.find(m => m.id === id)
      const next = existing
        ? prev.map(m => m.id === id ? { ...m, enabled: true } : m)
        : [...prev, { id, enabled: true, order: prev.length }]
      saveModules(next)
      return next
    })
    setShowAddTray(false)
  }

  const retakeQuiz = async () => {
    await supabase.from('robin_dashboard_config').delete().eq('user_id', user.id)
    await supabase.from('robin_quiz_results').delete().eq('user_id', user.id)
    setModules(null)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--c-dim)' }}>loading your dashboard…</p>
    </main>
  )

  if (!modules) return (
    <DoTheDash user={user} onComplete={(mods) => setModules(mods)} />
  )

  const enabledFirst = [...modules].sort((a, b) => (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0))

  return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-fg)', padding: 'clamp(2rem,4vw,3.5rem) clamp(1rem,3vw,2.5rem)' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--c-accent)' }}>ROBIN // YOUR RITUALWARE</p>
              {onExitPreview && (
                <button onClick={onExitPreview}
                  style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.12em', color: 'var(--c-dim)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--c-border-2)', borderRadius: '4px', padding: '0.25rem 0.7rem', cursor: 'pointer' }}>
                  back to admin
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setEditing(e => !e)}
                style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.12em', color: editing ? 'var(--c-accent)' : 'var(--c-dim)', background: 'none', border: `1px solid ${editing ? 'var(--c-accent-border)' : 'var(--c-border-2)'}`, borderRadius: '4px', padding: '0.35rem 0.85rem', cursor: 'pointer' }}
              >
                {editing ? (saving ? 'saving…' : 'done') : 'edit dashboard'}
              </button>
              <ThemeDropdown />
            </div>
          </div>
          <h1 style={{ ...serif, fontSize: 'clamp(24px,3.5vw,42px)', fontWeight: 400, lineHeight: 1.1 }}>
            Your ritual life, <em style={{ color: 'var(--c-accent)' }}>at a glance.</em>
          </h1>
        </motion.div>

        {/* Module grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <AnimatePresence>
            {modules.map((mod, i) => (
              <ModuleCard
                key={mod.id}
                mod={mod}
                data={moduleData[mod.id] ?? {}}
                editing={editing}
                onMoveUp={moveUp}
                onMoveDown={moveDown}
                onToggle={toggleModule}
                isFirst={i === 0}
                isLast={i === modules.length - 1}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Add module tray */}
        {(() => {
          const addable = Object.keys(MODULE_META).filter(id => {
            const inConfig = modules.find(m => m.id === id)
            return !inConfig || !inConfig.enabled
          })
          if (!addable.length) return null
          return (
            <div style={{ marginBottom: '2rem' }}>
              {showAddTray ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ padding: '1.25rem', background: 'var(--c-surface-1)', borderRadius: '0.75rem', border: '1px solid var(--c-border-2)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--c-accent)', textTransform: 'uppercase' }}>add a module</p>
                    <button onClick={() => setShowAddTray(false)}
                      style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      cancel
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {addable.map(id => {
                      const meta = MODULE_META[id]
                      return (
                        <motion.button key={id}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => addModule(id)}
                          style={{
                            ...mono, fontSize: '0.6rem', letterSpacing: '0.1em',
                            display: 'flex', flexDirection: 'column', gap: '0.2rem',
                            padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer',
                            background: 'var(--c-surface-2)',
                            border: `1px solid ${meta.color}40`,
                            color: meta.color, textAlign: 'left',
                          }}
                        >
                          <span>{meta.label}</span>
                          <span style={{ ...sans, fontSize: '0.65rem', color: 'var(--c-dim)' }}>{meta.tagline}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => setShowAddTray(true)}
                  style={{
                    ...mono, fontSize: '0.55rem', letterSpacing: '0.15em',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    width: '100%', padding: '0.75rem 1.25rem',
                    background: 'none', border: '1px dashed var(--c-border-2)',
                    borderRadius: '0.75rem', cursor: 'pointer',
                    color: 'var(--c-dim)', transition: 'border-color 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-border-3)'; e.currentTarget.style.color = 'var(--c-muted)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-border-2)'; e.currentTarget.style.color = 'var(--c-dim)' }}
                >
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
                  <span>add a module</span>
                </button>
              )}
            </div>
          )
        })()}

        {/* Footer */}
        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--c-border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            onClick={retakeQuiz}
            style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--c-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            retake do the dash
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--c-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            sign out
          </button>
        </div>

      </div>
    </main>
  )
}
