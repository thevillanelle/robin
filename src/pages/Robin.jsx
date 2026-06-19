import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'ADMIN_EMAIL_REDACTED'
const MIN_COHORT  = 50

const SERVICES = [
  { name: 'Ritualware',   sub: 'marketing',  url: 'https://ritualware.app/health.json',          route: null },
  { name: 'Ritualwear',   sub: 'oracle',      url: 'https://wear.ritualware.app/health.json',    route: null },
  { name: 'Glow Up',      sub: 'pyramid',     url: 'https://glowup.ritualware.app/health.json',  route: null },
  { name: 'Ritualwhere?', sub: 'map',         url: 'https://where.ritualware.app/health.json',   route: null },
  { name: "m'atelier",    sub: 'studio',      url: 'https://studio.ritualware.app/health.json',  route: null },
  { name: 'Ritualwealth', sub: 'fire',        url: 'https://wealth.ritualware.app/health.json',  route: '/app/wealth' },
]

const LOG_LIMIT = 60

async function checkService(svc) {
  const t0 = performance.now()
  try {
    const res = await fetch(svc.url, { cache: 'no-store' })
    const ms = Math.round(performance.now() - t0)
    if (!res.ok) return { ...svc, status: 'down', ms, code: res.status }
    const json = await res.json()
    return { ...svc, status: json.status === 'ok' ? 'up' : 'degraded', ms }
  } catch {
    const ms = Math.round(performance.now() - t0)
    return { ...svc, status: 'down', ms, code: 'ERR' }
  }
}

// ── Glow dot ────────────────────────────────────────────────────

function GlowDot({ status }) {
  const cfg = {
    up:       { color: '#6AAD8A', shadow: '0 0 5px 2px rgba(106,173,138,0.7), 0 0 14px 5px rgba(106,173,138,0.25)' },
    degraded: { color: '#C4A85A', shadow: '0 0 5px 2px rgba(196,168,90,0.7),  0 0 14px 5px rgba(196,168,90,0.25)' },
    down:     { color: '#C4717A', shadow: '0 0 5px 2px rgba(196,113,122,0.7), 0 0 14px 5px rgba(196,113,122,0.25)' },
    loading:  { color: '#2a2018', shadow: 'none' },
  }[status] ?? { color: '#2a2018', shadow: 'none' }

  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: cfg.color,
      boxShadow: cfg.shadow,
      transition: 'background 0.6s ease, box-shadow 0.6s ease',
    }} />
  )
}

// ── Service tile ────────────────────────────────────────────────

function ServiceTile({ svc, i, clickable }) {
  const statusLabel = { up: 'operational', down: 'down', degraded: 'degraded', loading: 'checking…' }[svc.status] ?? 'checking…'
  const statusColor = { up: '#6AAD8A', down: '#C4717A', degraded: '#C4A85A', loading: '#2a2018' }[svc.status] ?? '#2a2018'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
      style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(255,255,255,0.025)',
        borderRadius: '0.75rem',
        border: `1px solid ${svc.status === 'down' ? 'rgba(196,113,122,0.25)' : 'rgba(255,255,255,0.06)'}`,
        display: 'flex', flexDirection: 'column', gap: '0.6rem',
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5a5048' }}>
          {svc.sub}
        </p>
        <GlowDot status={svc.status} />
      </div>
      <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.1rem', color: '#FAF7F2', lineHeight: 1 }}>
        {svc.name}{clickable && <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: '#5a5048', marginLeft: '0.4rem' }}>↗</span>}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: statusColor, letterSpacing: '0.1em' }}>
          {statusLabel}
        </p>
        {svc.ms != null && (
          <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: '#3a3028' }}>
            {svc.ms}ms
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ── Ticker ──────────────────────────────────────────────────────

function Ticker({ services, totalUsers, newToday }) {
  const liveServices = services.filter(s => s.status !== 'loading')
  const incidents    = liveServices.filter(s => s.status !== 'up')

  const items = [
    totalUsers != null   && `${totalUsers.toLocaleString()} total users`,
    newToday != null     && `+${newToday} new today`,
    ...liveServices.map(s => `${s.name}  ${s.ms != null ? s.ms + 'ms' : '—'}`),
    ...incidents.map(s => `⚠  ${s.name.toUpperCase()} ${s.status}${s.code ? ' [' + s.code + ']' : ''}`),
  ].filter(Boolean)

  if (!items.length) return null

  // duplicate so the loop is seamless
  const band = [...items, ...items, ...items]

  return (
    <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.55rem 0', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', gap: '4rem', whiteSpace: 'nowrap', animation: 'ticker-scroll 40s linear infinite' }}>
        {band.map((item, i) => (
          <span key={i} style={{
            fontFamily: 'monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.12em',
            color: item.startsWith('⚠') ? '#C4717A' : '#4a4038',
          }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Error log ───────────────────────────────────────────────────

function ErrorLog({ entries }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [entries.length])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        marginTop: '0.75rem',
        padding: '1.25rem 1.5rem',
        background: 'rgba(0,0,0,0.35)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4717A', marginBottom: '0.85rem' }}>
        event log
      </p>
      <div
        ref={ref}
        style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}
      >
        {entries.length === 0 ? (
          <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: '#2a2018' }}>no events yet</p>
        ) : entries.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: '#3a3028', flexShrink: 0 }}>{e.ts}</span>
            <span style={{
              fontFamily: 'monospace', fontSize: '0.6rem',
              color: e.type === 'error' ? '#C4717A' : e.type === 'recovery' ? '#6AAD8A' : '#5a5048',
            }}>
              {e.message}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── System panel ────────────────────────────────────────────────

function SystemPanel({ services, checkedAt, onRefresh, refreshing, errorLog, clock }) {
  const allUp   = services.length > 0 && services.every(s => s.status === 'up')
  const anyDown = services.some(s => s.status === 'down')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        marginBottom: '0',
        padding: '2rem',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '1rem',
        border: anyDown ? '1px solid rgba(196,113,122,0.3)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4717A', marginBottom: '0.4rem' }}>
            system status // live
          </p>
          <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.4rem', fontWeight: 400, color: '#FAF7F2', fontStyle: 'italic' }}>
            {refreshing ? 'checking…' : allUp ? 'All systems operational.' : anyDown ? 'Degraded. See below.' : 'Initializing…'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
          {clock && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#FAF7F2', letterSpacing: '0.08em' }}>{clock}</p>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.15em',
              color: refreshing ? '#3a3028' : '#8B7E72',
              background: 'none', border: '1px solid rgba(255,255,255,0.1)',
              padding: '0.4rem 1rem', borderRadius: '4px', cursor: refreshing ? 'default' : 'pointer',
            }}
          >
            {refreshing ? '…' : 'refresh'}
          </button>
          {checkedAt && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: '#3a3028' }}>
              last checked {checkedAt}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        {services.map((svc, i) =>
          svc.route
            ? <Link key={svc.url} to={svc.route} style={{ textDecoration: 'none' }}><ServiceTile svc={svc} i={i} clickable /></Link>
            : <ServiceTile key={svc.url} svc={svc} i={i} />
        )}
      </div>

      <ErrorLog entries={errorLog} />
    </motion.div>
  )
}

// ── Analytics components ────────────────────────────────────────

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

function logEntry(type, message) {
  return {
    ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type,
    message,
  }
}

// ── Main ────────────────────────────────────────────────────────

export default function Robin() {
  const { user, loading: authLoading, signInWithGoogle, initialize } = useAuthStore()
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [newToday, setNewToday]   = useState(null)

  // system health state
  const [services, setServices]   = useState(SERVICES.map(s => ({ ...s, status: 'loading', ms: null })))
  const [checkedAt, setCheckedAt] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [errorLog, setErrorLog]   = useState([])
  const [clock, setClock]         = useState('')
  const prevStatuses              = useRef({})
  const intervalRef               = useRef(null)

  useEffect(() => { initialize() }, [])

  // live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleString([], {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const runHealthChecks = useCallback(async () => {
    setRefreshing(true)
    const results = await Promise.all(SERVICES.map(checkService))
    const prev = prevStatuses.current
    const newEntries = []

    results.forEach(r => {
      const was = prev[r.url]
      if (r.status !== 'up' && was !== r.status) {
        newEntries.push(logEntry('error', `${r.name} — ${r.status}${r.code ? ' [' + r.code + ']' : ''} (${r.ms}ms)`))
      } else if (r.status === 'up' && was && was !== 'up' && was !== 'loading') {
        newEntries.push(logEntry('recovery', `${r.name} — recovered (${r.ms}ms)`))
      }
      prev[r.url] = r.status
    })

    setServices(results)
    setCheckedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    if (newEntries.length) {
      setErrorLog(log => [...newEntries, ...log].slice(0, LOG_LIMIT))
    } else if (Object.keys(prev).length === SERVICES.length) {
      setErrorLog(log => [logEntry('info', `health check passed — all ${results.filter(r => r.status === 'up').length}/${SERVICES.length} services up`), ...log].slice(0, LOG_LIMIT))
    }
    setRefreshing(false)
  }, [])

  useEffect(() => {
    if (!user) return
    runHealthChecks()
    intervalRef.current = setInterval(runHealthChecks, 5 * 60 * 1000)
    return () => clearInterval(intervalRef.current)
  }, [user, runHealthChecks])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const [overview, kibbe, season, trend, heel, era, fragrance, jewelry, glow, archetypes, neighborhoods, growth, todayCount] = await Promise.all([
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
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today),
      ])
      if (overview.data?.error === 'unauthorized') {
        setError('unauthorized')
        setLoading(false)
        return
      }
      setNewToday(todayCount.count ?? 0)
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
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
      `}</style>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.5rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: '#C4717A' }}>ROBIN</p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.15em', color: '#3a3028' }}>INTERNAL ANALYTICS // MIN COHORT {MIN_COHORT}</p>
          </div>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 400, color: '#FAF7F2', lineHeight: 1.1 }}>
            The suite, <span style={{ fontStyle: 'italic', color: '#C4717A' }}>in aggregate.</span>
          </h1>
        </motion.div>

        {/* Ticker */}
        <Ticker services={services} totalUsers={ov.total_users} newToday={newToday} />

        {/* System Status */}
        <div style={{ marginBottom: '2rem' }}>
          <SystemPanel
            services={services}
            checkedAt={checkedAt}
            onRefresh={runHealthChecks}
            refreshing={refreshing}
            errorLog={errorLog}
            clock={clock}
          />
        </div>

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
