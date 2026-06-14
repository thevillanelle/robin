import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'ADMIN_EMAIL_REDACTED'
const MIN_COHORT  = 50

function Stat({ label, value, sub }) {
  return (
    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B7E72', marginBottom: '0.5rem' }}>{label}</p>
      <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '2rem', color: '#FAF7F2', lineHeight: 1 }}>{value ?? '—'}</p>
      {sub && <p style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#8B7E72', marginTop: '0.4rem' }}>{sub}</p>}
    </div>
  )
}

function SmallCohort() {
  return (
    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#3a3028', fontStyle: 'italic' }}>
      cohort &lt; {MIN_COHORT} — suppressed
    </p>
  )
}

function BarChart({ data }) {
  if (!data?.length) return <SmallCohort />
  const max = Math.max(...data.map(d => d.n))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 40px', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.75rem', color: '#C8BFB0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {fmt(d.value ?? d.archetype ?? d.tier)}
          </span>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.n / max) * 100}%`, background: 'linear-gradient(90deg, #C4717A, #A89BC4)', borderRadius: '2px' }} />
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#8B7E72', textAlign: 'right' }}>{d.n}</span>
        </div>
      ))}
    </div>
  )
}

function GrowthChart({ data }) {
  if (!data?.length) return <SmallCohort />
  const max = Math.max(...data.map(d => d.n), 1)
  const h = 80, w = 100
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * w
    const y = h - (d.n / max) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <div>
      <svg viewBox={`0 0 100 ${h}`} style={{ width: '100%', height: '80px' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C4717A" />
            <stop offset="100%" stopColor="#A89BC4" />
          </linearGradient>
        </defs>
        <polyline points={pts} fill="none" stroke="url(#g)" strokeWidth="1.5" />
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * w
          const y = h - (d.n / max) * h
          return <circle key={i} cx={x} cy={y} r="1.5" fill="#C4717A" />
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: '#5a5048' }}>{data[0]?.week}</span>
        <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: '#5a5048' }}>{data[data.length - 1]?.week}</span>
      </div>
    </div>
  )
}

function Panel({ title, children, span = 1 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      style={{
        gridColumn: `span ${span}`,
        padding: '1.75rem',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '1rem',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4717A', marginBottom: '1.25rem' }}>{title}</p>
      {children}
    </motion.div>
  )
}

const fmt = (s) => s ? String(s).replace(/_/g, ' ') : '—'

export default function Robin() {
  const { user, loading: authLoading, signInWithGoogle, initialize } = useAuthStore()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => { initialize() }, [])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [overview, kibbe, season, trend, heel, era, fragrance, jewelry, glow, archetypes, neighborhoods, growth] = await Promise.all([
        supabase.rpc('robin_overview'),
        supabase.rpc('robin_distribution',       { col_name: 'kibbe_type' }),
        supabase.rpc('robin_distribution',       { col_name: 'color_season' }),
        supabase.rpc('robin_distribution',       { col_name: 'trend_stance' }),
        supabase.rpc('robin_distribution',       { col_name: 'heel_preference' }),
        supabase.rpc('robin_array_distribution', { col_name: 'era_references' }),
        supabase.rpc('robin_array_distribution', { col_name: 'fragrance_family' }),
        supabase.rpc('robin_distribution',       { col_name: 'jewelry_default' }),
        supabase.rpc('robin_glow_tiers'),
        supabase.rpc('robin_archetypes'),
        supabase.rpc('robin_neighborhoods'),
        supabase.rpc('robin_growth'),
      ])
      if (overview.data?.error === 'unauthorized') {
        setError('unauthorized')
        setLoading(false)
        return
      }
      setData({
        overview:      overview.data,
        kibbe:         kibbe.data,
        season:        season.data,
        trend:         trend.data,
        heel:          heel.data,
        era:           era.data,
        fragrance:     fragrance.data,
        jewelry:       jewelry.data,
        glowTiers:     glow.data,
        archetypes:    archetypes.data,
        neighborhoods: neighborhoods.data,
        growth:        growth.data,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Gates ──────────────────────────────────────────────────
  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#0D0F0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#3a3028', letterSpacing: '0.15em' }}>…</p>
    </div>
  )

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0D0F0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: '#C4717A', marginBottom: '0.75rem' }}>ROBIN // INTERNAL</p>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '2.5rem', fontWeight: 400, color: '#FAF7F2', marginBottom: '2rem' }}>
          The suite, <em style={{ color: '#C4717A' }}>in aggregate.</em>
        </h1>
        <button onClick={signInWithGoogle}
          style={{ fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.15em', color: '#FAF7F2', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 2.5rem', borderRadius: '4px', cursor: 'pointer' }}>
          sign in
        </button>
      </div>
    </div>
  )

  if (error === 'unauthorized' || user.email !== ADMIN_EMAIL) return (
    <div style={{ minHeight: '100vh', background: '#0D0F0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#5a5048' }}>access denied</p>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0F0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#5a5048', letterSpacing: '0.1em' }}>loading robin…</p>
    </div>
  )

  const ov = data?.overview ?? {}

  return (
    <main style={{ minHeight: '100vh', background: '#0D0F0E', color: '#FAF7F2', padding: 'clamp(3rem,6vw,5rem) clamp(1rem,4vw,3rem)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.5rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: '#C4717A' }}>ROBIN</p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.15em', color: '#3a3028' }}>INTERNAL ANALYTICS // MIN COHORT {MIN_COHORT}</p>
          </div>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 400, color: '#FAF7F2', lineHeight: 1.1 }}>
            The suite, <span style={{ fontStyle: 'italic', color: '#C4717A' }}>in aggregate.</span>
          </h1>
        </motion.div>

        {/* Overview stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
          <Stat label="Total users"           value={ov.total_users} />
          <Stat label="Style Bible complete"  value={ov.with_style_profile}
            sub={ov.total_users ? `${Math.round((ov.with_style_profile / ov.total_users) * 100)}% completion` : null} />
          <Stat label="Glow Up results"       value={ov.with_glow_up} />
          <Stat label="Style Finder results"  value={ov.with_style_finder} />
          <Stat label="Neighborhood results"  value={ov.with_neighborhood} />
          <Stat label="Narratives generated"  value={ov.with_narrative} />
          <Stat label="Avg formality"         value={ov.avg_lifestyle_formality} sub="/ 5" />
          <Stat label="Oracle looks saved"    value={ov.total_saved_looks} />
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.75rem' }}>

          <div style={{ gridColumn: 'span 12' }}>
            <Panel title="Growth // last 12 weeks">
              <GrowthChart data={data?.growth} />
            </Panel>
          </div>

          <div style={{ gridColumn: 'span 6' }}>
            <Panel title="Kibbe type"><BarChart data={data?.kibbe} /></Panel>
          </div>
          <div style={{ gridColumn: 'span 6' }}>
            <Panel title="Color season"><BarChart data={data?.season} /></Panel>
          </div>

          <div style={{ gridColumn: 'span 6' }}>
            <Panel title="Trend stance"><BarChart data={data?.trend} /></Panel>
          </div>
          <div style={{ gridColumn: 'span 6' }}>
            <Panel title="Heel preference"><BarChart data={data?.heel} /></Panel>
          </div>

          <div style={{ gridColumn: 'span 6' }}>
            <Panel title="Era references"><BarChart data={data?.era} /></Panel>
          </div>
          <div style={{ gridColumn: 'span 6' }}>
            <Panel title="Fragrance family"><BarChart data={data?.fragrance} /></Panel>
          </div>

          <div style={{ gridColumn: 'span 4' }}>
            <Panel title="Jewelry default"><BarChart data={data?.jewelry} /></Panel>
          </div>
          <div style={{ gridColumn: 'span 4' }}>
            <Panel title="Glow Up tier"><BarChart data={data?.glowTiers} /></Panel>
          </div>
          <div style={{ gridColumn: 'span 4' }}>
            <Panel title="Style archetypes"><BarChart data={data?.archetypes} /></Panel>
          </div>

          <div style={{ gridColumn: 'span 12' }}>
            <Panel title="Top neighborhoods"><BarChart data={data?.neighborhoods} /></Panel>
          </div>

        </div>

        {/* Footer */}
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: '#3a3028', letterSpacing: '0.1em' }}>
            All insights suppressed below cohort {MIN_COHORT} · No individual data exposed
          </p>
          <button onClick={() => useAuthStore.getState().signOut()}
            style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: '#3a3028', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em' }}>
            sign out
          </button>
        </div>

      </div>
    </main>
  )
}
