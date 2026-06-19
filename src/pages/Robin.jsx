import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../lib/supabase'
import ThemeDropdown from '../components/ThemeDropdown'

const ADMIN_EMAIL = 'krystine.hall@gmail.com'
const MIN_COHORT  = 50

const SERVICES = [
  { name: 'Ritualware',   sub: 'marketing',  url: 'https://ritualware.app/health.json',          route: null },
  { name: 'Ritualwear',   sub: 'oracle',      url: 'https://wear.ritualware.app/health.json',    route: '/app/wear' },
  { name: 'Glow Up',      sub: 'pyramid',     url: 'https://glowup.ritualware.app/health.json',  route: '/app/glowup' },
  { name: 'Ritualwhere?', sub: 'map',         url: 'https://where.ritualware.app/health.json',   route: '/app/where' },
  { name: "m'atelier",    sub: 'studio',      url: 'https://studio.ritualware.app/health.json',  route: '/app/atelier' },
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
    up:       { color: 'var(--c-up)', shadow: '0 0 5px 2px rgba(106,173,138,0.7), 0 0 14px 5px rgba(106,173,138,0.25)' },
    degraded: { color: 'var(--c-amber)', shadow: '0 0 5px 2px rgba(196,168,90,0.7),  0 0 14px 5px rgba(196,168,90,0.25)' },
    down:     { color: 'var(--c-accent)', shadow: '0 0 5px 2px rgba(196,113,122,0.7), 0 0 14px 5px var(--c-accent-border)' },
    loading:  { color: 'var(--c-surface-4)', shadow: 'none' },
  }[status] ?? { color: 'var(--c-surface-4)', shadow: 'none' }

  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: cfg.color,
      boxShadow: cfg.shadow,
      transition: 'background 0.6s ease, box-shadow 0.6s ease',
    }} />
  )
}

// ── Response sparkline ───────────────────────────────────────────

function MiniSparkline({ history }) {
  if (!history?.length) return null
  const max = Math.max(...history, 1)
  const w = 80, h = 24
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1 || 1)) * w
    const y = h - (v / max) * (h - 2)
    return `${x},${y}`
  }).join(' ')
  const lastMs = history[history.length - 1]
  const color = lastMs < 300 ? 'var(--c-up)' : lastMs < 800 ? 'var(--c-amber)' : 'var(--c-accent)'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '80px', height: '24px', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" opacity="0.7" />
      {history.map((v, i) => {
        const x = (i / (history.length - 1 || 1)) * w
        const y = h - (v / max) * (h - 2)
        return <circle key={i} cx={x} cy={y} r={i === history.length - 1 ? 2 : 1} fill={color} />
      })}
    </svg>
  )
}

// ── Service tile ────────────────────────────────────────────────

function ServiceTile({ svc, i, selected, onSelect, history }) {
  const navigate = useNavigate()
  const statusLabel = { up: 'operational', down: 'down', degraded: 'degraded', loading: 'checking…' }[svc.status] ?? 'checking…'
  const statusColor = { up: 'var(--c-up)', down: 'var(--c-accent)', degraded: 'var(--c-amber)', loading: 'var(--c-surface-4)' }[svc.status] ?? 'var(--c-surface-4)'

  const handleClick = () => {
    if (selected && svc.route) {
      navigate(svc.route)
    } else {
      onSelect(svc)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
      onClick={handleClick}
      style={{
        padding: '1.25rem 1.5rem',
        background: selected ? 'var(--c-surface-3)' : 'var(--c-surface-1)',
        borderRadius: '0.75rem',
        border: `1px solid ${svc.status === 'down' ? 'var(--c-accent-border)' : selected ? 'var(--c-accent-border-strong, var(--c-border-4, var(--c-border-3)))' : 'var(--c-border-1)'}`,
        display: 'flex', flexDirection: 'column', gap: '0.6rem',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--c-muted)' }}>
          {svc.sub}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {selected && svc.route && (
            <span style={{ fontFamily: 'monospace', fontSize: '0.48rem', color: 'var(--c-accent)', letterSpacing: '0.1em' }}>tap to open ↗</span>
          )}
          <GlowDot status={svc.status} />
        </div>
      </div>
      <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.1rem', color: 'var(--c-fg)', lineHeight: 1 }}>
        {svc.name}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: statusColor, letterSpacing: '0.1em' }}>
            {statusLabel}
          </p>
          {svc.ms != null && (
            <motion.p
              key={svc.ms}
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: 'var(--c-dim)' }}
            >
              {svc.ms}ms
            </motion.p>
          )}
        </div>
        {selected && history?.length > 1 && <MiniSparkline history={history} />}
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
            color: item.startsWith('⚠') ? 'var(--c-accent)' : '#4a4038',
          }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Event log panel ──────────────────────────────────────────────

function EventLog({ entries, selectedSvc }) {
  const ref = useRef(null)
  const filtered = selectedSvc
    ? entries.filter(e => e.message.includes(selectedSvc.name))
    : entries

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [selectedSvc?.name, entries.length])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        marginTop: '0.75rem',
        padding: '1.25rem 1.5rem',
        background: 'var(--c-input-bg)',
        borderRadius: '0.75rem',
        border: '1px solid var(--c-border-1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--c-accent)' }}>
          {selectedSvc ? `${selectedSvc.name} // events` : 'event log'}
        </p>
        {selectedSvc && (
          <p style={{ fontFamily: 'monospace', fontSize: '0.48rem', color: 'var(--c-dim)', letterSpacing: '0.1em' }}>
            tap tile again to open dashboard
          </p>
        )}
      </div>
      <div
        ref={ref}
        style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}
      >
        {filtered.length === 0 ? (
          <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'var(--c-surface-4)' }}>
            {selectedSvc ? `no events recorded for ${selectedSvc.name} this session` : 'no events yet'}
          </p>
        ) : filtered.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: 'var(--c-dim)', flexShrink: 0 }}>{e.ts}</span>
            <span style={{
              fontFamily: 'monospace', fontSize: '0.6rem',
              color: e.type === 'error' ? 'var(--c-accent)' : e.type === 'recovery' ? 'var(--c-up)' : 'var(--c-muted)',
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

function SystemPanel({ services, checkedAt, onRefresh, refreshing, errorLog, clock, msHistory, selectedSvc, onSelectSvc }) {
  const allUp   = services.length > 0 && services.every(s => s.status === 'up')
  const anyDown = services.some(s => s.status === 'down')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        marginBottom: '0',
        padding: '2rem',
        background: 'var(--c-surface-1)',
        borderRadius: '1rem',
        border: anyDown ? '1px solid var(--c-accent-border)' : '1px solid var(--c-border-1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--c-accent)', marginBottom: '0.4rem' }}>
            system status // live
          </p>
          <motion.p
            key={refreshing ? 'checking' : allUp ? 'up' : anyDown ? 'down' : 'init'}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.4rem', fontWeight: 400, color: 'var(--c-fg)', fontStyle: 'italic' }}
          >
            {refreshing ? 'checking…' : allUp ? 'All systems operational.' : anyDown ? 'Degraded. See below.' : 'Initializing…'}
          </motion.p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
          {clock && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--c-fg)', letterSpacing: '0.08em' }}>{clock}</p>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.15em',
              color: refreshing ? 'var(--c-dim)' : 'var(--c-muted2)',
              background: 'none', border: '1px solid var(--c-border-3)',
              padding: '0.4rem 1rem', borderRadius: '4px', cursor: refreshing ? 'default' : 'pointer',
            }}
          >
            {refreshing ? '…' : 'refresh'}
          </button>
          {checkedAt && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: 'var(--c-dim)' }}>
              last checked {checkedAt}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {services.map((svc, i) => (
          <ServiceTile
            key={svc.url}
            svc={svc}
            i={i}
            selected={selectedSvc?.url === svc.url}
            onSelect={onSelectSvc}
            history={msHistory?.[svc.url] ?? []}
          />
        ))}
      </div>

      <EventLog entries={errorLog} selectedSvc={selectedSvc} />
    </motion.div>
  )
}

// ── Analytics components ────────────────────────────────────────

function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (target == null || isNaN(target)) return
    const start = Date.now()
    const from = 0
    const to = Number(target)
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * ease))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return display
}

function Stat({ label, value, sub }) {
  const isNum = value != null && !isNaN(Number(value))
  const counted = useCountUp(isNum ? Number(value) : 0)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      style={{ padding: '1.5rem', background: 'var(--c-surface-3)', borderRadius: '0.75rem', border: '1px solid var(--c-border-3)' }}
    >
      <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--c-muted2)', marginBottom: '0.5rem' }}>{label}</p>
      <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '2rem', color: 'var(--c-fg)', lineHeight: 1 }}>
        {value == null ? '—' : isNum ? counted.toLocaleString() : value}
      </p>
      {sub && <p style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--c-muted2)', marginTop: '0.4rem' }}>{sub}</p>}
    </motion.div>
  )
}

function SmallCohort() {
  return (
    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--c-dim)', fontStyle: 'italic' }}>
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
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.04 }}
          style={{ display: 'grid', gridTemplateColumns: '140px 1fr 40px', gap: '0.75rem', alignItems: 'center' }}
        >
          <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.75rem', color: 'var(--c-body-text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {fmt(d.value ?? d.archetype ?? d.tier)}
          </span>
          <div style={{ height: '4px', background: 'var(--c-border-1)', borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${(d.n / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 + 0.1, duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, var(--c-accent), var(--c-purple))', borderRadius: '2px' }}
            />
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--c-muted2)', textAlign: 'right' }}>{d.n}</span>
        </motion.div>
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
        <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: 'var(--c-muted)' }}>{data[0]?.week}</span>
        <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: 'var(--c-muted)' }}>{data[data.length - 1]?.week}</span>
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
        background: 'var(--c-surface-2)',
        borderRadius: '1rem',
        border: '1px solid var(--c-border-2)',
      }}
    >
      <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--c-accent)', marginBottom: '1.25rem' }}>{title}</p>
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
  const [msHistory, setMsHistory] = useState({})
  const [selectedSvc, setSelectedSvc] = useState(null)
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
    setMsHistory(prev => {
      const next = { ...prev }
      results.forEach(r => {
        if (r.ms != null) {
          const arr = prev[r.url] ?? []
          next[r.url] = [...arr, r.ms].slice(-12)
        }
      })
      return next
    })
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
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--c-dim)', letterSpacing: '0.15em' }}>…</p>
    </div>
  )

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--c-accent)', marginBottom: '0.75rem' }}>ROBIN // INTERNAL</p>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '2.5rem', fontWeight: 400, color: 'var(--c-fg)', marginBottom: '2rem' }}>
          The suite, <em style={{ color: 'var(--c-accent)' }}>in aggregate.</em>
        </h1>
        <button onClick={signInWithGoogle}
          style={{ fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--c-fg)', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 2.5rem', borderRadius: '4px', cursor: 'pointer' }}>
          sign in
        </button>
      </div>
    </div>
  )

  if (error === 'unauthorized' || user.email !== ADMIN_EMAIL) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--c-muted)' }}>access denied</p>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--c-muted)', letterSpacing: '0.1em' }}>loading robin…</p>
    </div>
  )

  const ov = data?.overview ?? {}

  return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-fg)', padding: 'clamp(3rem,6vw,5rem) clamp(1rem,4vw,3rem)' }}>
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
      `}</style>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--c-accent)' }}>ROBIN</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--c-dim)' }}>INTERNAL ANALYTICS // MIN COHORT {MIN_COHORT}</p>
            </div>
            <ThemeDropdown />
          </div>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 400, color: 'var(--c-fg)', lineHeight: 1.1 }}>
            The suite, <span style={{ fontStyle: 'italic', color: 'var(--c-accent)' }}>in aggregate.</span>
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
            msHistory={msHistory}
            selectedSvc={selectedSvc}
            onSelectSvc={svc => setSelectedSvc(prev => prev?.url === svc.url ? null : svc)}
          />
        </div>

        {/* Platform Analytics header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}
        >
          <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--c-accent)', marginBottom: '0.35rem' }}>
            Platform Analytics
          </p>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(18px,2.5vw,28px)', fontWeight: 400, color: 'var(--c-fg)', lineHeight: 1.1 }}>
            The suite, <em style={{ color: 'var(--c-accent)' }}>in numbers.</em>
          </h2>
        </motion.div>

        {/* Overview stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          <Panel title="Growth // last 12 weeks">
            <GrowthChart data={data?.growth} />
          </Panel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <Panel title="Kibbe type"><BarChart data={data?.kibbe} /></Panel>
            <Panel title="Color season"><BarChart data={data?.season} /></Panel>
            <Panel title="Trend stance"><BarChart data={data?.trend} /></Panel>
            <Panel title="Heel preference"><BarChart data={data?.heel} /></Panel>
            <Panel title="Era references"><BarChart data={data?.era} /></Panel>
            <Panel title="Fragrance family"><BarChart data={data?.fragrance} /></Panel>
            <Panel title="Jewelry default"><BarChart data={data?.jewelry} /></Panel>
            <Panel title="Glow Up tier"><BarChart data={data?.glowTiers} /></Panel>
            <Panel title="Style archetypes"><BarChart data={data?.archetypes} /></Panel>
          </div>

          <Panel title="Top neighborhoods"><BarChart data={data?.neighborhoods} /></Panel>

        </div>

        {/* Footer */}
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--c-border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'var(--c-dim)', letterSpacing: '0.1em' }}>
            All insights suppressed below cohort {MIN_COHORT} · No individual data exposed
          </p>
          <button onClick={() => useAuthStore.getState().signOut()}
            style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'var(--c-dim)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em' }}>
            sign out
          </button>
        </div>

      </div>
    </main>
  )
}
