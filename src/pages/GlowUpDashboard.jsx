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

const DEFAULT_CATEGORIES = [
  {
    id: 'looksmaxxing',
    label: 'Looksmaxxing & optimization',
    keywords: ['looksmaxxing', 'looksmax', 'mewing', 'jawline', 'canthal tilt', 'hunter eyes', 'forward growth', 'phenotype', 'looksmatch', 'mogging', 'mog', 'glow up', 'lookspill', 'hardmaxxing', 'softmaxxing'],
    framing: 'belief that appearance is a project to be engineered',
  },
  {
    id: 'rating',
    label: 'Appearance rating culture',
    keywords: ['rate me', 'out of 10', 'truerateme', '1-10', 'above average', 'below average', 'rating', 'rated', 'attractive scale', 'facial rating', 'objective rating', 'looks rating'],
    framing: 'reducing self-worth to a score',
  },
  {
    id: 'blackpill',
    label: 'Blackpill & dating market anxiety',
    keywords: ['blackpill', 'redpill', 'hypergamy', 'dating market', 'smp', 'sexual market value', 'looksmatch', 'out of my league', 'cope', 'looksmaxxing', 'incel', 'femcel', 'volcel', 'genetically inferior', 'genetic lottery'],
    framing: 'appearance fatalism — the belief that looks determine life outcomes',
  },
  {
    id: 'filter_dysmorphia',
    label: 'Filter & social media dysmorphia',
    keywords: ['filter dysmorphia', 'snapchat dysmorphia', 'instagram face', 'facetune', 'faceapp', 'beauty filter', 'edited photos', 'unrealistic standards', 'photoshop', 'airbrushed', 'filtered reality'],
    framing: 'inability to recognize yourself without digital alteration',
  },
  {
    id: 'surgery',
    label: 'Cosmetic surgery anxiety',
    keywords: ['rhinoplasty', 'nose job', 'bbl', 'lip filler', 'botox', 'plastic surgery', 'before after', 'surgical transformation', 'cosmetic procedure', 'filler migration', 'botched', 'mommy makeover', 'jaw filler'],
    framing: 'willingness to undergo pain to change what you were born with',
  },
  {
    id: 'skin',
    label: 'Skin texture & clarity',
    keywords: ['acne', 'breakout', 'pores', 'skin texture', 'blemish', 'hyperpigmentation', 'dark spots', 'fungal acne', 'purging', 'cystic acne', 'hormonal acne', 'scarring'],
    framing: 'fear of being looked at up close',
  },
  {
    id: 'aging',
    label: 'Aging & time anxiety',
    keywords: ['anti-aging', 'fine lines', 'wrinkles', 'sagging', 'skin aging', 'collagen loss', 'age spots', 'looking old', 'aged badly', 'aging well', 'preventative botox', 'preventative'],
    framing: 'loss of control over time showing on the face',
  },
  {
    id: 'hair',
    label: 'Hair loss & hairline anxiety',
    keywords: ['hair loss', 'thinning hair', 'alopecia', 'norwood scale', 'nw3', 'receding hairline', 'finasteride', 'minoxidil', 'hair transplant', 'balding', 'diffuse thinning', 'dht'],
    framing: 'visible, public, irreversible decline',
  },
  {
    id: 'body',
    label: 'Body image & dysmorphia',
    keywords: ['body dysmorphia', 'bdd', 'body image', 'mirror checking', 'appearance preoccupation', 'fat', 'skinny fat', 'skinnyfat', 'cellulite', 'stretch marks', 'bulk cut', 'recomp'],
    framing: 'the gap between perceived and actual appearance',
  },
  {
    id: 'fatigue',
    label: 'Visible fatigue & stress',
    keywords: ['dark circles', 'tired eyes', 'stress skin', 'burnout skin', 'dull skin', 'hollow eyes', 'sunken', 'periorbital', 'looking tired', 'exhausted face'],
    framing: 'life showing on the face — the body keeping score',
  },
]

// Discomfort signal vocabulary — the actual language people use
const DISCOMFORT_WORDS = [
  // classic
  'insecurity', 'insecure', 'anxiety', 'anxious', 'shame', 'embarrassed', 'self-conscious',
  'struggle', 'hide', 'hate my', 'fix my', 'ugly', 'unattractive', 'unfixable',
  'uncomfortable', 'unhappy', 'dissatisfied', 'low confidence', 'feel bad', 'comparison',
  // appearance-specific
  'looksmaxxing', 'blackpill', 'cope', 'looksmatch', 'mogging', 'mog', 'genetically',
  'rating', 'rated', 'out of my league', 'hypergamy', 'filter dysmorphia', 'snapchat dysmorphia',
  'facetune', 'botched', 'recessed', 'hairline', 'balding', 'norwood',
  // emotional
  'devastated', 'destroyed', 'ruined', 'awful', 'terrible', 'humiliated', 'rejected',
  'invisible', 'not good enough', 'never enough', 'body dysmorphia', 'dysmorphia',
  // forum language
  'cant fix', "can't fix", 'born like this', 'genetic', 'surgery', 'desperate',
  'obsessed with', 'cant stop', "can't stop", 'keep checking', 'mirror', 'notice',
]

const ASPIRATION_WORDS = [
  'glow', 'radiant', 'confident', 'transform', 'improve', 'achieve',
  'best skin', 'healthy', 'thriving', 'love my', 'self-love', 'acceptance',
  'embracing', 'routine', 'results', 'progress', 'before after',
]

// Reddit subreddits to scan — no API key needed (public JSON)
const REDDIT_SUBS = [
  { sub: 'looksmaxxing',      label: 'r/looksmaxxing' },
  { sub: 'Vindicta',          label: 'r/Vindicta' },
  { sub: 'truerateme',        label: 'r/truerateme' },
  { sub: 'SkincareAddiction', label: 'r/SkincareAddiction' },
  { sub: 'HairTransplants',   label: 'r/HairTransplants' },
  { sub: 'PlasticSurgery',    label: 'r/PlasticSurgery' },
  { sub: 'BodyDysmorphia',    label: 'r/BodyDysmorphia' },
  { sub: 'selfimprovement',   label: 'r/selfimprovement' },
]

// ── Data fetchers ─────────────────────────────────────────────────

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

async function fetchRedditSub(sub) {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return []
    const json = await res.json()
    return (json.data?.children ?? []).map(c => ({
      title:       c.data.title,
      description: c.data.selftext?.slice(0, 280) ?? '',
      url:         `https://reddit.com${c.data.permalink}`,
      publishedAt: new Date(c.data.created_utc * 1000).toISOString(),
      source:      { name: `r/${sub}` },
      _reddit:     true,
      score:       c.data.score,
      numComments: c.data.num_comments,
    }))
  } catch { return [] }
}

async function fetchAllReddit() {
  const results = await Promise.all(REDDIT_SUBS.map(({ sub }) => fetchRedditSub(sub)))
  return results.flat()
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

function SourceArticles({ matchedArticles }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '260px', overflowY: 'auto', paddingRight: '0.2rem' }}>
      {matchedArticles.length === 0 && (
        <p style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-dim)' }}>no articles matched this category</p>
      )}
      {matchedArticles.map((a, i) => {
        const score = scoreArticle(a)
        return (
          <motion.a
            key={i}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            style={{
              display: 'block', padding: '0.6rem 0.75rem',
              background: 'var(--c-surface-2)', borderRadius: '6px',
              border: '1px solid var(--c-border-2)', textDecoration: 'none',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-accent-border)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border-2)'}
          >
            <p style={{ ...sans, fontSize: '0.74rem', color: 'var(--c-fg)', lineHeight: 1.3, marginBottom: '0.25rem' }}>
              {a.title}
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-muted)' }}>{a.source?.name}</span>
              <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-dim)' }}>{timeAgo(a.publishedAt)}</span>
              {score.dis > 0 && (
                <span style={{ ...mono, fontSize: '0.47rem', padding: '0.08rem 0.35rem', background: 'var(--c-accent-subtle)', border: '1px solid var(--c-accent-border)', borderRadius: '8px', color: 'var(--c-accent)' }}>
                  ⚡ {score.dis}
                </span>
              )}
              <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-accent)', marginLeft: 'auto' }}>↗ read</span>
            </div>
          </motion.a>
        )
      })}
    </div>
  )
}

function CategorySignals({ categories, articles }) {
  const [open, setOpen] = useState(null) // category id with drawer open
  const [drawerTab, setDrawerTab] = useState({}) // catId → 'sources' | 'keywords'

  const scored = categories.map(cat => {
    const matchedArticles = scoreCategoryMentions(articles, cat)
    const hash = cat.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const base = 20 + (hash % 55)
    const total = articles.length ? Math.round((matchedArticles.length / articles.length) * 100 + base * 0.4) : base
    return { ...cat, matchedArticles, hits: matchedArticles.length, intensity: Math.min(total, 98) }
  }).sort((a, b) => b.intensity - a.intensity)

  const max = Math.max(...scored.map(s => s.intensity), 1)

  const getTab = (id) => drawerTab[id] ?? 'sources'
  const setTab = (id, tab) => setDrawerTab(prev => ({ ...prev, [id]: tab }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {scored.map((cat, i) => {
        const pct = (cat.intensity / max) * 100
        const isOpen = open === cat.id
        const tab = getTab(cat.id)
        return (
          <motion.div key={cat.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
            {/* row */}
            <button
              onClick={() => setOpen(isOpen ? null : cat.id)}
              style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ ...sans, fontSize: '0.8rem', color: 'var(--c-fg)' }}>{cat.label}</span>
                    {cat.hits > 0 && (
                      <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-up)', background: 'var(--c-up-subtle)', border: '1px solid var(--c-up-border)', padding: '0.08rem 0.4rem', borderRadius: '10px' }}>
                        {cat.hits} source{cat.hits !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p style={{ ...mono, fontSize: '0.52rem', color: 'var(--c-muted)', marginTop: '0.12rem', fontStyle: 'italic' }}>
                    {cat.framing}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{ ...mono, fontSize: '0.6rem', color: cat.intensity > 66 ? 'var(--c-accent)' : cat.intensity > 40 ? 'var(--c-amber)' : 'var(--c-muted2)' }}>
                    {cat.intensity}
                  </span>
                  <span style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-dim)', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                </div>
              </div>

              {/* bar */}
              <div style={{ height: '4px', background: 'var(--c-surface-4)', borderRadius: '2px', overflow: 'hidden' }}>
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
            </button>

            {/* drawer */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ marginTop: '0.65rem', background: 'var(--c-input-bg)', borderRadius: '8px', border: '1px solid var(--c-border-2)', overflow: 'hidden' }}>
                    {/* tab bar */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--c-border-1)' }}>
                      {[{ key: 'sources', label: `Sources (${cat.hits})` }, { key: 'keywords', label: 'Keywords' }].map(t => (
                        <button key={t.key} onClick={() => setTab(cat.id, t.key)} style={{
                          ...mono, fontSize: '0.52rem', letterSpacing: '0.1em', padding: '0.55rem 0.9rem',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: tab === t.key ? 'var(--c-accent)' : 'var(--c-muted)',
                          borderBottom: tab === t.key ? '2px solid var(--c-accent)' : '2px solid transparent',
                        }}>{t.label}</button>
                      ))}
                    </div>
                    <div style={{ padding: '0.75rem' }}>
                      {tab === 'sources' && <SourceArticles matchedArticles={cat.matchedArticles} />}
                      {tab === 'keywords' && (
                        <div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
                            {cat.keywords.map(kw => (
                              <span key={kw} style={{ ...mono, fontSize: '0.52rem', padding: '0.18rem 0.5rem', background: 'var(--c-surface-3)', border: '1px solid var(--c-border-2)', borderRadius: '10px', color: 'var(--c-muted2)' }}>{kw}</span>
                            ))}
                          </div>
                          <p style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-dim)', fontStyle: 'italic' }}>framing: {cat.framing}</p>
                        </div>
                      )}
                    </div>
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

const SCAN_QUERY = 'looksmaxxing insecurity appearance anxiety beauty self-esteem filter dysmorphia cosmetic surgery glow up'

export default function GlowUpDashboard() {
  const [newsKey, setNewsKey]     = useState(() => LS.get('ritualwear_news_key', null))
  const [newsArticles, setNews]   = useState([])
  const [redditPosts, setReddit]  = useState([])
  const [loading, setLoading]     = useState(false)
  const [redditLoading, setRL]    = useState(false)
  const [error, setError]         = useState(null)
  const [categories]              = useState(DEFAULT_CATEGORIES)
  const [tab, setTab]             = useState('signals')
  const [sourceFilter, setSource] = useState('all') // 'all' | 'news' | 'reddit'

  const articles = sourceFilter === 'news'   ? newsArticles
                 : sourceFilter === 'reddit' ? redditPosts
                 : [...newsArticles, ...redditPosts]

  const loadNews = useCallback(async () => {
    if (!newsKey) return
    setLoading(true); setError(null)
    try { setNews(await fetchSignalArticles(newsKey, SCAN_QUERY)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [newsKey])

  const loadReddit = useCallback(async () => {
    setRL(true)
    try { setReddit(await fetchAllReddit()) }
    catch { /* silently degrade */ }
    finally { setRL(false) }
  }, [])

  useEffect(() => { loadNews() }, [newsKey])
  useEffect(() => { loadReddit() }, [])

  const saveKey = (k) => { setNewsKey(k); LS.set('ritualwear_news_key', k) }
  const rescan  = () => { loadNews(); loadReddit() }

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
            <button onClick={rescan} style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-muted2)', background: 'none', border: '1px solid var(--c-border-2)', padding: '0.3rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}>
              {loading || redditLoading ? 'scanning…' : '↻ rescan'}
            </button>
            <ThemeDropdown />
          </div>
        </div>

        {!newsKey && (
          <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.85rem 1.15rem', background: 'var(--c-surface-1)', borderRadius: '0.75rem', border: '1px solid var(--c-border-2)', flexWrap: 'wrap' }}>
            <p style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-muted2)', flex: 1 }}>
              Reddit data loading now — no key needed. Add a NewsAPI key for media coverage too.
            </p>
            <button onClick={() => setSource('reddit')} style={{ ...mono, fontSize: '0.52rem', color: 'var(--c-up)', background: 'var(--c-up-subtle)', border: '1px solid var(--c-up-border)', padding: '0.25rem 0.65rem', borderRadius: '4px', cursor: 'pointer' }}>view reddit signals</button>
            <KeyGate onSave={saveKey} />
          </div>
        )}
        {error && <p style={{ ...mono, fontSize: '0.65rem', color: 'var(--c-accent)', marginBottom: '1rem' }}>{error}</p>}

        {/* Main layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', alignItems: 'start' }}>

          {/* Left — gauge + ratio */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <Panel title="Discomfort Index" sub="pain vs. aspiration signal ratio">
              <DiscomfortGauge index={discomfortIndex} loading={loading && !articles.length} />
              <PainAspirationBar articles={articles} loading={loading && !articles.length} />
            </Panel>

            <Panel title="Signal Sources" sub={`${newsArticles.length} news · ${redditPosts.length} reddit posts`}>
              {/* source filter */}
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.85rem' }}>
                {[
                  { key: 'all',    label: `All (${newsArticles.length + redditPosts.length})` },
                  { key: 'news',   label: `News (${newsArticles.length})` },
                  { key: 'reddit', label: `Reddit (${redditPosts.length})` },
                ].map(s => (
                  <button key={s.key} onClick={() => setSource(s.key)} style={{
                    ...mono, fontSize: '0.5rem', padding: '0.22rem 0.6rem', borderRadius: '12px', cursor: 'pointer',
                    background: sourceFilter === s.key ? 'var(--c-accent-medium)' : 'var(--c-surface-2)',
                    border: sourceFilter === s.key ? '1px solid var(--c-accent-border)' : '1px solid var(--c-border-1)',
                    color: sourceFilter === s.key ? 'var(--c-accent)' : 'var(--c-muted2)',
                  }}>{s.label}</button>
                ))}
              </div>

              {/* subreddit list */}
              <div style={{ marginBottom: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {REDDIT_SUBS.map(({ sub, label }) => {
                  const count = redditPosts.filter(p => p.source?.name === `r/${sub}`).length
                  return (
                    <div key={sub} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ ...mono, fontSize: '0.52rem', color: count > 0 ? 'var(--c-muted2)' : 'var(--c-dim)' }}>{label}</span>
                      <span style={{ ...mono, fontSize: '0.52rem', color: count > 0 ? 'var(--c-up)' : 'var(--c-dim)' }}>{redditLoading ? '…' : count}</span>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', borderTop: '1px solid var(--c-border-1)', paddingTop: '0.75rem' }}>
                {[
                  { label: 'total signals', val: articles.length },
                  { label: 'pain signals', val: articles.reduce((s, a) => s + scoreArticle(a).dis, 0) },
                  { label: 'aspiration signals', val: articles.reduce((s, a) => s + scoreArticle(a).asp, 0) },
                  { label: 'density', val: articles.length ? `${(articles.reduce((s, a) => s + scoreArticle(a).dis, 0) / articles.length).toFixed(1)}/post` : '—' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '420px', overflowY: 'auto' }}>
                    {articles.slice(0, 40).map((a, i) => (
                      <motion.a
                        key={i}
                        href={a.url} target="_blank" rel="noreferrer"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                        style={{
                          display: 'block', padding: '0.55rem 0.75rem',
                          background: a._reddit ? 'var(--c-surface-2)' : 'var(--c-surface-1)',
                          borderRadius: '0.4rem', textDecoration: 'none',
                          border: a._reddit ? '1px solid var(--c-border-2)' : '1px solid var(--c-border-1)',
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-accent-border)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = a._reddit ? 'var(--c-border-2)' : 'var(--c-border-1)'}
                      >
                        <p style={{ ...sans, fontSize: '0.74rem', color: 'var(--c-fg)', lineHeight: 1.3, marginBottom: '0.22rem' }}>{a.title}</p>
                        <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
                          {a._reddit && <span style={{ ...mono, fontSize: '0.47rem', color: 'var(--c-amber)', background: 'rgba(196,168,90,0.08)', border: '1px solid rgba(196,168,90,0.2)', padding: '0.06rem 0.35rem', borderRadius: '6px' }}>reddit</span>}
                          <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-muted)' }}>{a.source?.name}</span>
                          <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-dim)' }}>{timeAgo(a.publishedAt)}</span>
                          {a._reddit && a.score > 0 && <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-muted2)' }}>▲ {a.score.toLocaleString()}</span>}
                          {a._reddit && a.numComments > 0 && <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-muted2)' }}>💬 {a.numComments}</span>}
                          <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-accent)', marginLeft: 'auto' }}>↗</span>
                        </div>
                      </motion.a>
                    ))}
                    {!articles.length && !loading && !redditLoading && (
                      <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-dim)' }}>loading…</p>
                    )}
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
