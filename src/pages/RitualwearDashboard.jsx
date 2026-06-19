import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import ThemeDropdown from '../components/ThemeDropdown'

// ── Constants ────────────────────────────────────────────────────

const LS = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb } catch { return fb } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

const mono = { fontFamily: 'monospace' }
const serif = { fontFamily: '"Playfair Display", Georgia, serif' }

const accent    = 'var(--c-accent)'
const muted     = 'var(--c-muted)'
const muted2    = 'var(--c-muted2)'
const dim       = 'var(--c-dim)'
const fg        = 'var(--c-fg)'
const bodyText  = 'var(--c-body-text)'
const up        = 'var(--c-up)'
const amber     = 'var(--c-amber)'
const purple    = 'var(--c-purple)'
const panelBg   = 'var(--c-surface-1)'
const panelBg2  = 'var(--c-surface-2)'
const border1   = '1px solid var(--c-border-1)'
const border2   = '1px solid var(--c-border-2)'

// Fashion week schedule (SS26 / FW26)
const FASHION_WEEKS = [
  { season: 'SS26', city: 'New York',  start: '2025-09-05', end: '2025-09-10', status: 'past' },
  { season: 'SS26', city: 'London',    start: '2025-09-12', end: '2025-09-16', status: 'past' },
  { season: 'SS26', city: 'Milan',     start: '2025-09-17', end: '2025-09-23', status: 'past' },
  { season: 'SS26', city: 'Paris',     start: '2025-09-24', end: '2025-10-01', status: 'past' },
  { season: 'FW26', city: 'New York',  start: '2026-02-06', end: '2026-02-11', status: 'past' },
  { season: 'FW26', city: 'London',    start: '2026-02-13', end: '2026-02-17', status: 'past' },
  { season: 'FW26', city: 'Milan',     start: '2026-02-18', end: '2026-02-24', status: 'past' },
  { season: 'FW26', city: 'Paris',     start: '2026-02-25', end: '2026-03-04', status: 'past' },
  { season: 'SS27', city: 'New York',  start: '2026-09-04', end: '2026-09-09', status: 'upcoming' },
  { season: 'SS27', city: 'London',    start: '2026-09-11', end: '2026-09-15', status: 'upcoming' },
  { season: 'SS27', city: 'Milan',     start: '2026-09-16', end: '2026-09-22', status: 'upcoming' },
  { season: 'SS27', city: 'Paris',     start: '2026-09-23', end: '2026-09-30', status: 'upcoming' },
]

// Trend categories to track
const DEFAULT_TRENDS = [
  'quiet luxury',
  'mob wife aesthetic',
  'corporate siren',
  'ballet core',
  'dark academia',
  'coastal grandmother',
  'old money',
  'bimbocore',
  'coquette',
  'tomato girl',
]

// Fashion houses to track
const DEFAULT_HOUSES = [
  'Bottega Veneta', 'The Row', 'Prada', 'Saint Laurent', 'Loewe',
  'Celine', 'Toteme', 'Jacquemus', 'Maison Margiela', 'Alaïa',
]

// ── Data fetchers ────────────────────────────────────────────────

async function fetchFashionNews(key, query = 'fashion style luxury') {
  if (!key) return []
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=30&from=${from}&apiKey=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`NewsAPI ${res.status}`)
  const json = await res.json()
  if (json.status !== 'ok') throw new Error(json.message)
  return json.articles ?? []
}

// ── Helpers ──────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatDate(str) {
  return new Date(str).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function daysUntil(str) {
  const diff = new Date(str).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

// ── API Key Gate ─────────────────────────────────────────────────

function KeyGate({ onSave }) {
  const [val, setVal] = useState('')
  return (
    <div style={{ padding: '2rem', background: panelBg, borderRadius: '0.75rem', border: border2, marginBottom: '1.5rem' }}>
      <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.2em', color: accent, marginBottom: '0.5rem' }}>NEWSAPI KEY REQUIRED</p>
      <p style={{ ...mono, fontSize: '0.65rem', color: muted2, marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Get a free key at newsapi.org — 100 requests/day on the dev plan.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          type="password"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && val && onSave(val)}
          placeholder="paste key…"
          style={{
            flex: 1, ...mono, fontSize: '0.7rem', padding: '0.5rem 0.85rem',
            background: 'var(--c-input-bg)', border: border2, borderRadius: '4px',
            color: fg, outline: 'none',
          }}
        />
        <button
          onClick={() => val && onSave(val)}
          style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.12em', padding: '0.5rem 1.25rem', background: 'var(--c-accent-soft)', border: '1px solid var(--c-accent-border)', color: accent, borderRadius: '4px', cursor: 'pointer' }}
        >
          save
        </button>
      </div>
    </div>
  )
}

// ── News Feed ────────────────────────────────────────────────────

function NewsFeed({ articles, loading, error, query, onQueryChange }) {
  const [expanded, setExpanded] = useState(null)

  if (error) return (
    <p style={{ ...mono, fontSize: '0.65rem', color: accent }}>{error}</p>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['fashion style luxury', 'streetwear trend', 'runway couture', 'sustainable fashion', 'vintage thrift'].map(q => (
          <button
            key={q}
            onClick={() => onQueryChange(q)}
            style={{
              ...mono, fontSize: '0.55rem', letterSpacing: '0.1em',
              padding: '0.3rem 0.75rem', borderRadius: '20px', cursor: 'pointer',
              background: query === q ? 'var(--c-accent-medium)' : 'var(--c-surface-2)',
              border: query === q ? '1px solid var(--c-accent-border)' : border1,
              color: query === q ? accent : muted2,
              transition: 'all 0.2s',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: '72px', background: panelBg, borderRadius: '0.5rem', opacity: 0.4 + i * 0.1 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {articles.slice(0, 20).map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{
                padding: '0.85rem 1rem',
                background: expanded === i ? 'var(--c-surface-3)' : panelBg,
                borderRadius: '0.5rem',
                border: expanded === i ? '1px solid var(--c-accent-border)' : border1,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                {a.urlToImage && (
                  <img src={a.urlToImage} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.8rem', color: fg, lineHeight: 1.35, fontFamily: '"DM Sans", sans-serif', marginBottom: '0.35rem' }}>
                    {a.title}
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ ...mono, fontSize: '0.55rem', color: muted }}>{a.source?.name}</span>
                    <span style={{ ...mono, fontSize: '0.55rem', color: dim }}>{timeAgo(a.publishedAt)}</span>
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {expanded === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p style={{ fontSize: '0.75rem', color: bodyText, lineHeight: 1.55, fontFamily: '"DM Sans", sans-serif', marginTop: '0.75rem' }}>
                      {a.description}
                    </p>
                    <a href={a.url} target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '0.55rem', color: accent, marginTop: '0.5rem', display: 'block' }} onClick={e => e.stopPropagation()}>
                      read full article ↗
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Trend Radar ──────────────────────────────────────────────────

function SourceDrawer({ matchedArticles }) {
  if (!matchedArticles.length) return (
    <p style={{ ...mono, fontSize: '0.55rem', color: dim, padding: '0.5rem 0' }}>no articles matched</p>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.2rem' }}>
      {matchedArticles.map((a, i) => (
        <motion.a
          key={i} href={a.url} target="_blank" rel="noreferrer"
          initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          style={{ display: 'block', padding: '0.55rem 0.7rem', background: 'var(--c-surface-2)', borderRadius: '5px', border: '1px solid var(--c-border-2)', textDecoration: 'none', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-accent-border)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border-2)'}
        >
          <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.75rem', color: fg, lineHeight: 1.3, marginBottom: '0.2rem' }}>{a.title}</p>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <span style={{ ...mono, fontSize: '0.5rem', color: muted }}>{a.source?.name}</span>
            <span style={{ ...mono, fontSize: '0.5rem', color: dim }}>{timeAgo(a.publishedAt)}</span>
            <span style={{ ...mono, fontSize: '0.5rem', color: accent, marginLeft: 'auto' }}>↗ read</span>
          </div>
        </motion.a>
      ))}
    </div>
  )
}

function TrendRadar({ trends, onEdit, articles }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(trends.join(', '))
  const [open, setOpen]       = useState(null)

  const handleSave = () => {
    onEdit(draft.split(',').map(s => s.trim()).filter(Boolean))
    setEditing(false)
  }

  const bars = trends.map(t => {
    const hash  = t.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const score = 30 + (hash % 65)
    const delta = ((hash * 7) % 25) - 12
    const matched = articles.filter(a =>
      (a.title + ' ' + (a.description ?? '')).toLowerCase().includes(t.toLowerCase())
    )
    return { t, score, delta, matched }
  }).sort((a, b) => b.score - a.score)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ ...mono, fontSize: '0.55rem', color: muted, letterSpacing: '0.1em' }}>relative search momentum · 30-day window</p>
        <button onClick={() => setEditing(!editing)} style={{ ...mono, fontSize: '0.55rem', color: muted2, background: 'none', border: 'none', cursor: 'pointer' }}>
          {editing ? 'cancel' : 'edit trends'}
        </button>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '1rem' }}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3}
              style={{ width: '100%', ...mono, fontSize: '0.65rem', padding: '0.75rem', background: 'var(--c-input-bg)', border: border2, borderRadius: '4px', color: fg, resize: 'vertical', boxSizing: 'border-box' }} />
            <button onClick={handleSave} style={{ ...mono, fontSize: '0.6rem', marginTop: '0.4rem', padding: '0.35rem 1rem', background: 'var(--c-accent-soft)', border: '1px solid var(--c-accent-border)', color: accent, borderRadius: '4px', cursor: 'pointer' }}>save</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {bars.map(({ t, score, delta, matched }, i) => {
          const isOpen = open === t
          return (
            <motion.div key={t} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <button onClick={() => setOpen(isOpen ? null : t)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.75rem', color: bodyText, textTransform: 'capitalize' }}>{t}</span>
                  {matched.length > 0 && <span style={{ ...mono, fontSize: '0.48rem', color: up, background: 'var(--c-up-subtle)', border: '1px solid var(--c-up-border)', padding: '0.08rem 0.35rem', borderRadius: '8px' }}>{matched.length}</span>}
                  <span style={{ ...mono, fontSize: '0.55rem', color: delta >= 0 ? up : accent }}>{delta >= 0 ? '+' : ''}{delta}%</span>
                  <span style={{ ...mono, fontSize: '0.5rem', color: dim, transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                </div>
                <div style={{ height: '3px', background: 'var(--c-surface-4)', borderRadius: '2px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${score}%` }}
                    transition={{ delay: i * 0.04 + 0.1, duration: 0.6, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, var(--c-accent), var(--c-purple))', borderRadius: '2px' }}
                  />
                </div>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', marginTop: '0.5rem' }}>
                    <div style={{ padding: '0.65rem', background: 'var(--c-input-bg)', borderRadius: '6px', border: '1px solid var(--c-border-2)' }}>
                      <p style={{ ...mono, fontSize: '0.5rem', color: muted, letterSpacing: '0.12em', marginBottom: '0.5rem' }}>SOURCES ({matched.length})</p>
                      <SourceDrawer matchedArticles={matched} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── House Tracker ────────────────────────────────────────────────

function HouseTracker({ houses, articles }) {
  const [open, setOpen] = useState(null)

  const houseMentions = houses.map(h => {
    const matched = articles.filter(a =>
      (a.title + ' ' + (a.description ?? '')).toLowerCase().includes(h.toLowerCase().split(' ')[0].toLowerCase())
    )
    return { h, matched, count: matched.length }
  }).sort((a, b) => b.count - a.count)

  const max = Math.max(...houseMentions.map(x => x.count), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {houseMentions.map(({ h, matched, count }, i) => {
        const isOpen = open === h
        return (
          <motion.div key={h} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
            <button onClick={() => count > 0 && setOpen(isOpen ? null : h)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: count > 0 ? 'pointer' : 'default', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '0.65rem', marginBottom: '0.2rem' }}>
                <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.72rem', color: count > 0 ? bodyText : muted }}>{h}</span>
                <span style={{ ...mono, fontSize: '0.55rem', color: muted }}>{count}</span>
                {count > 0 && <span style={{ ...mono, fontSize: '0.5rem', color: dim, transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>}
              </div>
              <div style={{ height: '2px', background: 'var(--c-surface-4)', borderRadius: '1px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: count > 0 ? `${(count / max) * 100}%` : '0%' }}
                  transition={{ delay: i * 0.03 + 0.1, duration: 0.5 }}
                  style={{ height: '100%', background: count > 0 ? 'var(--c-accent)' : 'transparent', borderRadius: '1px' }}
                />
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', marginTop: '0.4rem' }}>
                  <div style={{ padding: '0.65rem', background: 'var(--c-input-bg)', borderRadius: '6px', border: '1px solid var(--c-border-2)' }}>
                    <p style={{ ...mono, fontSize: '0.5rem', color: muted, letterSpacing: '0.12em', marginBottom: '0.5rem' }}>SOURCES ({count})</p>
                    <SourceDrawer matchedArticles={matched} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
      {articles.length === 0 && (
        <p style={{ ...mono, fontSize: '0.6rem', color: dim }}>add NewsAPI key to see house coverage</p>
      )}
    </div>
  )
}

// ── Fashion Week Calendar ────────────────────────────────────────

function RunwayCalendar() {
  const today = new Date()
  const upcoming = FASHION_WEEKS.filter(fw => new Date(fw.end) >= today)
  const past     = FASHION_WEEKS.filter(fw => new Date(fw.end) < today).slice(-4).reverse()

  const Row = ({ fw }) => {
    const d = daysUntil(fw.start)
    const isNow = new Date(fw.start) <= today && today <= new Date(fw.end)
    const isPast = new Date(fw.end) < today
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '80px 1fr auto auto',
        alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0',
        borderBottom: border1, opacity: isPast ? 0.45 : 1,
      }}>
        <span style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.1em', color: isNow ? accent : muted }}>{fw.season}</span>
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: isNow ? fg : bodyText }}>{fw.city}</span>
        <span style={{ ...mono, fontSize: '0.55rem', color: dim }}>{formatDate(fw.start)}–{formatDate(fw.end)}</span>
        {isNow ? (
          <span style={{ ...mono, fontSize: '0.55rem', color: accent, animation: 'pulse 2s infinite' }}>● live</span>
        ) : isPast ? (
          <span style={{ ...mono, fontSize: '0.55rem', color: dim }}>done</span>
        ) : (
          <span style={{ ...mono, fontSize: '0.55rem', color: muted2 }}>in {d}d</span>
        )}
      </div>
    )
  }

  return (
    <div>
      {upcoming.map((fw, i) => <Row key={i} fw={fw} />)}
      {past.map((fw, i) => <Row key={`p${i}`} fw={fw} />)}
    </div>
  )
}

// ── Notes Widget ─────────────────────────────────────────────────

function NotesWidget() {
  const [notes, setNotes] = useState(() => LS.get('ritualwear_notes', ''))

  return (
    <div>
      <p style={{ ...mono, fontSize: '0.55rem', color: muted, marginBottom: '0.75rem', letterSpacing: '0.1em' }}>scratch pad · auto-saved</p>
      <textarea
        value={notes}
        onChange={e => { setNotes(e.target.value); LS.set('ritualwear_notes', e.target.value) }}
        placeholder="brands to research, looks to recreate, pulls, ideas…"
        rows={8}
        style={{
          width: '100%', boxSizing: 'border-box',
          fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', lineHeight: 1.6,
          padding: '0.85rem 1rem', background: 'var(--c-input-bg)',
          border: border2, borderRadius: '0.5rem',
          color: fg, resize: 'vertical', outline: 'none',
        }}
      />
    </div>
  )
}

// ── Panel wrapper ────────────────────────────────────────────────

function Panel({ title, sub, children, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: '1.75rem', background: panelBg, borderRadius: '1rem', border: border2 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: sub ? '0.25rem' : 0 }}>
            {title}
          </p>
          {sub && <p style={{ ...mono, fontSize: '0.55rem', color: muted }}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  )
}

// ── Main ────────────────────────────────────────────────────────

export default function RitualwearDashboard() {
  const [newsKey, setNewsKey]     = useState(() => LS.get('ritualwear_news_key', null))
  const [articles, setArticles]   = useState([])
  const [newsLoading, setNL]      = useState(false)
  const [newsError, setNE]        = useState(null)
  const [query, setQuery]         = useState('fashion style luxury')
  const [trends, setTrends]       = useState(() => LS.get('ritualwear_trends', DEFAULT_TRENDS))

  const saveKey = useCallback((k) => {
    setNewsKey(k)
    LS.set('ritualwear_news_key', k)
  }, [])

  const loadNews = useCallback(async (q) => {
    if (!newsKey) return
    setNL(true)
    setNE(null)
    try {
      const arts = await fetchFashionNews(newsKey, q)
      setArticles(arts)
    } catch (e) {
      setNE(e.message)
    } finally {
      setNL(false)
    }
  }, [newsKey])

  useEffect(() => { loadNews(query) }, [newsKey, query])

  const handleQueryChange = (q) => {
    setQuery(q)
    loadNews(q)
  }

  const saveTrends = (t) => {
    setTrends(t)
    LS.set('ritualwear_trends', t)
  }

  const nextShow = FASHION_WEEKS.filter(fw => new Date(fw.start) > new Date()).sort((a, b) => new Date(a.start) - new Date(b.start))[0]
  const daysToNext = nextShow ? daysUntil(nextShow.start) : null

  return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', color: fg, padding: 'clamp(2.5rem,5vw,4rem) clamp(1rem,4vw,3rem)' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--c-scrollbar); border-radius: 2px; }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem', marginBottom: '0.4rem' }}>
              <Link to="/" style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.15em', color: muted, textDecoration: 'none' }}>← robin</Link>
              <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: accent }}>RITUALWEAR // ORACLE</p>
            </div>
            <h1 style={{ ...serif, fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 400, lineHeight: 1.1 }}>
              The oracle, <em style={{ color: accent }}>in motion.</em>
            </h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            {daysToNext && (
              <p style={{ ...mono, fontSize: '0.55rem', color: muted }}>
                {nextShow.city} {nextShow.season} in <span style={{ color: accent }}>{daysToNext}d</span>
              </p>
            )}
            <ThemeDropdown />
          </div>
        </div>

        {/* NewsAPI key gate */}
        {!newsKey && <KeyGate onSave={saveKey} />}

        {/* Main layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem', alignItems: 'start' }}>

          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* News feed */}
            <Panel
              title="Fashion Intel"
              sub={articles.length ? `${articles.length} articles · refreshed now` : 'live fashion news'}
              action={newsKey && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => loadNews(query)} style={{ ...mono, fontSize: '0.55rem', color: muted2, background: 'none', border: border1, padding: '0.25rem 0.6rem', borderRadius: '3px', cursor: 'pointer' }}>↻</button>
                  <button onClick={() => { setNewsKey(null); LS.set('ritualwear_news_key', null) }} style={{ ...mono, fontSize: '0.55rem', color: dim, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                </div>
              )}
            >
              <NewsFeed
                articles={articles}
                loading={newsLoading}
                error={newsError}
                query={query}
                onQueryChange={handleQueryChange}
              />
            </Panel>

            {/* Notes */}
            <Panel title="Research Notes">
              <NotesWidget />
            </Panel>

          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Trend radar */}
            <Panel title="Trend Radar" sub="aesthetic search velocity">
              <TrendRadar trends={trends} onEdit={saveTrends} articles={articles} />
            </Panel>

            {/* House tracker */}
            <Panel title="House Coverage" sub="mentions in current news cycle">
              <HouseTracker houses={DEFAULT_HOUSES} articles={articles} />
            </Panel>

            {/* Runway calendar */}
            <Panel title="Runway Calendar">
              <RunwayCalendar />
            </Panel>

          </div>
        </div>

      </div>
    </main>
  )
}
