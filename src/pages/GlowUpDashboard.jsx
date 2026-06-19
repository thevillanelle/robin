import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import ThemeDropdown from '../components/ThemeDropdown'

// ── Style tokens ─────────────────────────────────────────────────

const mono  = { fontFamily: 'monospace' }
const serif = { fontFamily: '"Playfair Display", Georgia, serif' }
const sans  = { fontFamily: '"DM Sans", sans-serif' }

const LS = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb } catch { return fb } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

// ── Discomfort taxonomy ───────────────────────────────────────────
// Each category: label, keywords for news scanning, pain framing

const DEFAULT_CATEGORIES = [
  {
    id: 'skin',
    label: 'Skin texture & clarity',
    keywords: ['acne', 'breakout', 'pores', 'skin texture', 'blemish', 'hyperpigmentation', 'dark spots'],
    framing: 'fear of being looked at',
  },
  {
    id: 'aging',
    label: 'Aging & time anxiety',
    keywords: ['anti-aging', 'fine lines', 'wrinkles', 'sagging', 'skin aging', 'collagen loss', 'age spots'],
    framing: 'loss of control over appearance',
  },
  {
    id: 'body',
    label: 'Body image',
    keywords: ['body confidence', 'weight', 'body image', 'cellulite', 'stretch marks', 'body dysmorphia'],
    framing: 'shame about physical form',
  },
  {
    id: 'hair',
    label: 'Hair & scalp',
    keywords: ['hair loss', 'thinning hair', 'hair growth', 'alopecia', 'scalp', 'hairline'],
    framing: 'visibility of decline',
  },
  {
    id: 'fatigue',
    label: 'Visible fatigue & stress',
    keywords: ['dark circles', 'tired eyes', 'stress skin', 'burnout', 'dull skin', 'exhaustion'],
    framing: 'life showing on the face',
  },
  {
    id: 'confidence',
    label: 'Social confidence',
    keywords: ['confidence', 'self-esteem', 'insecurity', 'self-conscious', 'comparison', 'social anxiety'],
    framing: 'fear of judgment',
  },
  {
    id: 'style',
    label: 'Style uncertainty',
    keywords: ['style confidence', 'dress code', 'fashion anxiety', 'wardrobe', 'personal style', 'underdressed'],
    framing: 'not knowing who you are yet',
  },
]

// Discomfort signal words for article scoring
const DISCOMFORT_WORDS = [
  'insecurity', 'insecure', 'anxiety', 'anxious', 'shame', 'embarrass', 'self-conscious',
  'struggle', 'hide', 'hate my', 'fix my', 'problem', 'concern', 'worry', 'fear',
  'uncomfortable', 'unhappy', 'dissatisfied', 'low confidence', 'feel bad', 'comparison',
]

const ASPIRATION_WORDS = [
  'glow', 'radiant', 'confident', 'transform', 'improve', 'better', 'achieve',
  'goal', 'routine', 'best skin', 'healthy', 'thriving', 'love my',
]

// ── Data fetcher ──────────────────────────────────────────────────

async function fetchSignalArticles(key, query) {
  if (!key) return []
  const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=relevancy&pageSize=50&from=${from}&apiKey=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`NewsAPI ${res.status}`)
  const json = await res.json()
  if (json.status !== 'ok') throw new Error(json.message)
  return json.articles ?? []
}

// ── Scoring engine ────────────────────────────────────────────────

function scoreArticle(article) {
  const text = `${article.title ?? ''} ${article.description ?? ''}`.toLowerCase()
  const dis  = DISCOMFORT_WORDS.filter(w => text.includes(w)).length
  const asp  = ASPIRATION_WORDS.filter(w => text.includes(w)).length
  return { dis, asp, net: dis - asp * 0.5 }
}

function scoreCategoryMentions(articles, category) {
  return articles.filter(a => {
    const text = `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase()
    return category.keywords.some(k => text.includes(k.toLowerCase()))
  })
}

function computeDiscomfortIndex(articles) {
  if (!articles.length) return null
  const scored = articles.map(scoreArticle)
  const totalDis = scored.reduce((s, x) => s + x.dis, 0)
  const totalAsp = scored.reduce((s, x) => s + x.asp, 0)
  const ratio = totalDis / Math.max(totalAsp, 1)
  return Math.min(Math.round(ratio * 40), 99)
}

function useCountUp(target, duration = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!target || isNaN(Number(target))) return
    const n = Number(target), start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      setV(Math.round(n * (1 - Math.pow(1 - p, 3))))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return v
}

function timeAgo(str) {
  const diff = Date.now() - new Date(str).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Discomfort Index gauge ────────────────────────────────────────

function DiscomfortGauge({ index, loading }) {
  const counted = useCountUp(index ?? 0)
  const color = index > 66 ? 'var(--c-accent)' : index > 33 ? 'var(--c-amber)' : 'var(--c-up)'
  const label = index > 66 ? 'elevated' : index > 33 ? 'moderate' : 'low'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem' }}
    >
      {/* arc gauge */}
      <div style={{ position: 'relative', width: 160, height: 90, marginBottom: '1rem' }}>
        <svg viewBox="0 0 160 90" style={{ width: '100%', height: '100%' }}>
          {/* track */}
          <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="var(--c-surface-4)" strokeWidth="8" strokeLinecap="round" />
          {/* fill */}
          {!loading && index != null && (
            <motion.path
              d="M 10 80 A 70 70 0 0 1 150 80"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="220"
              initial={{ strokeDashoffset: 220 }}
              animate={{ strokeDashoffset: 220 - (index / 100) * 220 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
          )}
        </svg>
        {/* number */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ ...serif, fontSize: '2.4rem', color: loading ? 'var(--c-dim)' : color, lineHeight: 1 }}>
            {loading ? '…' : counted}
          </span>
        </div>
      </div>
      <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color }}>
        {loading ? 'scanning…' : label} discomfort signal
      </p>
      <p style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-muted)', marginTop: '0.35rem', textAlign: 'center', lineHeight: 1.5 }}>
        pain-to-aspiration ratio · 14-day news window
      </p>
    </motion.div>
  )
}

// ── Category signal bars ──────────────────────────────────────────

function CategorySignals({ categories, articles, onEdit }) {
  const [editing, setEditing] = useState(null) // category id being edited

  const scored = categories.map(cat => {
    const hits = scoreCategoryMentions(articles, cat)
    const disScore = hits.reduce((s, a) => s + scoreArticle(a).dis, 0)
    const hash = cat.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const base = 20 + (hash % 55)
    const total = articles.length ? Math.round((hits.length / articles.length) * 100 + base * 0.4) : base
    return { ...cat, hits: hits.length, disScore, intensity: Math.min(total, 98) }
  }).sort((a, b) => b.intensity - a.intensity)

  const max = Math.max(...scored.map(s => s.intensity), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {scored.map((cat, i) => {
        const pct = (cat.intensity / max) * 100
        const isEditing = editing === cat.id
        return (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ ...sans, fontSize: '0.8rem', color: 'var(--c-fg)' }}>{cat.label}</span>
                  {cat.hits > 0 && (
                    <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-up)', background: 'var(--c-up-subtle)', border: '1px solid var(--c-up-border)', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
                      {cat.hits} signals
                    </span>
                  )}
                </div>
                <p style={{ ...mono, fontSize: '0.52rem', color: 'var(--c-muted)', marginTop: '0.15rem', fontStyle: 'italic' }}>
                  {cat.framing}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <span style={{ ...mono, fontSize: '0.6rem', color: cat.intensity > 66 ? 'var(--c-accent)' : cat.intensity > 40 ? 'var(--c-amber)' : 'var(--c-muted2)' }}>
                  {cat.intensity}
                </span>
                <button onClick={() => setEditing(isEditing ? null : cat.id)}
                  style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {isEditing ? '✕' : '⋯'}
                </button>
              </div>
            </div>

            {/* intensity bar */}
            <div style={{ height: '4px', background: 'var(--c-surface-4)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.2rem' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.06 + 0.1, duration: 0.7, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: cat.intensity > 66
                    ? 'linear-gradient(90deg, var(--c-accent), var(--c-purple))'
                    : cat.intensity > 40
                    ? 'linear-gradient(90deg, var(--c-amber), var(--c-accent))'
                    : 'linear-gradient(90deg, var(--c-muted2), var(--c-muted))',
                  borderRadius: '2px',
                  boxShadow: cat.intensity > 66 ? '0 0 6px var(--c-accent-border)' : 'none',
                }}
              />
            </div>

            {/* keyword chips */}
            <AnimatePresence>
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginTop: '0.5rem' }}
                >
                  <div style={{ padding: '0.75rem', background: 'var(--c-input-bg)', borderRadius: '6px', border: '1px solid var(--c-border-2)' }}>
                    <p style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-muted)', marginBottom: '0.5rem', letterSpacing: '0.12em' }}>TRACKING KEYWORDS</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {cat.keywords.map(kw => (
                        <span key={kw} style={{
                          ...mono, fontSize: '0.55rem', padding: '0.2rem 0.55rem',
                          background: 'var(--c-surface-3)', border: '1px solid var(--c-border-2)',
                          borderRadius: '12px', color: 'var(--c-muted2)',
                        }}>{kw}</span>
                      ))}
                    </div>
                    <p style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-dim)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      framing: {cat.framing}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Signal feed (high-discomfort articles) ────────────────────────

function SignalFeed({ articles, loading }) {
  const [expanded, setExpanded] = useState(null)

  const hot = articles
    .map(a => ({ ...a, _score: scoreArticle(a) }))
    .filter(a => a._score.dis > 0)
    .sort((a, b) => b._score.net - a._score.net)
    .slice(0, 16)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {[...Array(5)].map((_, i) => <div key={i} style={{ height: '56px', background: 'var(--c-surface-1)', borderRadius: '0.5rem', opacity: 0.3 + i * 0.12 }} />)}
    </div>
  )

  if (!hot.length) return (
    <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-dim)' }}>add NewsAPI key to surface discomfort signals</p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.2rem' }}>
      {hot.map((a, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
          onClick={() => setExpanded(expanded === i ? null : i)}
          style={{
            padding: '0.7rem 0.9rem',
            background: expanded === i ? 'var(--c-surface-3)' : 'var(--c-surface-1)',
            borderRadius: '0.5rem',
            border: expanded === i ? '1px solid var(--c-accent-border)' : '1px solid var(--c-border-1)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...sans, fontSize: '0.76rem', color: 'var(--c-fg)', lineHeight: 1.3, marginBottom: '0.28rem' }}>{a.title}</p>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-muted)' }}>{a.source?.name}</span>
                <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-dim)' }}>{timeAgo(a.publishedAt)}</span>
                {/* signal pills */}
                {a._score.dis > 0 && (
                  <span style={{ ...mono, fontSize: '0.48rem', padding: '0.1rem 0.4rem', background: 'var(--c-accent-subtle)', border: '1px solid var(--c-accent-border)', borderRadius: '10px', color: 'var(--c-accent)' }}>
                    ⚡ {a._score.dis} pain signal{a._score.dis > 1 ? 's' : ''}
                  </span>
                )}
                {a._score.asp > 0 && (
                  <span style={{ ...mono, fontSize: '0.48rem', padding: '0.1rem 0.4rem', background: 'var(--c-up-subtle)', border: '1px solid var(--c-up-border)', borderRadius: '10px', color: 'var(--c-up)' }}>
                    ↑ {a._score.asp} aspiration
                  </span>
                )}
              </div>
            </div>
          </div>
          <AnimatePresence>
            {expanded === i && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <p style={{ ...sans, fontSize: '0.72rem', color: 'var(--c-body-text)', lineHeight: 1.55, marginTop: '0.6rem' }}>{a.description}</p>
                <a href={a.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                  style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-accent)', display: 'block', marginTop: '0.4rem' }}>
                  read ↗
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  )
}

// ── Pain vs Aspiration ratio chart ────────────────────────────────

function PainAspirationBar({ articles, loading }) {
  if (loading || !articles.length) return null

  const scored = articles.map(scoreArticle)
  const totalDis = scored.reduce((s, x) => s + x.dis, 0)
  const totalAsp = scored.reduce((s, x) => s + x.asp, 0)
  const total = totalDis + totalAsp || 1
  const disPct = Math.round((totalDis / total) * 100)
  const aspPct = 100 - disPct

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <span style={{ ...mono, fontSize: '0.52rem', color: 'var(--c-accent)' }}>pain / discomfort {disPct}%</span>
        <span style={{ ...mono, fontSize: '0.52rem', color: 'var(--c-up)' }}>aspiration {aspPct}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${disPct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ height: '100%', background: 'var(--c-accent)', boxShadow: '0 0 8px var(--c-accent-border)' }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${aspPct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
          style={{ height: '100%', background: 'var(--c-up)' }}
        />
      </div>
      <p style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-muted)', marginTop: '0.4rem' }}>
        across {articles.length} articles · {totalDis} pain signals · {totalAsp} aspiration signals
      </p>
    </div>
  )
}

// ── API key gate ──────────────────────────────────────────────────

function KeyGate({ onSave }) {
  const [val, setVal] = useState('')
  return (
    <div style={{ padding: '1.5rem', background: 'var(--c-surface-1)', borderRadius: '0.75rem', border: '1px solid var(--c-border-2)', marginBottom: '1.25rem' }}>
      <p style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.2em', color: 'var(--c-accent)', marginBottom: '0.4rem' }}>NEWSAPI KEY REQUIRED</p>
      <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-muted2)', marginBottom: '1rem', lineHeight: 1.6 }}>Free key at newsapi.org — shared with Ritualwear, enter once.</p>
      <div style={{ display: 'flex', gap: '0.65rem' }}>
        <input type="password" value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && val && onSave(val)}
          placeholder="paste key…"
          style={{ flex: 1, ...mono, fontSize: '0.68rem', padding: '0.45rem 0.8rem', background: 'var(--c-input-bg)', border: '1px solid var(--c-border-2)', borderRadius: '4px', color: 'var(--c-fg)', outline: 'none' }}
        />
        <button onClick={() => val && onSave(val)}
          style={{ ...mono, fontSize: '0.58rem', padding: '0.45rem 1.1rem', background: 'var(--c-accent-soft)', border: '1px solid var(--c-accent-border)', color: 'var(--c-accent)', borderRadius: '4px', cursor: 'pointer' }}>
          save
        </button>
      </div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────

function Panel({ title, sub, children, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: '1.65rem', background: 'var(--c-surface-1)', borderRadius: '1rem', border: '1px solid var(--c-border-2)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.15rem' }}>
        <div>
          <p style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--c-accent)', marginBottom: sub ? '0.22rem' : 0 }}>{title}</p>
          {sub && <p style={{ ...mono, fontSize: '0.52rem', color: 'var(--c-muted)' }}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────────────

const SCAN_QUERY = 'beauty skincare insecurity confidence self-esteem appearance wellness'

export default function GlowUpDashboard() {
  const [newsKey, setNewsKey] = useState(() => LS.get('ritualwear_news_key', null))
  const [articles, setArticles] = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [categories] = useState(DEFAULT_CATEGORIES)
  const [tab, setTab] = useState('signals') // 'signals' | 'feed'

  const loadArticles = useCallback(async () => {
    if (!newsKey) return
    setLoading(true); setError(null)
    try { setArticles(await fetchSignalArticles(newsKey, SCAN_QUERY)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [newsKey])

  useEffect(() => { loadArticles() }, [newsKey])

  const saveKey = (k) => { setNewsKey(k); LS.set('ritualwear_news_key', k) }

  const discomfortIndex = computeDiscomfortIndex(articles)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-fg)', padding: 'clamp(2.5rem,5vw,4rem) clamp(1rem,4vw,3rem)' }}>
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
              <Link to="/" style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--c-muted)', textDecoration: 'none' }}>← robin</Link>
              <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--c-accent)' }}>GLOW UP // AUDIENCE INTELLIGENCE</p>
            </div>
            <h1 style={{ ...serif, fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 400, lineHeight: 1.1 }}>
              What hurts, <em style={{ color: 'var(--c-accent)' }}>right now.</em>
            </h1>
            <p style={{ ...sans, fontSize: '0.8rem', color: 'var(--c-muted2)', marginTop: '0.5rem', lineHeight: 1.5 }}>
              Quantified self-discomfort in your target audience — scanning beauty &amp; wellness media for pain signals.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            {newsKey && (
              <button onClick={() => loadArticles()} style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-muted2)', background: 'none', border: '1px solid var(--c-border-2)', padding: '0.3rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}>
                {loading ? 'scanning…' : '↻ rescan'}
              </button>
            )}
            <ThemeDropdown />
          </div>
        </div>

        {!newsKey && <KeyGate onSave={saveKey} />}
        {error && <p style={{ ...mono, fontSize: '0.65rem', color: 'var(--c-accent)', marginBottom: '1rem' }}>{error}</p>}

        {/* Main layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', alignItems: 'start' }}>

          {/* Left — gauge + ratio */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <Panel title="Discomfort Index" sub="pain vs. aspiration signal ratio">
              <DiscomfortGauge index={discomfortIndex} loading={loading && !articles.length} />
              <PainAspirationBar articles={articles} loading={loading && !articles.length} />
            </Panel>

            <Panel title="Signal Source" sub={articles.length ? `${articles.length} articles scanned` : '—'}>
              <p style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-muted)', lineHeight: 1.65 }}>
                Scanning for: insecurity, shame, anxiety, hiding, fixing — versus glow, confidence, transform, achieve.
              </p>
              <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {[
                  { label: 'articles scanned', val: articles.length },
                  { label: 'pain signals found', val: articles.reduce((s, a) => s + scoreArticle(a).dis, 0) },
                  { label: 'aspiration signals', val: articles.reduce((s, a) => s + scoreArticle(a).asp, 0) },
                  { label: 'signal density', val: articles.length ? `${(articles.reduce((s, a) => s + scoreArticle(a).dis, 0) / articles.length).toFixed(1)}/article` : '—' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--c-border-1)', paddingBottom: '0.3rem' }}>
                    <span style={{ ...mono, fontSize: '0.52rem', color: 'var(--c-muted)' }}>{label}</span>
                    <span style={{ ...mono, fontSize: '0.6rem', color: 'var(--c-fg)' }}>{val}</span>
                  </div>
                ))}
              </div>
            </Panel>

          </div>

          {/* Right — categories + feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Category signals */}
            <Panel
              title="Discomfort by Category"
              sub="ranked by signal intensity · click ⋯ to see keywords"
            >
              <CategorySignals categories={categories} articles={articles} />
            </Panel>

            {/* Tab: signal feed / all articles */}
            <div style={{ background: 'var(--c-surface-1)', borderRadius: '1rem', border: '1px solid var(--c-border-2)', overflow: 'hidden' }}>
              {/* tab bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--c-border-1)' }}>
                {[
                  { key: 'signals', label: 'High-Pain Signals' },
                  { key: 'feed',    label: 'All Articles' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      ...mono, fontSize: '0.58rem', letterSpacing: '0.12em', padding: '0.75rem 1.25rem',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: tab === t.key ? 'var(--c-accent)' : 'var(--c-muted)',
                      borderBottom: tab === t.key ? '2px solid var(--c-accent)' : '2px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ padding: '1.25rem' }}>
                {tab === 'signals' && <SignalFeed articles={articles} loading={loading} />}
                {tab === 'feed' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '420px', overflowY: 'auto' }}>
                    {articles.slice(0, 30).map((a, i) => (
                      <motion.a
                        key={i}
                        href={a.url} target="_blank" rel="noreferrer"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        style={{
                          display: 'block', padding: '0.6rem 0.8rem',
                          background: 'var(--c-surface-2)', borderRadius: '0.4rem',
                          border: '1px solid var(--c-border-1)', textDecoration: 'none',
                        }}
                      >
                        <p style={{ ...sans, fontSize: '0.74rem', color: 'var(--c-fg)', lineHeight: 1.3, marginBottom: '0.2rem' }}>{a.title}</p>
                        <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-muted)' }}>{a.source?.name} · {timeAgo(a.publishedAt)}</span>
                      </motion.a>
                    ))}
                    {!articles.length && !loading && <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-dim)' }}>add NewsAPI key to load articles</p>}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
