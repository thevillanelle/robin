import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import ThemeDropdown from '../components/ThemeDropdown'

// ── Constants ────────────────────────────────────────────────────

const CITIES = [
  { label: 'New York',    id: 'nyc',       query: 'New York City NYC' },
  { label: 'Miami',       id: 'miami',     query: 'Miami' },
  { label: 'Los Angeles', id: 'la',        query: 'Los Angeles' },
  { label: 'Chicago',     id: 'chicago',   query: 'Chicago' },
  { label: 'Nice',        id: 'nice',      query: 'Nice France Côte d\'Azur' },
  { label: 'Singapore',   id: 'singapore', query: 'Singapore' },
]

const CATEGORIES = [
  {
    id: 'nightlife',
    label: 'Nightlife & DJs',
    glyph: '◎',
    query: city => `"${city}" DJ nightclub venue 2025`,
    hint: 'where the music is',
  },
  {
    id: 'restaurants',
    label: 'Hot Restaurants',
    glyph: '◈',
    query: city => `"${city}" restaurant new opening hot`,
    hint: 'tables worth fighting for',
  },
  {
    id: 'clubs',
    label: 'Private Clubs',
    glyph: '◇',
    query: city => `"${city}" private members club opening exclusive`,
    hint: 'who\'s opening their doors',
  },
  {
    id: 'retail',
    label: 'New Stores',
    glyph: '◫',
    query: city => `"${city}" boutique store opening retail new`,
    hint: 'what just landed',
  },
  {
    id: 'fitness',
    label: 'Fitness & Wellness',
    glyph: '◉',
    query: city => `"${city}" fitness studio gym wellness opening`,
    hint: 'where the body goes',
  },
  {
    id: 'realestate',
    label: 'Real Estate',
    glyph: '◰',
    query: city => `"${city}" real estate prices neighborhood market`,
    hint: 'the land beneath it all',
    isRE: true,
  },
]

const RE_UP   = ['rise', 'rising', 'surge', 'surging', 'up ', 'gain', 'boom', 'soar', 'record high', 'increase', 'demand', 'hot market', 'seller']
const RE_DOWN = ['fall', 'falling', 'drop', 'dropping', 'decline', 'slow', 'cooling', 'correction', 'afford', 'crisis', 'buyer']

function reDirection(headline) {
  const h = headline.toLowerCase()
  const ups   = RE_UP.filter(w => h.includes(w)).length
  const downs = RE_DOWN.filter(w => h.includes(w)).length
  if (ups > downs) return 'up'
  if (downs > ups) return 'down'
  return null
}

const LS_KEY = 'ritualwhere_news_key_alias'
const mono  = { fontFamily: 'monospace' }
const serif = { fontFamily: '"Playfair Display", Georgia, serif' }

// ── Fetch ─────────────────────────────────────────────────────────

async function fetchCategoryNews(cityQuery, catQuery, key) {
  try {
    const q = encodeURIComponent(`${cityQuery} ${catQuery}`)
    const r = await fetch(
      `https://newsapi.org/v2/everything?q=${q}&language=en&pageSize=8&sortBy=publishedAt&apiKey=${key}`
    )
    if (!r.ok) return []
    const d = await r.json()
    return d.articles ?? []
  } catch { return [] }
}

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ── API key gate ──────────────────────────────────────────────────

function KeyGate({ onSave }) {
  const [val, setVal] = useState('')
  return (
    <div style={{
      padding: '2rem 2.5rem', background: 'var(--c-surface-1)',
      borderRadius: '1rem', border: '1px solid var(--c-border-2)', maxWidth: 480,
    }}>
      <p style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--c-accent)', marginBottom: '0.6rem' }}>
        newsapi key required
      </p>
      <p style={{ ...serif, fontSize: '1rem', color: 'var(--c-fg)', marginBottom: '0.4rem' }}>
        Ritualwhere pulls live city intelligence from NewsAPI.
      </p>
      <p style={{ ...mono, fontSize: '0.6rem', color: 'var(--c-muted)', marginBottom: '1.25rem' }}>
        Already set one in Ritualwear? It'll carry over. Otherwise get a free key at{' '}
        <a href="https://newsapi.org" target="_blank" rel="noreferrer" style={{ color: 'var(--c-accent)' }}>newsapi.org</a>.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="your newsapi key"
          style={{
            flex: 1, background: 'var(--c-input-bg)', border: '1px solid var(--c-border-3)',
            borderRadius: '4px', padding: '0.6rem 0.9rem',
            ...mono, fontSize: '0.75rem', color: 'var(--c-fg)', outline: 'none',
          }}
        />
        <button
          onClick={() => val.trim() && onSave(val.trim())}
          style={{ ...mono, fontSize: '0.65rem', color: 'var(--c-fg)', background: 'var(--c-accent-medium)', border: '1px solid var(--c-accent)', padding: '0.6rem 1.25rem', borderRadius: '4px', cursor: 'pointer' }}
        >
          save
        </button>
      </div>
    </div>
  )
}

// ── Article card ──────────────────────────────────────────────────

function ArticleCard({ article, isRE }) {
  const dir = isRE ? reDirection(article.title ?? '') : null
  const dirColor = dir === 'up' ? 'var(--c-up)' : dir === 'down' ? 'var(--c-accent)' : null

  return (
    <a
      href={article.url} target="_blank" rel="noreferrer"
      style={{
        display: 'block', padding: '0.6rem 0.75rem',
        background: 'var(--c-surface-2)',
        border: `1px solid ${dirColor ? dirColor + '33' : 'var(--c-border-1)'}`,
        borderLeft: dirColor ? `3px solid ${dirColor}` : '1px solid var(--c-border-1)',
        borderRadius: '6px', textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { if (!dirColor) e.currentTarget.style.borderColor = 'var(--c-accent-border)' }}
      onMouseLeave={e => { if (!dirColor) e.currentTarget.style.borderColor = 'var(--c-border-1)' }}
    >
      <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.76rem', color: 'var(--c-fg)', lineHeight: 1.4, marginBottom: '0.25rem' }}>
        {article.title}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {dir && (
          <span style={{ ...mono, fontSize: '0.48rem', color: dirColor, letterSpacing: '0.1em' }}>
            {dir === 'up' ? '▲ rising' : '▼ cooling'}
          </span>
        )}
        <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-muted)' }}>{article.source?.name}</span>
        <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-dim)' }}>{timeAgo(article.publishedAt)}</span>
        <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-accent)', marginLeft: 'auto' }}>↗</span>
      </div>
    </a>
  )
}

// ── Category panel ────────────────────────────────────────────────

function CategoryPanel({ cat, articles, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: '1.25rem 1.5rem',
        background: 'var(--c-surface-1)',
        borderRadius: '1rem',
        border: '1px solid var(--c-border-2)',
        display: 'flex', flexDirection: 'column', gap: '0.85rem',
      }}
    >
      {/* Category header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <span style={{ ...mono, fontSize: '0.65rem', color: 'var(--c-accent)' }}>{cat.glyph}</span>
          <p style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--c-accent)' }}>
            {cat.label}
          </p>
        </div>
        <p style={{ ...mono, fontSize: '0.52rem', color: 'var(--c-dim)', fontStyle: 'italic' }}>{cat.hint}</p>
      </div>

      {/* Articles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minHeight: '120px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: '52px', background: 'var(--c-surface-2)', borderRadius: '6px', border: '1px solid var(--c-border-1)', opacity: 0.5 + i * 0.1 }} />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p style={{ ...mono, fontSize: '0.6rem', color: 'var(--c-dim)' }}>no signals right now</p>
        ) : (
          articles.slice(0, 5).map((a, i) => (
            <ArticleCard key={i} article={a} isRE={cat.isRE} />
          ))
        )}
      </div>
    </motion.div>
  )
}

// ── City toggle ───────────────────────────────────────────────────

function CityToggle({ cities, selected, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      {cities.map(city => {
        const active = city.id === selected
        return (
          <button
            key={city.id}
            onClick={() => onSelect(city.id)}
            style={{
              ...mono, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '0.45rem 1.1rem', borderRadius: '2rem',
              background: active ? 'var(--c-accent-medium)' : 'var(--c-surface-2)',
              border: active ? '1px solid var(--c-accent-border)' : '1px solid var(--c-border-2)',
              color: active ? 'var(--c-fg)' : 'var(--c-muted)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {city.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────

export default function RitualwhereDashboard() {
  const [newsKey, setNewsKey] = useState(() => {
    try {
      const k = localStorage.getItem('ritualwear_news_key')
      return k ? JSON.parse(k) : null
    } catch { return null }
  })

  const [selectedCity, setSelectedCity] = useState('nyc')
  const [cache, setCache]   = useState({})   // { 'nyc-nightlife': [...] }
  const [loading, setLoading] = useState({}) // { 'nyc-nightlife': true }

  const saveKey = useCallback(k => {
    try { localStorage.setItem('ritualwear_news_key', JSON.stringify(k)) } catch {}
    setNewsKey(k)
  }, [])

  const city = CITIES.find(c => c.id === selectedCity)

  const loadCity = useCallback(async (cityId) => {
    if (!newsKey) return
    const c = CITIES.find(x => x.id === cityId)
    if (!c) return

    const toFetch = CATEGORIES.filter(cat => !cache[`${cityId}-${cat.id}`])
    if (!toFetch.length) return

    setLoading(prev => {
      const next = { ...prev }
      toFetch.forEach(cat => { next[`${cityId}-${cat.id}`] = true })
      return next
    })

    await Promise.all(toFetch.map(async cat => {
      const articles = await fetchCategoryNews(c.query, cat.query(c.query.split(' ')[0]), newsKey)
      setCache(prev => ({ ...prev, [`${cityId}-${cat.id}`]: articles }))
      setLoading(prev => ({ ...prev, [`${cityId}-${cat.id}`]: false }))
    }))
  }, [newsKey, cache])

  useEffect(() => {
    if (newsKey) loadCity(selectedCity)
  }, [selectedCity, newsKey])

  const handleCitySelect = (id) => {
    setSelectedCity(id)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-fg)', padding: 'clamp(2rem,4vw,3.5rem) clamp(1rem,3vw,2.5rem)' }}>
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--c-surface-4); border-radius: 2px; }
      `}</style>
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem' }}>
            <Link to="/" style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--c-muted)', textDecoration: 'none' }}>← robin</Link>
            <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--c-accent)' }}>RITUALWHERE // CITY INTELLIGENCE</p>
          </div>
          <ThemeDropdown />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ ...serif, fontSize: 'clamp(24px,3.5vw,42px)', fontWeight: 400, color: 'var(--c-fg)', lineHeight: 1.1, marginBottom: '0.35rem' }}>
            Where is it <em style={{ color: 'var(--c-accent)' }}>happening.</em>
          </h1>
          <p style={{ ...mono, fontSize: '0.6rem', color: 'var(--c-dim)' }}>
            nightlife · restaurants · private clubs · retail · fitness · real estate — live for each city
          </p>
        </div>

        {/* Key gate */}
        {!newsKey && (
          <div style={{ marginBottom: '2rem' }}>
            <KeyGate onSave={saveKey} />
          </div>
        )}

        {/* City toggle */}
        <div style={{ marginBottom: '1.75rem' }}>
          <CityToggle cities={CITIES} selected={selectedCity} onSelect={handleCitySelect} />
        </div>

        {/* City label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCity}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ marginBottom: '1.25rem' }}
          >
            <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--c-dim)', marginBottom: '0.2rem' }}>
              now viewing
            </p>
            <h2 style={{ ...serif, fontSize: 'clamp(18px,2.5vw,32px)', fontWeight: 400, color: 'var(--c-fg)', lineHeight: 1 }}>
              {city?.label}
            </h2>
          </motion.div>
        </AnimatePresence>

        {/* Category grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCity}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1rem',
            }}
          >
            {CATEGORIES.map(cat => {
              const cacheKey = `${selectedCity}-${cat.id}`
              return (
                <CategoryPanel
                  key={cat.id}
                  cat={cat}
                  articles={cache[cacheKey] ?? []}
                  loading={loading[cacheKey] === true}
                />
              )
            })}
          </motion.div>
        </AnimatePresence>

        {/* Reset key */}
        {newsKey && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              onClick={() => { localStorage.removeItem('ritualwear_news_key'); setNewsKey(null) }}
              style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              reset news key
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
