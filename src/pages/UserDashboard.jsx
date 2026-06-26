import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import DoTheDash from './DoTheDash'
import ThemeDropdown from '../components/ThemeDropdown'

// ── Brand ──────────────────────────────────────────────────────────
const ROBIN = '#8B2E0F'        // deep robin's breast
const ROBIN_BG = '#1C0905'     // near-black rust
const ROBIN_MID = '#2E100A'    // mid rust
const ROBIN_WARM = '#C4622D'   // accent orange
const CREAM = '#FAF0E8'
const CREAM_DIM = 'rgba(250,240,232,0.45)'
const CREAM_MUTED = 'rgba(250,240,232,0.22)'

const serif  = { fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif' }
const display = { fontFamily: '"Playfair Display", Georgia, serif' }
const sans   = { fontFamily: '"DM Sans", system-ui, sans-serif' }
const mono   = { fontFamily: 'monospace' }

const fmt = s => String(s ?? '').replace(/_/g, ' ')

// ── App accent colors ──────────────────────────────────────────────
const APP = {
  ritualwear:   { color: '#C4717A', url: 'https://wear.ritualware.app',    label: 'Ritualwear',   sub: 'oracle' },
  glowup:       { color: '#C4A96E', url: 'https://glowup.ritualware.app',  label: 'Glow Up',      sub: 'pyramid' },
  ritualwhere:  { color: '#6AAD8A', url: 'https://where.ritualware.app',   label: 'Ritualwhere?', sub: 'map' },
  ritualwealth: { color: '#A89BC4', url: 'https://wealth.ritualware.app',  label: 'Ritualwealth', sub: 'fire' },
  matelier:     { color: '#B07840', url: 'https://studio.ritualware.app',  label: "m'atelier",    sub: 'studio' },
}

// ── Data ──────────────────────────────────────────────────────────
async function fetchModuleData(userId) {
  const [
    styleProfile, savedLooks,
    glowUp, styleFinder,
    neighborhood, burnout,
    firePlan, savings,
    projects, goals,
  ] = await Promise.all([
    supabase.from('style_profiles').select('kibbe_type,color_season,style_words,undertone,metal,formality,palette,designer_dna,fabrics').eq('user_id', userId).maybeSingle(),
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
    ritualwear:   { profile: styleProfile.data, looksCount: savedLooks.count ?? 0 },
    glowup:       { glowUp: glowUp.data, styleFinder: styleFinder.data },
    ritualwhere:  { neighborhood: neighborhood.data, burnout: burnout.data },
    ritualwealth: { firePlan: firePlan.data, savings: savings.data ?? [] },
    matelier:     { projects: projects.data ?? [], goals: goals.data ?? [] },
  }
}

// ── Shared atoms ───────────────────────────────────────────────────
function Label({ children, color }) {
  return (
    <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: color || CREAM_MUTED, marginBottom: '0.4rem' }}>
      {children}
    </p>
  )
}

function Tag({ children, color }) {
  return (
    <span style={{ ...mono, fontSize: '11px', letterSpacing: '0.08em', color, border: `1px solid ${color}40`, borderRadius: '3px', padding: '3px 10px', textTransform: 'capitalize', display: 'inline-block' }}>
      {children}
    </span>
  )
}

function GoDeeper({ href, appKey }) {
  const app = APP[appKey]
  return (
    <a href={href || app.url} target="_blank" rel="noreferrer"
      style={{ ...mono, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: app.color, textDecoration: 'none', opacity: 0.7, transition: 'opacity 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
      go deeper in {app.label} ↗
    </a>
  )
}

function EmptyPrompt({ text, cta, href, appKey }) {
  const app = APP[appKey]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ ...serif, fontStyle: 'italic', fontSize: '20px', color: CREAM_DIM, lineHeight: 1.6 }}>{text}</p>
      <a href={href} target="_blank" rel="noreferrer"
        style={{ ...mono, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: app.color, textDecoration: 'none' }}>
        {cta} ↗
      </a>
    </div>
  )
}

// ── Section divider ────────────────────────────────────────────────
function SectionRule({ color }) {
  return <div style={{ height: '1px', background: `${color}25`, margin: '2rem 0' }} />
}

// ── STYLE section ──────────────────────────────────────────────────
function StyleSection({ data }) {
  const { profile, looksCount } = data
  const app = APP.ritualwear

  if (!profile?.kibbe_type) return (
    <EmptyPrompt
      appKey="ritualwear"
      text="Your style profile is waiting. Take the Style Bible quiz to unlock your body type, colour season, and the rules that make your wardrobe feel like yours."
      cta="Take the Style Bible quiz"
      href="https://wear.ritualware.app/quiz"
    />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Big identity statement */}
      <div>
        <p style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(32px, 4vw, 54px)', color: CREAM, lineHeight: 1.1 }}>
          {fmt(profile.kibbe_type)}.{' '}
          {profile.color_season && <span style={{ color: app.color }}>{fmt(profile.color_season)} season.</span>}
        </p>
        {profile.undertone && (
          <p style={{ ...sans, fontSize: '14px', color: CREAM_DIM, marginTop: '0.5rem' }}>
            {fmt(profile.undertone)} undertone · {profile.metal && fmt(profile.metal) + ' metals'}{profile.formality && ' · ' + fmt(profile.formality)}
          </p>
        )}
      </div>

      {/* Style words */}
      {profile.style_words?.length > 0 && (
        <div>
          <Label color={app.color}>Style words</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {profile.style_words.map(w => <Tag key={w} color={app.color}>{fmt(w)}</Tag>)}
          </div>
        </div>
      )}

      {/* Palette */}
      {profile.palette?.length > 0 && (
        <div>
          <Label color={app.color}>Palette</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {profile.palette.map(p => <Tag key={p} color={app.color}>{fmt(p)}</Tag>)}
          </div>
        </div>
      )}

      {/* Designer DNA */}
      {profile.designer_dna?.length > 0 && (
        <div>
          <Label color={app.color}>Designer DNA</Label>
          <p style={{ ...sans, fontSize: '15px', color: CREAM_DIM, lineHeight: 1.7 }}>
            {profile.designer_dna.join(', ')}
          </p>
        </div>
      )}

      {/* Fabrics */}
      {profile.fabrics?.length > 0 && (
        <div>
          <Label color={app.color}>Fabrics</Label>
          <p style={{ ...sans, fontSize: '15px', color: CREAM_DIM, lineHeight: 1.7 }}>
            {profile.fabrics.join(' · ')}
          </p>
        </div>
      )}

      {looksCount > 0 && (
        <p style={{ ...mono, fontSize: '11px', color: CREAM_MUTED, letterSpacing: '0.1em' }}>
          {looksCount} look{looksCount !== 1 ? 's' : ''} saved
        </p>
      )}

      <GoDeeper appKey="ritualwear" />
    </div>
  )
}

// ── BEAUTY section ─────────────────────────────────────────────────
function BeautySection({ data }) {
  const { glowUp, styleFinder } = data
  const app = APP.glowup

  if (!glowUp && !styleFinder) return (
    <EmptyPrompt
      appKey="glowup"
      text="Your beauty architecture is unmapped. Run your Glow Up audit to see your tier and find your style archetype."
      cta="Take the Glow Up audit"
      href="https://glowup.ritualware.app/glow-up"
    />
  )

  const tier = glowUp?.result?.overall_tier
  const archetype = styleFinder?.archetype
  const persona = styleFinder?.result?.persona_name

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {tier && (
        <div>
          <Label color={app.color}>Glow tier</Label>
          <p style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(28px, 3.5vw, 46px)', color: CREAM, lineHeight: 1.1, textTransform: 'capitalize' }}>
            {fmt(tier)}.
          </p>
        </div>
      )}

      {archetype && (
        <div>
          <Label color={app.color}>Style archetype</Label>
          <p style={{ ...display, fontSize: '22px', color: app.color, lineHeight: 1.1, textTransform: 'capitalize' }}>{fmt(archetype)}</p>
          {persona && <p style={{ ...sans, fontSize: '14px', color: CREAM_DIM, marginTop: '0.4rem' }}>{persona}</p>}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {!glowUp && <a href="https://glowup.ritualware.app/glow-up" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.15em', color: app.color, textDecoration: 'none' }}>run glow up audit ↗</a>}
        {!styleFinder && <a href="https://glowup.ritualware.app/style-finder" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.15em', color: app.color, textDecoration: 'none' }}>find your archetype ↗</a>}
      </div>

      <GoDeeper appKey="glowup" />
    </div>
  )
}

// ── PLACE section ──────────────────────────────────────────────────
function PlaceSection({ data }) {
  const { neighborhood, burnout } = data
  const app = APP.ritualwhere

  if (!neighborhood) return (
    <EmptyPrompt
      appKey="ritualwhere"
      text="Where do you actually belong? Take the neighborhood quiz to find your city match."
      cta="Take the neighborhood quiz"
      href="https://where.ritualware.app/neighborhood"
    />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <Label color={app.color}>Your neighborhood</Label>
        <p style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(28px, 3.5vw, 46px)', color: CREAM, lineHeight: 1.1, textTransform: 'capitalize' }}>
          {fmt(neighborhood.top_match)}.
        </p>
      </div>

      {burnout?.burnout_type && (
        <div>
          <Label color={app.color}>Burnout type</Label>
          <p style={{ ...display, fontSize: '20px', color: app.color, textTransform: 'capitalize' }}>{fmt(burnout.burnout_type)}</p>
          {burnout.severity != null && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <p style={{ ...mono, fontSize: '10px', color: CREAM_MUTED, letterSpacing: '0.1em' }}>SEVERITY</p>
                <p style={{ ...mono, fontSize: '10px', color: app.color }}>{burnout.severity} / 10</p>
              </div>
              <div style={{ height: '2px', background: `${app.color}20`, borderRadius: '2px', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${burnout.severity * 10}%` }} transition={{ duration: 0.9, ease: 'easeOut' }}
                  style={{ height: '100%', background: app.color, borderRadius: '2px' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {!burnout && <a href="https://where.ritualware.app/burnout" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.15em', color: app.color, textDecoration: 'none' }}>take the burnout audit ↗</a>}

      <GoDeeper appKey="ritualwhere" />
    </div>
  )
}

// ── WEALTH section ─────────────────────────────────────────────────
function WealthSection({ data }) {
  const { firePlan, savings } = data
  const app = APP.ritualwealth

  if (!firePlan) return (
    <EmptyPrompt
      appKey="ritualwealth"
      text="Your number is out there. Take the FIRE quiz to map your path to financial freedom."
      cta="Take the FIRE quiz"
      href="https://wealth.ritualware.app/quiz/fire_type"
    />
  )

  const totalSaved  = savings.reduce((s, b) => s + (parseFloat(b.current) || 0), 0)
  const totalTarget = savings.reduce((s, b) => s + (parseFloat(b.target)  || 0), 0)
  const pct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <Label color={app.color}>FIRE type</Label>
        <p style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(28px, 3.5vw, 46px)', color: CREAM, lineHeight: 1.1, textTransform: 'capitalize' }}>
          {fmt(firePlan.fire_type)}.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
        {firePlan.target_number && (
          <div>
            <Label color={app.color}>Target number</Label>
            <p style={{ ...display, fontSize: '24px', color: app.color }}>
              ${Number(firePlan.target_number).toLocaleString()}
            </p>
          </div>
        )}
        {firePlan.target_age && (
          <div>
            <Label color={app.color}>Target age</Label>
            <p style={{ ...display, fontSize: '24px', color: CREAM }}>{firePlan.target_age}</p>
          </div>
        )}
      </div>

      {pct != null && savings.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <Label color={app.color}>Savings progress</Label>
            <p style={{ ...mono, fontSize: '10px', color: app.color, letterSpacing: '0.1em' }}>{Math.round(pct)}%</p>
          </div>
          <div style={{ height: '3px', background: `${app.color}20`, borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }}
              style={{ height: '100%', background: app.color, borderRadius: '2px' }} />
          </div>
          {savings.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {savings.slice(0, 4).map(b => (
                <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ ...sans, fontSize: '13px', color: CREAM_DIM, textTransform: 'capitalize' }}>{fmt(b.name)}</p>
                  <p style={{ ...mono, fontSize: '11px', color: app.color }}>
                    ${Number(b.current || 0).toLocaleString()} <span style={{ color: CREAM_MUTED }}>/ ${Number(b.target || 0).toLocaleString()}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <GoDeeper appKey="ritualwealth" />
    </div>
  )
}

// ── STUDIO section ─────────────────────────────────────────────────
function StudioSection({ data }) {
  const { projects, goals } = data
  const app = APP.matelier

  if (!projects.length && !goals.length) return (
    <EmptyPrompt
      appKey="matelier"
      text="Your creative life needs a home. Add a project in m'atelier to start tracking what you're building."
      cta="Open m'atelier"
      href="https://studio.ritualware.app"
    />
  )

  const openGoals = goals.filter(g => !g.is_complete)
  const doneGoals = goals.filter(g => g.is_complete)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {projects.length > 0 && (
        <div>
          <Label color={app.color}>Active projects</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {projects.map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: app.color, flexShrink: 0 }} />
                <p style={{ ...sans, fontSize: '15px', color: CREAM, textTransform: 'capitalize' }}>{fmt(p.name)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length > 0 && (
        <div>
          <Label color={app.color}>Goals</Label>
          <p style={{ ...serif, fontStyle: 'italic', fontSize: '22px', color: CREAM, lineHeight: 1.2 }}>
            {doneGoals.length} of {goals.length} complete.
            {openGoals.length > 0 && <span style={{ color: app.color }}> {openGoals.length} still becoming.</span>}
          </p>
        </div>
      )}

      <GoDeeper appKey="matelier" />
    </div>
  )
}

// ── Portal nav dots ────────────────────────────────────────────────
function AppNav() {
  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {Object.entries(APP).map(([key, app]) => (
        <a key={key} href={app.url} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', opacity: 0.6, transition: 'opacity 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: app.color }} />
          <span style={{ ...mono, fontSize: '10px', letterSpacing: '0.15em', color: CREAM }}>{app.label}</span>
        </a>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function UserDashboard({ user, onExitPreview = null }) {
  const [modules, setModules]       = useState(null)
  const [moduleData, setModuleData] = useState(null)
  const [loading, setLoading]       = useState(true)

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

  const retakeQuiz = async () => {
    await supabase.from('robin_dashboard_config').delete().eq('user_id', user.id)
    await supabase.from('robin_quiz_results').delete().eq('user_id', user.id)
    setModules(null)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: ROBIN_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ ...mono, fontSize: '11px', letterSpacing: '0.25em', color: CREAM_MUTED }}>loading your profile…</p>
    </main>
  )

  if (!modules) return <DoTheDash user={user} onComplete={mods => setModules(mods)} />

  const d = moduleData || {}
  const name = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'you'

  return (
    <main style={{ minHeight: '100vh', background: ROBIN_BG, color: CREAM }}>

      {/* ── TOP NAV ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: `${ROBIN_BG}E8`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${ROBIN_WARM}18`, padding: '0.85rem clamp(1.5rem, 4vw, 3.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.3em', color: ROBIN_WARM }}>ROBIN</p>
          {onExitPreview && (
            <button onClick={onExitPreview}
              style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em', color: CREAM_MUTED, background: 'none', border: `1px solid ${ROBIN_WARM}30`, borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}>
              back to admin
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ThemeDropdown />
          <button onClick={() => supabase.auth.signOut()}
            style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: CREAM_MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>
            sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(3rem, 6vw, 6rem) clamp(1.5rem, 4vw, 3.5rem) 8rem' }}>

        {/* ── HERO ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16,1,0.3,1] }}
          style={{ marginBottom: '4rem' }}>
          <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.3em', color: CREAM_MUTED, marginBottom: '1.5rem' }}>
            YOUR RITUAL PROFILE
          </p>
          <h1 style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(48px, 7vw, 96px)', lineHeight: 0.95, color: CREAM, marginBottom: '1rem' }}>
            Who is<br /><span style={{ color: ROBIN_WARM }}>{name}</span><br />becoming?
          </h1>
          <div style={{ marginTop: '2.5rem' }}>
            <AppNav />
          </div>
        </motion.div>

        {/* ── RULE ── */}
        <div style={{ height: '1px', background: `${ROBIN_WARM}20`, marginBottom: '4rem' }} />

        {/* ── SECTIONS ── */}
        {[
          { key: 'ritualwear',   label: 'Style',   Section: StyleSection },
          { key: 'glowup',       label: 'Beauty',  Section: BeautySection },
          { key: 'ritualwhere',  label: 'Place',   Section: PlaceSection },
          { key: 'ritualwealth', label: 'Wealth',  Section: WealthSection },
          { key: 'matelier',     label: 'Studio',  Section: StudioSection },
        ].map(({ key, label, Section }, i) => (
          <motion.div key={key}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
            style={{ marginBottom: '4rem' }}>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '2rem' }}>
              <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: APP[key].color, opacity: 0.7, width: '60px', flexShrink: 0 }}>
                {APP[key].sub}
              </p>
              <h2 style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(26px, 3vw, 38px)', color: CREAM, lineHeight: 1 }}>
                {label}
              </h2>
            </div>

            <div style={{ paddingLeft: '76px' }}>
              <Section data={d[key] ?? {}} />
            </div>

            {i < 4 && <SectionRule color={ROBIN_WARM} />}
          </motion.div>
        ))}

        {/* ── FOOTER ── */}
        <div style={{ borderTop: `1px solid ${ROBIN_WARM}15`, paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button onClick={retakeQuiz}
            style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: CREAM_MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>
            retake do the dash
          </button>
          <p style={{ ...mono, fontSize: '10px', color: CREAM_MUTED, letterSpacing: '0.08em', opacity: 0.4 }}>
            robin · ritualware suite
          </p>
        </div>

      </div>
    </main>
  )
}
