import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ThemeDropdown from '../components/ThemeDropdown'

const mono  = { fontFamily: 'monospace' }
const serif = { fontFamily: '"Playfair Display", Georgia, serif' }
const accent = 'var(--c-accent)'
const muted  = 'var(--c-muted)'
const dim    = 'var(--c-dim)'
const fg     = 'var(--c-fg)'

// ── Helpers ───────────────────────────────────────────────────────

function fmt(s) { return s ? String(s).replace(/_/g, ' ') : '—' }

function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (target == null || isNaN(target)) return
    const start = Date.now()
    const to = Number(target)
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(to * ease))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return display
}

// ── Sub-components ────────────────────────────────────────────────

function Panel({ title, children, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      style={{
        padding: '1.5rem 1.75rem',
        background: 'var(--c-surface-1)',
        borderRadius: '1rem',
        border: '1px solid var(--c-border-2)',
        ...style,
      }}
    >
      <p style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '1.1rem' }}>
        {title}
      </p>
      {children}
    </motion.div>
  )
}

function Stat({ label, value, sub }) {
  const isNum = value != null && !isNaN(Number(value))
  const counted = useCountUp(isNum ? Number(value) : 0)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      style={{ padding: '1.5rem', background: 'var(--c-surface-3)', borderRadius: '0.75rem', border: '1px solid var(--c-border-3)' }}
    >
      <p style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: muted, marginBottom: '0.5rem' }}>{label}</p>
      <p style={{ ...serif, fontSize: '2rem', color: fg, lineHeight: 1 }}>
        {value == null ? '—' : isNum ? counted.toLocaleString() : value}
      </p>
      {sub && <p style={{ ...mono, fontSize: '0.6rem', color: dim, marginTop: '0.35rem' }}>{sub}</p>}
    </motion.div>
  )
}

function BarChart({ data, colorKey }) {
  if (!data?.length) return <p style={{ ...mono, fontSize: '0.62rem', color: dim }}>no data yet</p>
  const max = Math.max(...data.map(d => d.n))
  const COLORS = {
    status: { active: 'var(--c-up)', planning: 'var(--c-amber)', wrap: 'var(--c-purple)', complete: 'var(--c-muted2)', cancelled: 'var(--c-dim)' },
    level:  { Learning: 'var(--c-amber)', Familiar: 'var(--c-up)', Proficient: 'var(--c-purple)', Expert: 'var(--c-accent)' },
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {data.map((d, i) => {
        const color = colorKey ? COLORS[colorKey]?.[d.value] ?? accent : accent
        return (
          <motion.div key={i}
            initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            style={{ display: 'grid', gridTemplateColumns: '130px 1fr 36px', gap: '0.75rem', alignItems: 'center' }}
          >
            <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.74rem', color: 'var(--c-body-text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {fmt(d.value)}
            </span>
            <div style={{ height: '4px', background: 'var(--c-border-1)', borderRadius: '2px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${(d.n / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 + 0.1, duration: 0.55, ease: 'easeOut' }}
                style={{ height: '100%', background: color, borderRadius: '2px' }}
              />
            </div>
            <span style={{ ...mono, fontSize: '0.64rem', color: muted, textAlign: 'right' }}>{d.n}</span>
          </motion.div>
        )
      })}
    </div>
  )
}

function ActivityFeed({ events }) {
  const EVENT_META = {
    quiz_completed:      { label: 'completed a quiz',         glyph: '◎' },
    fire_milestone:      { label: 'hit a FIRE milestone',     glyph: '◈' },
    look_saved:          { label: 'saved a look',             glyph: '◇' },
    style_result:        { label: 'got their Style Bible',    glyph: '◫' },
    neighborhood_match:  { label: 'found their neighborhood', glyph: '◉' },
    friend_joined:       { label: 'joined the suite',         glyph: '◰' },
    group_created:       { label: 'started a group',          glyph: '◎' },
    challenge_completed: { label: 'completed a challenge',    glyph: '◈' },
    badge_earned:        { label: 'earned a badge',           glyph: '◇' },
  }
  function timeAgo(ts) {
    const s = Math.floor((Date.now() - new Date(ts)) / 1000)
    if (s < 60)   return `${s}s ago`
    if (s < 3600) return `${Math.floor(s/60)}m ago`
    if (s < 86400) return `${Math.floor(s/3600)}h ago`
    return `${Math.floor(s/86400)}d ago`
  }
  if (!events?.length) return <p style={{ ...mono, fontSize: '0.62rem', color: dim }}>no recent activity</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxHeight: '280px', overflowY: 'auto' }}>
      {events.map((e, i) => {
        const meta = EVENT_META[e.event_type] ?? { label: e.event_type, glyph: '◎' }
        return (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', padding: '0.5rem 0', borderBottom: '1px solid var(--c-border-1)' }}>
            <span style={{ ...mono, fontSize: '0.6rem', color: accent, flexShrink: 0 }}>{meta.glyph}</span>
            <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.75rem', color: 'var(--c-body-text)', flex: 1 }}>
              {e.actor_name ?? 'A member'} <span style={{ color: muted }}>{meta.label}</span>
            </span>
            <span style={{ ...mono, fontSize: '0.5rem', color: dim, flexShrink: 0 }}>{timeAgo(e.created_at)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Data fetching ─────────────────────────────────────────────────

async function loadAtelierData() {
  const [
    projectsRes,
    goalsRes,
    skillsRes,
    feedRes,
    usersRes,
  ] = await Promise.all([
    supabase.from('atelier_projects').select('status, user_id'),
    supabase.from('atelier_goals').select('category, timeframe, is_complete'),
    supabase.from('atelier_skills').select('label, category, level'),
    supabase.from('social_feed').select('event_type, actor_name, created_at, payload').order('created_at', { ascending: false }).limit(30),
    supabase.from('atelier_projects').select('user_id', { count: 'exact', head: false }),
  ])

  const projects = projectsRes.data ?? []
  const goals    = goalsRes.data ?? []
  const skills   = skillsRes.data ?? []
  const feed     = feedRes.data ?? []

  const uniqueUsers = new Set(projects.map(p => p.user_id)).size

  // Project status distribution
  const statusCounts = {}
  projects.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1 })
  const projectsByStatus = Object.entries(statusCounts)
    .map(([value, n]) => ({ value, n }))
    .sort((a, b) => b.n - a.n)

  // Goals by category
  const catCounts = {}
  goals.forEach(g => { catCounts[g.category] = (catCounts[g.category] || 0) + 1 })
  const goalsByCategory = Object.entries(catCounts)
    .map(([value, n]) => ({ value, n }))
    .sort((a, b) => b.n - a.n)

  // Goals completion rate
  const completedGoals = goals.filter(g => g.is_complete).length
  const completionPct = goals.length ? Math.round((completedGoals / goals.length) * 100) : null

  // Goals by timeframe
  const tfCounts = {}
  goals.forEach(g => { tfCounts[g.timeframe] = (tfCounts[g.timeframe] || 0) + 1 })
  const goalsByTimeframe = Object.entries(tfCounts)
    .map(([value, n]) => ({ value, n }))
    .sort((a, b) => b.n - a.n)

  // Skills by level
  const levelCounts = {}
  skills.forEach(s => { levelCounts[s.level] = (levelCounts[s.level] || 0) + 1 })
  const LEVEL_ORDER = ['Learning', 'Familiar', 'Proficient', 'Expert']
  const skillsByLevel = LEVEL_ORDER
    .filter(l => levelCounts[l])
    .map(value => ({ value, n: levelCounts[value] }))

  // Top skills
  const skillCounts = {}
  skills.forEach(s => { skillCounts[s.label] = (skillCounts[s.label] || 0) + 1 })
  const topSkills = Object.entries(skillCounts)
    .map(([value, n]) => ({ value, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10)

  // Skills by category
  const skillCatCounts = {}
  skills.forEach(s => { skillCatCounts[s.category] = (skillCatCounts[s.category] || 0) + 1 })
  const skillsByCategory = Object.entries(skillCatCounts)
    .map(([value, n]) => ({ value, n }))
    .sort((a, b) => b.n - a.n)

  // Event type distribution from feed
  const eventCounts = {}
  feed.forEach(e => { eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1 })
  const eventsByType = Object.entries(eventCounts)
    .map(([value, n]) => ({ value, n }))
    .sort((a, b) => b.n - a.n)

  return {
    uniqueUsers,
    totalProjects:  projects.length,
    totalGoals:     goals.length,
    completedGoals,
    completionPct,
    totalSkills:    skills.length,
    projectsByStatus,
    goalsByCategory,
    goalsByTimeframe,
    skillsByLevel,
    topSkills,
    skillsByCategory,
    eventsByType,
    feed,
  }
}

// ── Main ──────────────────────────────────────────────────────────

export default function AtelierDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    loadAtelierData()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', color: fg, padding: 'clamp(2rem,4vw,3.5rem) clamp(1rem,3vw,2.5rem)' }}>
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--c-surface-4); border-radius: 2px; }
      `}</style>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem' }}>
            <Link to="/" style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.15em', color: muted, textDecoration: 'none' }}>← robin</Link>
            <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: accent }}>M'ATELIER // LIFE OS ANALYTICS</p>
          </div>
          <ThemeDropdown />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ ...serif, fontSize: 'clamp(24px,3.5vw,42px)', fontWeight: 400, lineHeight: 1.1, marginBottom: '0.3rem' }}>
            The work <em style={{ color: accent }}>people are doing.</em>
          </h1>
          <p style={{ ...mono, fontSize: '0.6rem', color: dim }}>
            projects · goals · skills · circle — m'atelier in aggregate
          </p>
        </div>

        {loading && (
          <p style={{ ...mono, fontSize: '0.7rem', color: dim }}>loading…</p>
        )}

        {error && (
          <p style={{ ...mono, fontSize: '0.7rem', color: accent }}>error: {error}</p>
        )}

        {data && (
          <>
            {/* Overview stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Stat label="Members"          value={data.uniqueUsers} />
              <Stat label="Projects created" value={data.totalProjects} />
              <Stat label="Goals set"        value={data.totalGoals} />
              <Stat label="Goals completed"  value={data.completedGoals}
                sub={data.completionPct != null ? `${data.completionPct}% completion rate` : null} />
              <Stat label="Skills tracked"   value={data.totalSkills} />
            </div>

            {/* Main 3-col grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <Panel title="Projects by status">
                <BarChart data={data.projectsByStatus} colorKey="status" />
              </Panel>
              <Panel title="Goals by category">
                <BarChart data={data.goalsByCategory} />
              </Panel>
              <Panel title="Goals by timeframe">
                <BarChart data={data.goalsByTimeframe} />
              </Panel>

              <Panel title="Skills by level">
                <BarChart data={data.skillsByLevel} colorKey="level" />
              </Panel>
              <Panel title="Skills by category">
                <BarChart data={data.skillsByCategory} />
              </Panel>
              <Panel title="Platform events">
                <BarChart data={data.eventsByType} />
              </Panel>
            </div>

            {/* Full-width panels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Panel title="Top skills across the platform">
                <BarChart data={data.topSkills} />
              </Panel>

              <Panel title="Live activity feed">
                <ActivityFeed events={data.feed} />
              </Panel>
            </div>
          </>
        )}

      </div>
    </main>
  )
}
