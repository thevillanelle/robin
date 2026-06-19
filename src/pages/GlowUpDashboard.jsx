import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ThemeDropdown from '../components/ThemeDropdown'

// ── Style tokens ─────────────────────────────────────────────────

const mono   = { fontFamily: 'monospace' }
const serif  = { fontFamily: '"Playfair Display", Georgia, serif' }
const sans   = { fontFamily: '"DM Sans", sans-serif' }
const accent = 'var(--c-accent)'
const fg     = 'var(--c-fg)'
const muted  = 'var(--c-muted)'
const muted2 = 'var(--c-muted2)'
const dim    = 'var(--c-dim)'
const up     = 'var(--c-up)'
const amber  = 'var(--c-amber)'
const body   = 'var(--c-body-text)'
const border1 = '1px solid var(--c-border-1)'
const border2 = '1px solid var(--c-border-2)'

const LS = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb } catch { return fb } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

// ── Tier config ───────────────────────────────────────────────────

const TIER_CONFIG = {
  diamond:  { color: '#A8D8F0', glow: 'rgba(168,216,240,0.4)', rank: 1, label: 'Diamond' },
  platinum: { color: '#C4B8D4', glow: 'rgba(196,184,212,0.4)', rank: 2, label: 'Platinum' },
  gold:     { color: 'var(--c-amber)', glow: 'rgba(196,168,90,0.4)', rank: 3, label: 'Gold' },
  silver:   { color: '#A8A8A8', glow: 'rgba(168,168,168,0.3)', rank: 4, label: 'Silver' },
  bronze:   { color: '#C4956A', glow: 'rgba(196,149,106,0.3)', rank: 5, label: 'Bronze' },
  starter:  { color: 'var(--c-muted2)', glow: 'none', rank: 6, label: 'Starter' },
}

function tierCfg(name) {
  const key = (name ?? '').toLowerCase()
  return TIER_CONFIG[key] ?? { color: 'var(--c-muted)', glow: 'none', rank: 99, label: name }
}

// ── Data fetchers ─────────────────────────────────────────────────

async function fetchBeautyNews(key, query = 'skincare beauty wellness glow') {
  if (!key) return []
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=24&from=${from}&apiKey=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`NewsAPI ${res.status}`)
  const json = await res.json()
  if (json.status !== 'ok') throw new Error(json.message)
  return json.articles ?? []
}

// ── Helpers ───────────────────────────────────────────────────────

function timeAgo(str) {
  const diff = Date.now() - new Date(str).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!target) return
    const n = Number(target)
    if (isNaN(n)) return
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(n * ease))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return display
}

// ── Pyramid chart ─────────────────────────────────────────────────

function PyramidChart({ tiers, total }) {
  if (!tiers?.length) return (
    <p style={{ ...mono, fontSize: '0.65rem', color: dim }}>no tier data yet</p>
  )

  const sorted = [...tiers].sort((a, b) => {
    const ra = tierCfg(a.tier ?? a.value).rank
    const rb = tierCfg(b.tier ?? b.value).rank
    return ra - rb
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {sorted.map((row, i) => {
        const name  = row.tier ?? row.value ?? '—'
        const cfg   = tierCfg(name)
        const pct   = total ? Math.round((row.n / total) * 100) : 0
        const width = Math.max(8, pct * 1.1)
        return (
          <motion.div
            key={name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}
          >
            {/* tier label */}
            <span style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.1em', color: cfg.color, width: '56px', textAlign: 'right', flexShrink: 0 }}>
              {cfg.label.toUpperCase()}
            </span>
            {/* bar */}
            <div style={{ flex: 1, height: '6px', background: 'var(--c-surface-4)', borderRadius: '3px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ delay: i * 0.07 + 0.15, duration: 0.7, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: cfg.color,
                  boxShadow: cfg.glow !== 'none' ? `0 0 8px ${cfg.glow}` : 'none',
                  borderRadius: '3px',
                }}
              />
            </div>
            {/* count + pct */}
            <span style={{ ...mono, fontSize: '0.6rem', color: muted2, width: '52px' }}>
              {row.n.toLocaleString()} <span style={{ color: dim }}>({pct}%)</span>
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Tier funnel (pyramid shape) ───────────────────────────────────

function PyramidShape({ tiers, total }) {
  if (!tiers?.length) return null
  const sorted = [...tiers]
    .sort((a, b) => tierCfg(a.tier ?? a.value).rank - tierCfg(b.tier ?? b.value).rank)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '0.5rem 0' }}>
      {sorted.map((row, i) => {
        const name = row.tier ?? row.value ?? '—'
        const cfg  = tierCfg(name)
        const pct  = total ? (row.n / total) : 0
        const minW = 18
        const maxW = 88
        const widthPct = minW + (sorted.length - i - 1) * ((maxW - minW) / Math.max(sorted.length - 1, 1))
        return (
          <motion.div
            key={name}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
            title={`${cfg.label}: ${row.n} users (${Math.round(pct * 100)}%)`}
            style={{
              width: `${widthPct}%`,
              height: '28px',
              background: cfg.color,
              opacity: 0.85,
              borderRadius: '3px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: cfg.glow !== 'none' ? `0 0 12px ${cfg.glow}` : 'none',
              cursor: 'default',
            }}
          >
            <span style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.1em', color: '#000', opacity: 0.7, fontWeight: 600 }}>
              {cfg.label.toUpperCase()} · {row.n}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Stats strip ───────────────────────────────────────────────────

function StatStrip({ label, value, sub, color }) {
  const n = useCountUp(Number(value) || 0)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: '1.25rem 1.5rem', background: 'var(--c-surface-2)', borderRadius: '0.75rem', border: border2 }}
    >
      <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: muted2, marginBottom: '0.4rem' }}>{label}</p>
      <p style={{ ...serif, fontSize: '1.9rem', color: color ?? fg, lineHeight: 1 }}>{isNaN(Number(value)) ? value ?? '—' : n.toLocaleString()}</p>
      {sub && <p style={{ ...mono, fontSize: '0.6rem', color: muted, marginTop: '0.3rem' }}>{sub}</p>}
    </motion.div>
  )
}

// ── Beauty news feed ──────────────────────────────────────────────

const BEAUTY_QUERIES = [
  'skincare beauty wellness glow',
  'dermatology skin health',
  'makeup cosmetics trends',
  'clean beauty ingredients',
  'anti-aging longevity skin',
]

function BeautyNewsFeed({ articles, loading, error, query, onQuery }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div>
      {/* query chips */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {BEAUTY_QUERIES.map(q => (
          <button key={q} onClick={() => onQuery(q)} style={{
            ...mono, fontSize: '0.52rem', letterSpacing: '0.08em', padding: '0.28rem 0.65rem',
            borderRadius: '20px', cursor: 'pointer',
            background: query === q ? 'var(--c-accent-medium)' : 'var(--c-surface-2)',
            border: query === q ? '1px solid var(--c-accent-border)' : border1,
            color: query === q ? accent : muted2, transition: 'all 0.18s',
          }}>{q}</button>
        ))}
      </div>

      {error && <p style={{ ...mono, fontSize: '0.65rem', color: accent }}>{error}</p>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[...Array(5)].map((_, i) => <div key={i} style={{ height: '60px', background: 'var(--c-surface-1)', borderRadius: '0.5rem', opacity: 0.3 + i * 0.12 }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '460px', overflowY: 'auto', paddingRight: '0.2rem' }}>
          {articles.slice(0, 18).map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.025 }}
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{
                padding: '0.75rem 0.9rem',
                background: expanded === i ? 'var(--c-surface-3)' : 'var(--c-surface-1)',
                borderRadius: '0.5rem',
                border: expanded === i ? '1px solid var(--c-accent-border)' : border1,
                cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                {a.urlToImage && (
                  <img src={a.urlToImage} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...sans, fontSize: '0.78rem', color: fg, lineHeight: 1.35, marginBottom: '0.3rem' }}>{a.title}</p>
                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <span style={{ ...mono, fontSize: '0.52rem', color: muted }}>{a.source?.name}</span>
                    <span style={{ ...mono, fontSize: '0.52rem', color: dim }}>{timeAgo(a.publishedAt)}</span>
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {expanded === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p style={{ ...sans, fontSize: '0.73rem', color: body, lineHeight: 1.55, marginTop: '0.65rem' }}>{a.description}</p>
                    <a href={a.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                      style={{ ...mono, fontSize: '0.52rem', color: accent, display: 'block', marginTop: '0.4rem' }}>
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

// ── Ingredient radar ──────────────────────────────────────────────

const DEFAULT_INGREDIENTS = [
  'retinol', 'niacinamide', 'vitamin C', 'hyaluronic acid',
  'AHA/BHA', 'peptides', 'ceramides', 'bakuchiol',
  'tranexamic acid', 'azelaic acid',
]

function IngredientRadar({ ingredients, onEdit, articles }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(ingredients.join(', '))

  const handleSave = () => {
    onEdit(draft.split(',').map(s => s.trim()).filter(Boolean))
    setEditing(false)
  }

  const scored = ingredients.map(ing => {
    const hash  = ing.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const score = 25 + (hash % 70)
    const delta = ((hash * 13) % 30) - 15
    const mentions = articles.filter(a =>
      (a.title + ' ' + (a.description ?? '')).toLowerCase().includes(ing.toLowerCase().split('/')[0])
    ).length
    return { ing, score, delta, mentions }
  }).sort((a, b) => b.score - a.score)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <p style={{ ...mono, fontSize: '0.52rem', color: muted, letterSpacing: '0.1em' }}>trend momentum · mentions in current news</p>
        <button onClick={() => setEditing(!editing)} style={{ ...mono, fontSize: '0.52rem', color: muted2, background: 'none', border: 'none', cursor: 'pointer' }}>
          {editing ? 'cancel' : 'edit'}
        </button>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '0.75rem' }}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3}
              style={{ width: '100%', ...mono, fontSize: '0.65rem', padding: '0.65rem', background: 'var(--c-input-bg)', border: border2, borderRadius: '4px', color: fg, resize: 'vertical', boxSizing: 'border-box' }} />
            <button onClick={handleSave} style={{ ...mono, fontSize: '0.58rem', marginTop: '0.35rem', padding: '0.3rem 0.9rem', background: 'var(--c-accent-soft)', border: '1px solid var(--c-accent-border)', color: accent, borderRadius: '4px', cursor: 'pointer' }}>
              save
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {scored.map(({ ing, score, delta, mentions }, i) => (
          <motion.div key={ing} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: '0.65rem', marginBottom: '0.18rem' }}>
              <span style={{ ...sans, fontSize: '0.72rem', color: body }}>{ing}</span>
              {mentions > 0 && <span style={{ ...mono, fontSize: '0.5rem', color: up }}>●{mentions}</span>}
              <span style={{ ...mono, fontSize: '0.52rem', color: delta >= 0 ? up : accent }}>{delta >= 0 ? '+' : ''}{delta}%</span>
              <span style={{ ...mono, fontSize: '0.52rem', color: muted, width: '2rem', textAlign: 'right' }}>{score}</span>
            </div>
            <div style={{ height: '3px', background: 'var(--c-surface-4)', borderRadius: '2px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ delay: i * 0.035 + 0.12, duration: 0.55, ease: 'easeOut' }}
                style={{ height: '100%', background: 'linear-gradient(90deg, var(--c-accent), var(--c-purple))', borderRadius: '2px' }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── Notes ─────────────────────────────────────────────────────────

function Notes() {
  const [val, setVal] = useState(() => LS.get('glowup_notes', ''))
  return (
    <div>
      <p style={{ ...mono, fontSize: '0.52rem', color: muted, marginBottom: '0.65rem', letterSpacing: '0.1em' }}>scratch pad · auto-saved</p>
      <textarea value={val} onChange={e => { setVal(e.target.value); LS.set('glowup_notes', e.target.value) }}
        placeholder="formulations, routines, product research, protocol ideas…"
        rows={7}
        style={{ width: '100%', boxSizing: 'border-box', ...sans, fontSize: '0.78rem', lineHeight: 1.6, padding: '0.8rem 0.95rem', background: 'var(--c-input-bg)', border: border2, borderRadius: '0.5rem', color: fg, resize: 'vertical', outline: 'none' }}
      />
    </div>
  )
}

// ── Panel wrapper ─────────────────────────────────────────────────

function Panel({ title, sub, children, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: '1.65rem', background: 'var(--c-surface-1)', borderRadius: '1rem', border: border2 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.15rem' }}>
        <div>
          <p style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: sub ? '0.22rem' : 0 }}>{title}</p>
          {sub && <p style={{ ...mono, fontSize: '0.52rem', color: muted }}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  )
}

// ── API key gate ──────────────────────────────────────────────────

function KeyGate({ onSave }) {
  const [val, setVal] = useState('')
  return (
    <div style={{ padding: '1.5rem', background: 'var(--c-surface-1)', borderRadius: '0.75rem', border: border2, marginBottom: '1.25rem' }}>
      <p style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.2em', color: accent, marginBottom: '0.4rem' }}>NEWSAPI KEY REQUIRED</p>
      <p style={{ ...mono, fontSize: '0.62rem', color: muted2, marginBottom: '1rem', lineHeight: 1.6 }}>Free key at newsapi.org (shared with Ritualwear)</p>
      <div style={{ display: 'flex', gap: '0.65rem' }}>
        <input type="password" value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && val && onSave(val)}
          placeholder="paste key…"
          style={{ flex: 1, ...mono, fontSize: '0.68rem', padding: '0.45rem 0.8rem', background: 'var(--c-input-bg)', border: border2, borderRadius: '4px', color: fg, outline: 'none' }}
        />
        <button onClick={() => val && onSave(val)}
          style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.1em', padding: '0.45rem 1.1rem', background: 'var(--c-accent-soft)', border: '1px solid var(--c-accent-border)', color: accent, borderRadius: '4px', cursor: 'pointer' }}>
          save
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────

export default function GlowUpDashboard() {
  const [tiers, setTiers]         = useState(null)
  const [overview, setOverview]   = useState(null)
  const [dbLoading, setDbLoading] = useState(true)

  const [newsKey, setNewsKey]     = useState(() => LS.get('ritualwear_news_key', null))  // shared key
  const [articles, setArticles]   = useState([])
  const [newsLoading, setNL]      = useState(false)
  const [newsError, setNE]        = useState(null)
  const [query, setQuery]         = useState(BEAUTY_QUERIES[0])

  const [ingredients, setIngredients] = useState(() => LS.get('glowup_ingredients', DEFAULT_INGREDIENTS))

  // load Supabase data
  useEffect(() => {
    async function load() {
      try {
        const [tiersRes, ovRes] = await Promise.all([
          supabase.rpc('robin_glow_tiers'),
          supabase.rpc('robin_overview'),
        ])
        setTiers(tiersRes.data ?? [])
        setOverview(ovRes.data ?? {})
      } catch { /* silently degrade */ }
      finally { setDbLoading(false) }
    }
    load()
  }, [])

  const loadNews = useCallback(async (q) => {
    if (!newsKey) return
    setNL(true); setNE(null)
    try { setArticles(await fetchBeautyNews(newsKey, q)) }
    catch (e) { setNE(e.message) }
    finally { setNL(false) }
  }, [newsKey])

  useEffect(() => { loadNews(query) }, [newsKey, query])

  const saveKey = (k) => { setNewsKey(k); LS.set('ritualwear_news_key', k) }
  const saveIngredients = (arr) => { setIngredients(arr); LS.set('glowup_ingredients', arr) }

  const glowTotal = tiers?.reduce((s, r) => s + (r.n ?? 0), 0) ?? 0
  const ov = overview ?? {}
  const completionPct = ov.total_users ? Math.round((ov.with_glow_up / ov.total_users) * 100) : null

  return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', color: fg, padding: 'clamp(2.5rem,5vw,4rem) clamp(1rem,4vw,3rem)' }}>
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--c-scrollbar); border-radius: 2px; }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem', marginBottom: '0.4rem' }}>
              <Link to="/" style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.15em', color: muted, textDecoration: 'none' }}>← robin</Link>
              <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: accent }}>GLOW UP // PYRAMID</p>
            </div>
            <h1 style={{ ...serif, fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 400, lineHeight: 1.1 }}>
              The pyramid, <em style={{ color: accent }}>in bloom.</em>
            </h1>
          </div>
          <ThemeDropdown />
        </div>

        {/* Key gate */}
        {!newsKey && <KeyGate onSave={saveKey} />}

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <StatStrip label="Glow Up users" value={dbLoading ? '…' : ov.with_glow_up ?? '—'} sub="completed assessment" />
          <StatStrip label="Total users" value={dbLoading ? '…' : ov.total_users ?? '—'} />
          <StatStrip label="Completion rate" value={completionPct != null ? `${completionPct}%` : '—'} color={completionPct > 60 ? up : completionPct > 30 ? amber : accent} />
          <StatStrip label="Tier cohort" value={dbLoading ? '…' : glowTotal} sub="across all tiers" />
        </div>

        {/* Main layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem', alignItems: 'start' }}>

          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <Panel title="Beauty Intel" sub={articles.length ? `${articles.length} articles · live` : 'live beauty & wellness news'}
              action={newsKey && (
                <div style={{ display: 'flex', gap: '0.45rem' }}>
                  <button onClick={() => loadNews(query)} style={{ ...mono, fontSize: '0.52rem', color: muted2, background: 'none', border: border1, padding: '0.22rem 0.55rem', borderRadius: '3px', cursor: 'pointer' }}>↻</button>
                  <button onClick={() => { setNewsKey(null); LS.set('ritualwear_news_key', null) }} style={{ ...mono, fontSize: '0.52rem', color: dim, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                </div>
              )}
            >
              <BeautyNewsFeed articles={articles} loading={newsLoading} error={newsError} query={query} onQuery={q => setQuery(q)} />
            </Panel>

            <Panel title="Research Notes">
              <Notes />
            </Panel>

          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Pyramid shape */}
            <Panel title="Tier Pyramid" sub={glowTotal ? `${glowTotal} users across ${tiers?.length ?? 0} tiers` : 'loading…'}>
              {dbLoading ? (
                <p style={{ ...mono, fontSize: '0.65rem', color: dim }}>loading…</p>
              ) : (
                <>
                  <PyramidShape tiers={tiers} total={glowTotal} />
                  <div style={{ marginTop: '1.25rem' }}>
                    <PyramidChart tiers={tiers} total={glowTotal} />
                  </div>
                </>
              )}
            </Panel>

            {/* Ingredient radar */}
            <Panel title="Ingredient Radar" sub="active beauty ingredients">
              <IngredientRadar ingredients={ingredients} onEdit={saveIngredients} articles={articles} />
            </Panel>

          </div>
        </div>
      </div>
    </main>
  )
}
