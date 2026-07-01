import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import ThemeDropdown from '../components/ThemeDropdown'
import { supabase } from '../lib/supabase'

const vilecorpSupabase = (() => {
  const url = import.meta.env.VITE_VILECORP_SUPABASE_URL
  const key = import.meta.env.VITE_VILECORP_SUPABASE_ANON_KEY
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
})()

// ── Constants ─────────────────────────────────────────────────────

const mono  = { fontFamily: 'monospace' }
const serif = { fontFamily: '"Playfair Display", Georgia, serif' }
const sans  = { fontFamily: '"DM Sans", sans-serif' }

const GOLD    = '#C4A96E'
const CRIMSON = 'var(--c-accent)'

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',      color: '#ffffff',            sub: 'audience acquisition' },
  { id: 'youtube',   label: 'YouTube',     color: '#C4A96E',            sub: 'long-form depth' },
  { id: 'instagram', label: 'Instagram',   color: '#C4717A',            sub: 'aesthetic portfolio' },
  { id: 'pinterest', label: 'Pinterest',   color: '#E07C7C',            sub: 'visual discovery' },
  { id: 'substack',  label: 'Substack',    color: '#A89BC4',            sub: 'home base' },
  { id: 'twitter',   label: 'X / Twitter', color: 'var(--c-muted2)',    sub: 'real-time reach' },
]

const SERIES = [
  { id: 'elles_world',       label: "Elle's World",          format: 'long',  desc: 'Transformation essay. Embody, decode, analyze.' },
  { id: 'nyc_with_elle',     label: 'NYC with Elle',         format: 'long',  desc: 'The ritualized hedonist, in motion.' },
  { id: 'hyperfixation',     label: 'Current Hyperfixation', format: 'long',  desc: 'Taste-making. Affiliate revenue driver.' },
  { id: 'silk_circuit',      label: 'Silk Circuit',          format: 'short', desc: 'Beauty infrastructure. Systems that manufacture atmosphere.' },
  { id: 'villain_studies',   label: 'Villain Studies',       format: 'short', desc: 'Discovery funnel. Honest about desire.' },
  { id: 'scored',            label: 'Scored',                format: 'short', desc: 'Musical intelligence. Emotional architecture.' },
  { id: 'morning_musings',   label: 'Morning Musings',       format: 'short', desc: 'Discovery funnel shorts.' },
  { id: 'sweet_innovations', label: 'Sweet Innovations',     format: 'short', desc: 'Discovery funnel shorts.' },
]

const STAGES = ['idea', 'scripting', 'shooting', 'editing', 'live']
const STAGE_COLORS = {
  idea:      'var(--c-dim)',
  scripting: 'var(--c-amber)',
  shooting:  '#A89BC4',
  editing:   GOLD,
  live:      'var(--c-up)',
}

const PHASES = [
  { n: 1, label: 'Audience & Authority',   detail: 'TikTok reach · YouTube depth · Substack foundation · Platform presence' },
  { n: 2, label: 'Investigations Drop',    detail: 'Hindenburg-style fraud breakdowns · Media pickups · Substack paid tier scales · Music sync accelerates' },
  { n: 3, label: 'Scoring & Expansion',    detail: 'Film/TV scoring primary revenue · VILE LLC product line · Dual-city lifestyle (NYC + Nice)' },
  { n: 4, label: 'Legacy',                 detail: 'EGOT trajectory · Artist enclaves · Permanent creative infrastructure' },
]

const AMMO_TABS = [
  { id: 'fraud',   label: 'Fraud & Scams',      query: 'fraud scam Ponzi scheme financial crime investigation' },
  { id: 'bravo',   label: 'Bravo & Reality',    query: 'Real Housewives Bravo reality TV drama' },
  { id: 'luxury',  label: 'Luxury & Aesthetic', query: 'luxury fashion fragrance beauty ritual sensory' },
  { id: 'villain', label: 'Villain Studies',    query: 'villain con artist manipulator desire ambition' },
]

const DEFAULT_PIPELINE = Object.fromEntries(SERIES.map(s => [s.id, { stage: 'idea', note: '' }]))
const DEFAULT_PLATFORMS = Object.fromEntries(PLATFORMS.map(p => [p.id, '']))
const DEFAULT_REVENUE = [
  { stream: 'YouTube AdSense',    amount: '', notes: '', sort_order: 0 },
  { stream: 'Brand Partnerships', amount: '', notes: '', sort_order: 1 },
  { stream: 'Substack Paid',      amount: '', notes: '', sort_order: 2 },
  { stream: 'Music Sync',         amount: '', notes: '', sort_order: 3 },
  { stream: 'VILE LLC',           amount: '', notes: '', sort_order: 4 },
]

// ── Helpers ───────────────────────────────────────────────────────

function fmtFollowers(n) {
  const v = parseInt(n?.toString().replace(/,/g, '') || '0')
  if (!v) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString()
}

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

async function fetchAmmo(query, key) {
  try {
    const q = encodeURIComponent(query)
    const r = await fetch(`https://newsapi.org/v2/everything?q=${q}&language=en&pageSize=8&sortBy=publishedAt&apiKey=${key}`)
    if (!r.ok) return []
    return (await r.json()).articles ?? []
  } catch { return [] }
}

// ── Supabase helpers ──────────────────────────────────────────────
// All writes are fire-and-forget; optimistic state is already applied.

async function upsertPlatform(userId, platform, follower_count) {
  await supabase.from('vile_platform_stats').upsert(
    { user_id: userId, platform, follower_count, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,platform' }
  )
}

async function upsertPipelineRow(userId, series_id, stage, note) {
  await supabase.from('vile_content_pipeline').upsert(
    { user_id: userId, series_id, stage, note, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,series_id' }
  )
}

async function upsertRevenueStream(userId, stream, amount, notes, sort_order) {
  await supabase.from('vile_revenue_streams').upsert(
    { user_id: userId, stream, amount, notes, sort_order, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,stream' }
  )
}

async function upsertPhase(userId, current_phase) {
  await supabase.from('vile_empire_settings').upsert(
    { user_id: userId, current_phase, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
}

// ── Editable number ───────────────────────────────────────────────

function EditableNum({ value, onChange, placeholder = '0' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  if (editing) return (
    <input
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onChange(draft); setEditing(false) }}
      onKeyDown={e => {
        if (e.key === 'Enter')  { onChange(draft); setEditing(false) }
        if (e.key === 'Escape') { setEditing(false) }
      }}
      placeholder={placeholder}
      style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${GOLD}`, outline: 'none', ...serif, fontSize: '2rem', color: 'var(--c-fg)', width: '120px', lineHeight: 1 }}
    />
  )
  return (
    <span onClick={() => { setDraft(value); setEditing(true) }} style={{ cursor: 'text' }}>
      {fmtFollowers(value) === '—'
        ? <span style={{ ...mono, fontSize: '0.6rem', color: 'var(--c-dim)' }}>click to add</span>
        : fmtFollowers(value)
      }
    </span>
  )
}

// ── Panel ─────────────────────────────────────────────────────────

function Panel({ title, children, style, accent: accentOverride }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      style={{ padding: '1.5rem 1.75rem', background: 'var(--c-surface-1)', borderRadius: '1rem', border: '1px solid var(--c-border-2)', ...style }}
    >
      <p style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: accentOverride ?? CRIMSON, marginBottom: '1.1rem' }}>
        {title}
      </p>
      {children}
    </motion.div>
  )
}

// ── Empire numbers ────────────────────────────────────────────────

function EmpireNumbers({ stats, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem' }}>
      {PLATFORMS.map(p => (
        <div key={p.id} style={{ padding: '1.25rem', background: 'var(--c-surface-3)', borderRadius: '0.75rem', border: '1px solid var(--c-border-3)' }}>
          <p style={{ ...mono, fontSize: '0.52rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: p.color, marginBottom: '0.2rem' }}>{p.label}</p>
          <p style={{ ...mono, fontSize: '0.45rem', color: 'var(--c-dim)', marginBottom: '0.6rem' }}>{p.sub}</p>
          <p style={{ ...serif, fontSize: '2rem', color: 'var(--c-fg)', lineHeight: 1 }}>
            <EditableNum value={stats[p.id]} onChange={v => onChange(p.id, v)} />
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Content pipeline ──────────────────────────────────────────────

function ContentPipeline({ pipeline, onChange }) {
  const long  = SERIES.filter(s => s.format === 'long')
  const short = SERIES.filter(s => s.format === 'short')

  function SeriesRow({ s }) {
    const state = pipeline[s.id] ?? { stage: 'idea', note: '' }
    const [editNote, setEditNote] = useState(false)
    const [draft, setDraft] = useState(state.note)
    const color = STAGE_COLORS[state.stage]

    return (
      <div style={{ padding: '0.85rem 1rem', background: 'var(--c-surface-2)', borderRadius: '0.5rem', border: `1px solid var(--c-border-1)` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
          <div>
            <p style={{ ...serif, fontSize: '0.9rem', color: 'var(--c-fg)', lineHeight: 1, marginBottom: '0.2rem' }}>{s.label}</p>
            <p style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-dim)', fontStyle: 'italic' }}>{s.desc}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
            {STAGES.map(st => (
              <button key={st} onClick={() => onChange(s.id, { ...state, stage: st })}
                style={{
                  ...mono, fontSize: '0.45rem', letterSpacing: '0.08em', padding: '0.25rem 0.5rem',
                  borderRadius: '3px', cursor: 'pointer', border: 'none',
                  background: state.stage === st ? color : 'var(--c-surface-3)',
                  color: state.stage === st ? 'var(--c-bg)' : 'var(--c-dim)',
                  fontWeight: state.stage === st ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >{st}</button>
            ))}
          </div>
        </div>
        {editNote ? (
          <input
            autoFocus value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { onChange(s.id, { ...state, note: draft }); setEditNote(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                onChange(s.id, { ...state, note: draft }); setEditNote(false)
              }
            }}
            placeholder="add a note…"
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid var(--c-border-3)`, outline: 'none', ...sans, fontSize: '0.72rem', color: 'var(--c-fg)', padding: '0.1rem 0' }}
          />
        ) : (
          <p onClick={() => { setDraft(state.note); setEditNote(true) }}
            style={{ ...sans, fontSize: '0.72rem', color: state.note ? 'var(--c-muted)' : 'var(--c-dim)', cursor: 'text', fontStyle: state.note ? 'normal' : 'italic' }}>
            {state.note || 'add a note…'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div>
        <p style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', marginBottom: '0.75rem' }}>long form</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {long.map(s => <SeriesRow key={s.id} s={s} />)}
        </div>
      </div>
      <div>
        <p style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', marginBottom: '0.75rem' }}>short form</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {short.map(s => <SeriesRow key={s.id} s={s} />)}
        </div>
      </div>
    </div>
  )
}

// ── Cultural ammunition ───────────────────────────────────────────

function CulturalAmmo({ newsKey }) {
  const [tab, setTab]     = useState('fraud')
  const [cache, setCache] = useState({})
  const [loading, setLoading] = useState({})

  const load = useCallback(async (id) => {
    if (!newsKey || cache[id]) return
    setLoading(p => ({ ...p, [id]: true }))
    const cat = AMMO_TABS.find(t => t.id === id)
    const articles = await fetchAmmo(cat.query, newsKey)
    setCache(p => ({ ...p, [id]: articles }))
    setLoading(p => ({ ...p, [id]: false }))
  }, [newsKey, cache])

  useEffect(() => { if (newsKey) load(tab) }, [tab, newsKey])

  const articles = cache[tab] ?? []

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {AMMO_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              ...mono, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0.35rem 0.9rem', borderRadius: '2rem', cursor: 'pointer',
              background: tab === t.id ? 'rgba(196,169,110,0.15)' : 'var(--c-surface-2)',
              border: tab === t.id ? `1px solid ${GOLD}` : '1px solid var(--c-border-2)',
              color: tab === t.id ? GOLD : 'var(--c-muted)',
              transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {!newsKey ? (
        <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-dim)' }}>add NewsAPI key to load cultural intelligence</p>
      ) : loading[tab] ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '52px', background: 'var(--c-surface-2)', borderRadius: '6px', opacity: 0.3 + i * 0.1 }} />)}
        </div>
      ) : articles.length === 0 ? (
        <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-dim)' }}>no signals right now</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '320px', overflowY: 'auto' }}>
          {articles.slice(0, 7).map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noreferrer"
              style={{ display: 'block', padding: '0.6rem 0.75rem', background: 'var(--c-surface-2)', borderRadius: '6px', border: '1px solid var(--c-border-1)', textDecoration: 'none', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = GOLD}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border-1)'}
            >
              <p style={{ ...sans, fontSize: '0.76rem', color: 'var(--c-fg)', lineHeight: 1.4, marginBottom: '0.2rem' }}>{a.title}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-muted)' }}>{a.source?.name}</span>
                <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-dim)' }}>{timeAgo(a.publishedAt)}</span>
                <span style={{ ...mono, fontSize: '0.48rem', color: GOLD, marginLeft: 'auto' }}>↗</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Fraud case tracker ────────────────────────────────────────────

const CASE_STAGES = ['researching', 'scripting', 'filming', 'published', 'dropped']
const CASE_COLORS = { researching: 'var(--c-amber)', scripting: '#A89BC4', filming: GOLD, published: 'var(--c-up)', dropped: 'var(--c-dim)' }

function FraudTracker({ cases, onChange, onAdd, onRemove, onUpdate }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft]   = useState({ subject: '', stage: 'researching', notes: '' })

  const add = () => {
    if (!draft.subject.trim()) return
    onAdd(draft)
    setAdding(false)
    setDraft({ subject: '', stage: 'researching', notes: '' })
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {cases.length === 0 && !adding && (
          <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-dim)', fontStyle: 'italic' }}>no active investigations — yet.</p>
        )}
        {cases.map(c => (
          <div key={c.id} style={{ padding: '0.85rem 1rem', background: 'var(--c-surface-2)', borderRadius: '0.5rem', border: `1px solid var(--c-border-1)` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <p style={{ ...serif, fontSize: '0.95rem', color: 'var(--c-fg)' }}>{c.subject}</p>
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                {CASE_STAGES.map(st => (
                  <button key={st} onClick={() => onUpdate(c.id, { stage: st })}
                    style={{
                      ...mono, fontSize: '0.44rem', padding: '0.2rem 0.45rem', borderRadius: '3px', cursor: 'pointer', border: 'none',
                      background: c.stage === st ? CASE_COLORS[st] : 'var(--c-surface-3)',
                      color: c.stage === st ? 'var(--c-bg)' : 'var(--c-dim)',
                      transition: 'all 0.15s',
                    }}
                  >{st}</button>
                ))}
                <button onClick={() => onRemove(c.id)} style={{ ...mono, fontSize: '0.6rem', color: 'var(--c-dim)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.25rem' }}>×</button>
              </div>
            </div>
            <p style={{ ...sans, fontSize: '0.72rem', color: 'var(--c-muted)' }}>{c.notes || <em style={{ color: 'var(--c-dim)' }}>no notes</em>}</p>
          </div>
        ))}
      </div>

      {adding ? (
        <div style={{ padding: '0.85rem 1rem', background: 'var(--c-surface-2)', borderRadius: '0.5rem', border: `1px solid ${GOLD}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input autoFocus value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
            placeholder="Subject / target / case name"
            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--c-border-3)', outline: 'none', ...serif, fontSize: '0.9rem', color: 'var(--c-fg)', padding: '0.15rem 0' }}
          />
          <input value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
            placeholder="Initial notes…"
            onKeyDown={e => e.key === 'Enter' && add()}
            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--c-border-3)', outline: 'none', ...sans, fontSize: '0.75rem', color: 'var(--c-fg)', padding: '0.15rem 0' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={add} style={{ ...mono, fontSize: '0.6rem', color: GOLD, background: 'none', border: `1px solid ${GOLD}`, borderRadius: '4px', padding: '0.4rem 1rem', cursor: 'pointer' }}>open case</button>
            <button onClick={() => setAdding(false)} style={{ ...mono, fontSize: '0.6rem', color: 'var(--c-dim)', background: 'none', border: '1px solid var(--c-border-3)', borderRadius: '4px', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ ...mono, fontSize: '0.58rem', color: 'var(--c-dim)', background: 'none', border: '1px dashed var(--c-border-3)', borderRadius: '0.5rem', padding: '0.6rem 1rem', cursor: 'pointer', width: '100%' }}>
          + open new case
        </button>
      )}
    </div>
  )
}

// ── Revenue streams ───────────────────────────────────────────────

function RevenueStreams({ streams, onChange }) {
  const total = streams.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
        {streams.map(s => (
          <div key={s.stream} style={{ display: 'grid', gridTemplateColumns: '160px 100px 1fr', gap: '0.75rem', alignItems: 'center', padding: '0.55rem 0', borderBottom: '1px solid var(--c-border-1)' }}>
            <span style={{ ...mono, fontSize: '0.65rem', color: 'var(--c-muted)' }}>{s.stream}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span style={{ ...mono, fontSize: '0.6rem', color: 'var(--c-dim)' }}>$</span>
              <input
                value={s.amount}
                onChange={e => onChange(s.stream, { amount: e.target.value })}
                placeholder="0"
                style={{ width: '70px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--c-border-3)', outline: 'none', ...mono, fontSize: '0.75rem', color: 'var(--c-fg)', textAlign: 'right' }}
              />
            </div>
            <input
              value={s.notes}
              onChange={e => onChange(s.stream, { notes: e.target.value })}
              placeholder="notes…"
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--c-border-1)', outline: 'none', ...sans, fontSize: '0.7rem', color: 'var(--c-muted)' }}
            />
          </div>
        ))}
      </div>
      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
          <span style={{ ...mono, fontSize: '0.6rem', color: 'var(--c-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>total this period</span>
          <span style={{ ...serif, fontSize: '1.5rem', color: 'var(--c-up)', lineHeight: 1 }}>
            ${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Phase progress ────────────────────────────────────────────────

function PhaseProgress({ currentPhase, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
      {PHASES.map(p => {
        const active = p.n === currentPhase
        const done   = p.n < currentPhase
        return (
          <button key={p.n} onClick={() => onChange(p.n)}
            style={{
              padding: '1.1rem',
              background: active ? 'rgba(196,169,110,0.1)' : done ? 'rgba(106,173,138,0.06)' : 'var(--c-surface-2)',
              border: active ? `1px solid ${GOLD}` : done ? '1px solid rgba(106,173,138,0.25)' : '1px solid var(--c-border-2)',
              borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ ...mono, fontSize: '0.48rem', letterSpacing: '0.15em', color: active ? GOLD : done ? 'var(--c-up)' : 'var(--c-dim)', textTransform: 'uppercase' }}>
                {done ? '✓ ' : active ? '▶ ' : ''}phase {p.n}
              </span>
            </div>
            <p style={{ ...serif, fontSize: '0.88rem', color: active ? 'var(--c-fg)' : done ? 'var(--c-muted)' : 'var(--c-dim)', lineHeight: 1.2, marginBottom: '0.35rem' }}>
              {p.label}
            </p>
            <p style={{ ...mono, fontSize: '0.44rem', color: 'var(--c-dim)', lineHeight: 1.5 }}>{p.detail}</p>
          </button>
        )
      })}
    </div>
  )
}

// ── Waitlist ──────────────────────────────────────────────────────

function WaitlistPanel() {
  const [entries, setEntries] = useState(null)
  const [copied, setCopied]   = useState('')

  useEffect(() => {
    if (!vilecorpSupabase) return
    vilecorpSupabase
      .from('waitlist')
      .select('id, email, first_name, last_name, fun_question, fun_answer, list, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setEntries(data ?? []))
  }, [])

  function copyEmails(list) {
    const emails = (entries || [])
      .filter(e => e.list === list)
      .map(e => e.email)
      .join(', ')
    navigator.clipboard.writeText(emails)
    setCopied(list)
    setTimeout(() => setCopied(''), 2000)
  }

  if (!vilecorpSupabase) return (
    <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-dim)' }}>
      add VITE_VILECORP_SUPABASE_URL + VITE_VILECORP_SUPABASE_ANON_KEY to load waitlist
    </p>
  )

  if (!entries) return (
    <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-dim)' }}>loading…</p>
  )

  if (entries.length === 0) return (
    <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-dim)', fontStyle: 'italic' }}>no signups yet.</p>
  )

  const lists = [...new Set(entries.map(e => e.list))].sort()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {lists.map(list => {
        const group = entries.filter(e => e.list === list)
        return (
          <div key={list}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <p style={{ ...mono, fontSize: '0.52rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD }}>{list}</p>
                <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-dim)' }}>{group.length}</span>
              </div>
              <button
                onClick={() => copyEmails(list)}
                style={{ ...mono, fontSize: '0.5rem', color: copied === list ? 'var(--c-up)' : 'var(--c-dim)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em' }}
              >
                {copied === list ? '✓ copied' : 'copy emails'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {group.map(entry => {
                const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ')
                return (
                  <div key={entry.id} style={{ padding: '0.6rem 0.75rem', background: 'var(--c-surface-2)', borderRadius: '4px', border: '1px solid var(--c-border-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: name || entry.fun_question ? '0.3rem' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        {name && <span style={{ ...sans, fontSize: '0.75rem', color: 'var(--c-fg)', fontWeight: 500 }}>{name}</span>}
                        <span style={{ ...mono, fontSize: '0.62rem', color: name ? 'var(--c-muted)' : 'var(--c-fg)' }}>{entry.email}</span>
                      </div>
                      <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-dim)', flexShrink: 0, marginLeft: '0.75rem' }}>
                        {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    {entry.fun_question && (
                      <p style={{ ...sans, fontSize: '0.62rem', color: 'var(--c-dim)', fontStyle: 'italic' }}>
                        {entry.fun_question} <span style={{ color: GOLD, fontStyle: 'normal' }}>→ {entry.fun_answer || '—'}</span>
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Platform analytics API helpers ───────────────────────────────

async function fetchYouTubeStats(apiKey, channelId) {
  const base = 'https://www.googleapis.com/youtube/v3'
  const ch = await fetch(`${base}/channels?part=statistics,snippet&id=${encodeURIComponent(channelId)}&key=${apiKey}`)
  if (!ch.ok) throw new Error(`YouTube API error ${ch.status}`)
  const chData = await ch.json()
  if (chData.error) throw new Error(chData.error.message)
  const channel = chData.items?.[0]
  if (!channel) throw new Error('channel not found — check your channel ID')

  const sr = await fetch(`${base}/search?part=id,snippet&channelId=${encodeURIComponent(channelId)}&order=date&maxResults=10&type=video&key=${apiKey}`)
  const srData = sr.ok ? await sr.json() : { items: [] }
  const videoIds = (srData.items ?? []).map(i => i.id?.videoId).filter(Boolean).join(',')

  let videos = []
  if (videoIds) {
    const vr = await fetch(`${base}/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`)
    const vrData = vr.ok ? await vr.json() : { items: [] }
    videos = (vrData.items ?? []).map(v => ({
      id:          v.id,
      title:       v.snippet?.title       ?? '',
      publishedAt: v.snippet?.publishedAt,
      views:       parseInt(v.statistics?.viewCount    ?? '0'),
      likes:       parseInt(v.statistics?.likeCount    ?? '0'),
      comments:    parseInt(v.statistics?.commentCount ?? '0'),
    }))
  }

  return {
    channelTitle: channel.snippet?.title ?? '',
    subscribers:  parseInt(channel.statistics?.subscriberCount ?? '0'),
    totalViews:   parseInt(channel.statistics?.viewCount       ?? '0'),
    videoCount:   parseInt(channel.statistics?.videoCount      ?? '0'),
    videos,
  }
}

async function fetchPinterestAccount(token) {
  const res = await fetch('https://api.pinterest.com/v5/user_account', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Pinterest API error ${res.status}`)
  const d = await res.json()
  return {
    username:     d.username        ?? '',
    followers:    d.follower_count  ?? 0,
    following:    d.following_count ?? 0,
    pins:         d.pin_count       ?? 0,
    boards:       d.board_count     ?? 0,
    monthlyViews: d.monthly_views   ?? null,
  }
}

// ── Platform analytics components ─────────────────────────────────

const PINTEREST_ROSE = '#E07C7C'
const PLAT_TABS = ['youtube', 'pinterest', 'tiktok']

function ApiStatTile({ label, value, color }) {
  return (
    <div style={{ padding: '1rem', background: 'var(--c-surface-2)', borderRadius: '0.5rem', border: '1px solid var(--c-border-2)' }}>
      <p style={{ ...mono, fontSize: '0.48rem', letterSpacing: '0.15em', color: color ?? GOLD, textTransform: 'uppercase', marginBottom: '0.3rem' }}>{label}</p>
      <p style={{ ...serif, fontSize: '1.6rem', color: 'var(--c-fg)', lineHeight: 1 }}>{value}</p>
    </div>
  )
}

function ApiPanelHeader({ name, subtitle, lastFetch, loading, onRefresh, onSetup, refreshColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      {subtitle && <p style={{ ...serif, fontSize: '0.85rem', color: 'var(--c-muted)' }}>{subtitle}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
        {lastFetch && <span style={{ ...mono, fontSize: '0.45rem', color: 'var(--c-dim)' }}>updated {timeAgo(new Date(lastFetch).toISOString())}</span>}
        <button onClick={onRefresh} disabled={loading}
          style={{ ...mono, fontSize: '0.52rem', color: loading ? 'var(--c-dim)' : (refreshColor ?? GOLD), background: 'none', border: `1px solid ${loading ? 'var(--c-border-2)' : (refreshColor ?? GOLD)}`, borderRadius: '4px', padding: '0.3rem 0.75rem', cursor: loading ? 'default' : 'pointer', transition: 'all 0.15s' }}
        >{loading ? 'fetching…' : '↻ refresh'}</button>
        {onSetup && (
          <button onClick={onSetup}
            style={{ ...mono, fontSize: '0.52rem', color: 'var(--c-dim)', background: 'none', border: '1px solid var(--c-border-2)', borderRadius: '4px', padding: '0.3rem 0.6rem', cursor: 'pointer' }}
          >⚙</button>
        )}
      </div>
    </div>
  )
}

function SkeletonRow({ cols, height = '80px' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.75rem' }}>
      {Array.from({ length: cols }, (_, i) => (
        <div key={i} style={{ height, background: 'var(--c-surface-2)', borderRadius: '0.5rem', opacity: 0.25 + i * 0.08 }} />
      ))}
    </div>
  )
}

function YouTubePanel({ onSubscriberSync }) {
  const lsKey  = useCallback(() => { try { return localStorage.getItem('vile_yt_api_key')    ?? '' } catch { return '' } }, [])
  const lsCh   = useCallback(() => { try { return localStorage.getItem('vile_yt_channel_id') ?? '' } catch { return '' } }, [])

  const [apiKey,    setApiKey]    = useState(() => { try { return localStorage.getItem('vile_yt_api_key')    ?? '' } catch { return '' } })
  const [channelId, setChannelId] = useState(() => { try { return localStorage.getItem('vile_yt_channel_id') ?? '' } catch { return '' } })
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  const [setup,     setSetup]     = useState(() => !localStorage.getItem('vile_yt_api_key'))

  const refresh = useCallback(async (key, ch) => {
    if (!key || !ch) return
    setLoading(true); setError(null)
    try {
      const stats = await fetchYouTubeStats(key, ch)
      setData(stats)
      setLastFetch(Date.now())
      onSubscriberSync?.(stats.subscribers)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [onSubscriberSync])

  useEffect(() => {
    const k = lsKey(); const c = lsCh()
    if (k && c) refresh(k, c)
  }, [])

  const saveSetup = () => {
    try { localStorage.setItem('vile_yt_api_key', apiKey); localStorage.setItem('vile_yt_channel_id', channelId) } catch {}
    setSetup(false)
    refresh(apiKey, channelId)
  }

  if (setup || !lsKey()) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
      <p style={{ ...mono, fontSize: '0.58rem', color: 'var(--c-muted)', lineHeight: 1.7 }}>
        get a free key at <span style={{ color: GOLD }}>console.cloud.google.com</span> → enable YouTube Data API v3. your channel ID is in YouTube Studio → Settings → Channel → Advanced.
      </p>
      <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API key (AIza...)"
        style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border-2)', borderRadius: '6px', outline: 'none', ...mono, fontSize: '0.65rem', color: 'var(--c-fg)', padding: '0.55rem 0.75rem' }}
      />
      <input value={channelId} onChange={e => setChannelId(e.target.value)} placeholder="Channel ID (UC...)"
        style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border-2)', borderRadius: '6px', outline: 'none', ...mono, fontSize: '0.65rem', color: 'var(--c-fg)', padding: '0.55rem 0.75rem' }}
      />
      <button onClick={saveSetup} disabled={!apiKey || !channelId}
        style={{ ...mono, fontSize: '0.58rem', color: GOLD, background: 'none', border: `1px solid ${GOLD}`, borderRadius: '4px', padding: '0.5rem 1.25rem', cursor: 'pointer', alignSelf: 'flex-start', opacity: (!apiKey || !channelId) ? 0.4 : 1 }}
      >connect youtube</button>
    </div>
  )

  return (
    <div>
      <ApiPanelHeader
        subtitle={data?.channelTitle}
        lastFetch={lastFetch}
        loading={loading}
        onRefresh={() => refresh(lsKey(), lsCh())}
        onSetup={() => setSetup(true)}
        refreshColor={GOLD}
      />
      {error && <p style={{ ...mono, fontSize: '0.6rem', color: '#E87171', marginBottom: '0.75rem' }}>{error}</p>}
      {loading && !data
        ? <SkeletonRow cols={3} />
        : data
        ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <ApiStatTile label="subscribers" value={fmtFollowers(data.subscribers)} color={GOLD} />
              <ApiStatTile label="total views"  value={fmtFollowers(data.totalViews)}  color={GOLD} />
              <ApiStatTile label="videos"       value={data.videoCount.toLocaleString()} color={GOLD} />
            </div>
            {data.videos.length > 0 && (
              <>
                <p style={{ ...mono, fontSize: '0.48rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--c-dim)', marginBottom: '0.5rem' }}>recent videos</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {data.videos.map(v => (
                    <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 68px 110px', gap: '0.75rem', alignItems: 'center', padding: '0.55rem 0.75rem', background: 'var(--c-surface-2)', borderRadius: '4px', border: '1px solid var(--c-border-1)' }}>
                      <p style={{ ...sans, fontSize: '0.72rem', color: 'var(--c-fg)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.title}</p>
                      <span style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-muted)', textAlign: 'right' }}>{fmtFollowers(v.views)} views</span>
                      <span style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-dim)',   textAlign: 'right' }}>{fmtFollowers(v.likes)} ♥</span>
                      <span style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-dim)',   textAlign: 'right' }}>{fmtFollowers(v.comments)} 💬</span>
                      <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-dim)',   textAlign: 'right' }}>
                        {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-dim)', fontStyle: 'italic' }}>no data — click refresh to load</p>
        )
      }
    </div>
  )
}

function PinterestPanel({ onFollowerSync }) {
  const lsTok = useCallback(() => { try { return localStorage.getItem('vile_pinterest_token') ?? '' } catch { return '' } }, [])

  const [token,     setToken]     = useState(() => { try { return localStorage.getItem('vile_pinterest_token') ?? '' } catch { return '' } })
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  const [setup,     setSetup]     = useState(() => !localStorage.getItem('vile_pinterest_token'))

  const refresh = useCallback(async (tok) => {
    if (!tok) return
    setLoading(true); setError(null)
    try {
      const stats = await fetchPinterestAccount(tok)
      setData(stats)
      setLastFetch(Date.now())
      onFollowerSync?.(stats.followers)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [onFollowerSync])

  useEffect(() => {
    const t = lsTok()
    if (t) refresh(t)
  }, [])

  const saveSetup = () => {
    try { localStorage.setItem('vile_pinterest_token', token) } catch {}
    setSetup(false)
    refresh(token)
  }

  if (setup || !lsTok()) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
      <p style={{ ...mono, fontSize: '0.58rem', color: 'var(--c-muted)', lineHeight: 1.7 }}>
        create a developer app at <span style={{ color: PINTEREST_ROSE }}>developers.pinterest.com</span> → generate an access token with <span style={{ color: PINTEREST_ROSE }}>user_accounts:read</span> scope. token is good for 30 days; refresh as needed.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="Pinterest access token" type="password"
          style={{ flex: 1, background: 'var(--c-surface-2)', border: '1px solid var(--c-border-2)', borderRadius: '6px', outline: 'none', ...mono, fontSize: '0.65rem', color: 'var(--c-fg)', padding: '0.55rem 0.75rem' }}
        />
        <button onClick={saveSetup} disabled={!token}
          style={{ ...mono, fontSize: '0.58rem', color: PINTEREST_ROSE, background: 'none', border: `1px solid ${PINTEREST_ROSE}`, borderRadius: '4px', padding: '0.5rem 1.25rem', cursor: 'pointer', opacity: !token ? 0.4 : 1, whiteSpace: 'nowrap' }}
        >connect</button>
      </div>
    </div>
  )

  const tileCount = data ? [1, data.monthlyViews != null ? 1 : 0, 1, 1].filter(Boolean).length : 4

  return (
    <div>
      <ApiPanelHeader
        subtitle={data?.username ? `@${data.username}` : undefined}
        lastFetch={lastFetch}
        loading={loading}
        onRefresh={() => refresh(lsTok())}
        onSetup={() => setSetup(true)}
        refreshColor={PINTEREST_ROSE}
      />
      {error && <p style={{ ...mono, fontSize: '0.6rem', color: '#E87171', marginBottom: '0.75rem' }}>{error}</p>}
      {loading && !data
        ? <SkeletonRow cols={4} />
        : data
        ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tileCount}, 1fr)`, gap: '0.75rem' }}>
            <ApiStatTile label="followers"    value={fmtFollowers(data.followers)}  color={PINTEREST_ROSE} />
            {data.monthlyViews != null && <ApiStatTile label="monthly views" value={fmtFollowers(data.monthlyViews)} color={PINTEREST_ROSE} />}
            <ApiStatTile label="pins"         value={data.pins.toLocaleString()}    color={PINTEREST_ROSE} />
            <ApiStatTile label="boards"       value={data.boards.toLocaleString()}  color={PINTEREST_ROSE} />
          </div>
        ) : (
          <p style={{ ...mono, fontSize: '0.62rem', color: 'var(--c-dim)', fontStyle: 'italic' }}>no data — click refresh to load</p>
        )
      }
    </div>
  )
}

function TikTokApiPanel({ manualFollowers }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem' }}>
        <div style={{ padding: '1rem', background: 'var(--c-surface-2)', borderRadius: '0.5rem', border: '1px solid var(--c-border-2)' }}>
          <p style={{ ...mono, fontSize: '0.48rem', letterSpacing: '0.15em', color: '#ffffff', textTransform: 'uppercase', marginBottom: '0.3rem' }}>followers</p>
          <p style={{ ...serif, fontSize: '1.6rem', color: 'var(--c-fg)', lineHeight: 1 }}>
            {fmtFollowers(manualFollowers) === '—' ? '—' : fmtFollowers(manualFollowers)}
          </p>
          <p style={{ ...mono, fontSize: '0.42rem', color: 'var(--c-dim)', marginTop: '0.3rem' }}>update in empire numbers</p>
        </div>
        <div style={{ padding: '1rem', background: 'var(--c-surface-2)', borderRadius: '0.5rem', border: '1px solid var(--c-border-1)' }}>
          <p style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--c-amber, #C4A96E)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>api access — pending developer approval</p>
          <p style={{ ...sans, fontSize: '0.72rem', color: 'var(--c-muted)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
            TikTok's analytics API requires developer app review. apply at{' '}
            <span style={{ color: '#ffffff' }}>developers.tiktok.com</span>{' '}
            under Content Posting API or Research API. once approved, we can wire up live video stats.
          </p>
          <p style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-dim)' }}>scopes needed: video.list · user.info.basic</p>
        </div>
      </div>
    </div>
  )
}

function PlatformIntelligencePanel({ platformStats, onSync }) {
  const [tab, setTab] = useState('youtube')
  const TAB_META = {
    youtube:   { label: 'YouTube',   color: GOLD },
    pinterest: { label: 'Pinterest', color: PINTEREST_ROSE },
    tiktok:    { label: 'TikTok',    color: '#ffffff' },
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem' }}>
        {PLAT_TABS.map(t => {
          const m = TAB_META[t]
          const active = tab === t
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{
                ...mono, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '0.35rem 1rem', borderRadius: '2rem', cursor: 'pointer',
                background: active ? 'rgba(0,0,0,0.15)' : 'var(--c-surface-2)',
                border: active ? `1px solid ${m.color}` : '1px solid var(--c-border-2)',
                color: active ? m.color : 'var(--c-muted)',
                transition: 'all 0.15s',
              }}
            >{m.label}</button>
          )
        })}
      </div>
      {tab === 'youtube'   && <YouTubePanel   onSubscriberSync={n => onSync?.('youtube',   n)} />}
      {tab === 'pinterest' && <PinterestPanel onFollowerSync={n   => onSync?.('pinterest', n)} />}
      {tab === 'tiktok'    && <TikTokApiPanel manualFollowers={platformStats.tiktok} />}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────

export default function VileCorpDashboard() {
  const [userId, setUserId]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [newsKey]                     = useState(() => {
    try { return localStorage.getItem('ritualwear_news_key') } catch { return null }
  })

  const [platformStats, setPlatformStats] = useState(DEFAULT_PLATFORMS)
  const [pipeline, setPipeline]           = useState(DEFAULT_PIPELINE)
  const [fraudCases, setFraudCases]       = useState([])
  const [revenue, setRevenue]             = useState(DEFAULT_REVENUE)
  const [currentPhase, setCurrentPhase]   = useState(1)

  // Debounce refs for revenue (fires on every keystroke)
  const revenueTimer = useRef({})

  // ── Load all data ──────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const [platforms, pipe, fraud, rev, settings] = await Promise.all([
        supabase.from('vile_platform_stats').select('*').eq('user_id', user.id),
        supabase.from('vile_content_pipeline').select('*').eq('user_id', user.id),
        supabase.from('vile_fraud_cases').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('vile_revenue_streams').select('*').eq('user_id', user.id).order('sort_order'),
        supabase.from('vile_empire_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ])

      if (platforms.data?.length) {
        const map = { ...DEFAULT_PLATFORMS }
        platforms.data.forEach(r => { map[r.platform] = r.follower_count })
        setPlatformStats(map)
      }

      if (pipe.data?.length) {
        const map = { ...DEFAULT_PIPELINE }
        pipe.data.forEach(r => { map[r.series_id] = { stage: r.stage, note: r.note } })
        setPipeline(map)
      }

      if (fraud.data?.length) setFraudCases(fraud.data)

      if (rev.data?.length) {
        // Merge DB rows into default order; add any new defaults not yet in DB
        const dbMap = Object.fromEntries(rev.data.map(r => [r.stream, r]))
        const merged = DEFAULT_REVENUE.map(d => dbMap[d.stream] ?? d)
        setRevenue(merged)
      }

      if (settings.data) setCurrentPhase(settings.data.current_phase)

      setLoading(false)
    }
    load()
  }, [])

  // ── Handlers ───────────────────────────────────────────────────

  const savePlatform = (id, val) => {
    setPlatformStats(prev => ({ ...prev, [id]: val }))
    if (userId) upsertPlatform(userId, id, val)
  }

  const syncFromApi = (platform, count) => {
    const val = count.toString()
    setPlatformStats(prev => ({ ...prev, [platform]: val }))
    if (userId) upsertPlatform(userId, platform, val)
  }

  const savePipeline = (id, state) => {
    setPipeline(prev => ({ ...prev, [id]: state }))
    if (userId) upsertPipelineRow(userId, id, state.stage, state.note)
  }

  const savePhase = n => {
    setCurrentPhase(n)
    if (userId) upsertPhase(userId, n)
  }

  const saveRevenue = (stream, patch) => {
    setRevenue(prev => prev.map(s => s.stream === stream ? { ...s, ...patch } : s))
    // Debounce per stream so rapid typing doesn't flood Supabase
    if (userId) {
      clearTimeout(revenueTimer.current[stream])
      revenueTimer.current[stream] = setTimeout(() => {
        setRevenue(prev => {
          const s = prev.find(r => r.stream === stream)
          if (s) upsertRevenueStream(userId, s.stream, s.amount, s.notes, s.sort_order)
          return prev
        })
      }, 600)
    }
  }

  const addFraudCase = async (draft) => {
    if (!userId) return
    const optimistic = { id: crypto.randomUUID(), user_id: userId, ...draft, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    setFraudCases(prev => [...prev, optimistic])
    const { data } = await supabase.from('vile_fraud_cases').insert({ user_id: userId, ...draft }).select().single()
    if (data) setFraudCases(prev => prev.map(c => c.id === optimistic.id ? data : c))
  }

  const removeFraudCase = async (id) => {
    setFraudCases(prev => prev.filter(c => c.id !== id))
    if (userId) await supabase.from('vile_fraud_cases').delete().eq('id', id).eq('user_id', userId)
  }

  const updateFraudCase = async (id, patch) => {
    setFraudCases(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
    if (userId) await supabase.from('vile_fraud_cases').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId)
  }

  // ── Render ─────────────────────────────────────────────────────

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--c-dim)' }}>loading empire data…</p>
    </main>
  )

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
            <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.3em', color: GOLD }}>VILE CORP // EMPIRE COMMAND</p>
          </div>
          <ThemeDropdown />
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--c-dim)', marginBottom: '0.4rem' }}>
            capture · categorize · sort · commit
          </p>
          <h1 style={{ ...serif, fontSize: 'clamp(28px,4vw,52px)', fontWeight: 400, lineHeight: 1.05 }}>
            The empire, <em style={{ color: GOLD }}>in motion.</em>
          </h1>
        </div>

        {/* Empire numbers */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ ...mono, fontSize: '0.52rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--c-dim)', marginBottom: '0.75rem' }}>
            reach across platforms — click to update
          </p>
          <EmpireNumbers stats={platformStats} onChange={savePlatform} />
        </div>

        {/* Platform intelligence */}
        <Panel title="platform intelligence // live analytics" accent={GOLD} style={{ marginBottom: '1rem' }}>
          <PlatformIntelligencePanel platformStats={platformStats} onSync={syncFromApi} />
        </Panel>

        {/* Phase + Revenue row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem', marginBottom: '1rem' }}>
          <Panel title="empire phase" accent={GOLD}>
            <PhaseProgress currentPhase={currentPhase} onChange={savePhase} />
          </Panel>
          <Panel title="revenue streams // this period" accent={GOLD}>
            <RevenueStreams streams={revenue} onChange={saveRevenue} />
          </Panel>
        </div>

        {/* Pipeline */}
        <Panel title="content pipeline // series status" style={{ marginBottom: '1rem' }} accent={GOLD}>
          <ContentPipeline pipeline={pipeline} onChange={savePipeline} />
        </Panel>

        {/* Ammo + Fraud row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <Panel title="cultural ammunition // live intel">
            <CulturalAmmo newsKey={newsKey} />
          </Panel>
          <Panel title="fraud case tracker // active investigations">
            <FraudTracker
              cases={fraudCases}
              onAdd={addFraudCase}
              onRemove={removeFraudCase}
              onUpdate={updateFraudCase}
            />
          </Panel>
        </div>

        {/* Waitlist */}
        <Panel title="waitlist // vilecorp signups" accent={GOLD}>
          <WaitlistPanel />
        </Panel>

      </div>
    </main>
  )
}
