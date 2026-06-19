import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_WATCHLIST = ['SPY', 'PANW', 'SCHO', 'TLRY', 'RKLB', 'NOC', 'IRDM', 'CACI', 'RTX', 'GLD', 'DRS', 'TDG', 'KBR', 'AVAV', 'LDOS', 'VVX', 'OSK', 'NEM', 'MP']
const DEFAULT_CITIES = [
  { label: 'New York',     tz: 'America/New_York' },
  { label: 'Los Angeles',  tz: 'America/Los_Angeles' },
  { label: 'Chicago',      tz: 'America/Chicago' },
  { label: 'Nice',         tz: 'Europe/Paris' },
  { label: 'Singapore',    tz: 'Asia/Singapore' },
]

const LS = {
  get: (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback } catch { return fallback } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

const mono = { fontFamily: 'monospace' }
const serif = { fontFamily: '"Playfair Display", Georgia, serif' }
const muted = '#5a5048'
const accent = '#C4717A'
const dim = '#3a3028'
const fg = '#FAF7F2'
const panelBg = 'rgba(255,255,255,0.025)'
const panelBorder = '1px solid rgba(255,255,255,0.07)'

// ── Helpers ──────────────────────────────────────────────────────

function fmtPrice(n) { return n != null ? `$${Number(n).toFixed(2)}` : '—' }
function fmtPct(n)   { return n != null ? `${n > 0 ? '+' : ''}${Number(n).toFixed(2)}%` : '—' }
function fmtChg(n)   { return n != null ? `${n > 0 ? '+' : ''}${Number(n).toFixed(2)}` : '—' }
function ago(ts) {
  const s = Math.floor((Date.now() / 1000) - ts)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

async function fetchQuote(ticker, key) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${key}`)
    if (!r.ok) return null
    const d = await r.json()
    return { ticker, c: d.c, d: d.d, dp: d.dp, h: d.h, l: d.l, o: d.o, pc: d.pc }
  } catch { return null }
}

async function fetchNews(ticker, key) {
  try {
    const to   = new Date().toISOString().slice(0,10)
    const from = new Date(Date.now() - 14 * 864e5).toISOString().slice(0,10)
    const r = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${key}`)
    if (!r.ok) return []
    return (await r.json()).slice(0, 8)
  } catch { return [] }
}

async function fetchInsider(ticker, key) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1/stock/insider-transactions?symbol=${ticker}&token=${key}`)
    if (!r.ok) return []
    const d = await r.json()
    return (d.data ?? []).slice(0, 12)
  } catch { return [] }
}

async function fetchSEC(ticker) {
  try {
    const from = new Date(Date.now() - 90 * 864e5).toISOString().slice(0,10)
    const r = await fetch(`https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&forms=8-K,SC%2013G,SC%2013D,4&dateRange=custom&startdt=${from}&_source=file_date,period_of_report,entity_name,file_num,period_of_report,form_type,file_date`)
    if (!r.ok) return []
    const d = await r.json()
    return (d.hits?.hits ?? []).slice(0, 10).map(h => h._source)
  } catch { return [] }
}


// ── API key gate ─────────────────────────────────────────────────

function ApiKeySetup({ onSave }) {
  const [val, setVal] = useState('')
  return (
    <div style={{ padding: '2rem', background: panelBg, borderRadius: '1rem', border: panelBorder, maxWidth: 480 }}>
      <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '0.75rem' }}>
        finnhub api key required
      </p>
      <p style={{ ...serif, fontSize: '1.1rem', color: fg, marginBottom: '1.25rem' }}>
        Get a free key at <a href="https://finnhub.io" target="_blank" rel="noreferrer" style={{ color: accent }}>finnhub.io</a>
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="pk_xxxxxxxxxxxxxxx"
          style={{
            flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '4px', padding: '0.6rem 0.9rem',
            ...mono, fontSize: '0.75rem', color: fg, outline: 'none',
          }}
        />
        <button
          onClick={() => val.trim() && onSave(val.trim())}
          style={{ ...mono, fontSize: '0.65rem', letterSpacing: '0.12em', color: fg, background: 'rgba(196,113,122,0.15)', border: `1px solid ${accent}`, padding: '0.6rem 1.25rem', borderRadius: '4px', cursor: 'pointer' }}
        >
          save
        </button>
      </div>
    </div>
  )
}

// ── Live ticker bar ──────────────────────────────────────────────

function TickerBar({ quotes, selected, onSelect }) {
  if (!quotes.length) return null
  const band = [...quotes, ...quotes, ...quotes]
  return (
    <div style={{ overflow: 'hidden', borderTop: `1px solid rgba(255,255,255,0.05)`, borderBottom: `1px solid rgba(255,255,255,0.05)`, padding: '0.55rem 0', marginBottom: '1.5rem', cursor: 'pointer' }}>
      <div style={{ display: 'flex', gap: '3.5rem', whiteSpace: 'nowrap', animation: 'ticker-scroll 50s linear infinite' }}>
        {band.map((q, i) => (
          <span
            key={i}
            onClick={() => onSelect(q.ticker)}
            style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'baseline', opacity: selected && selected !== q.ticker ? 0.45 : 1, transition: 'opacity 0.2s' }}
          >
            <span style={{ ...mono, fontSize: '0.65rem', color: selected === q.ticker ? accent : fg }}>{q.ticker}</span>
            <span style={{ ...mono, fontSize: '0.65rem', color: fg }}>{fmtPrice(q.c)}</span>
            <span style={{ ...mono, fontSize: '0.6rem', color: q.dp >= 0 ? '#6AAD8A' : accent }}>{fmtPct(q.dp)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Watchlist ────────────────────────────────────────────────────

function Watchlist({ watchlist, quotes, selected, onSelect, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false)
  const [newTicker, setNewTicker] = useState('')

  const handleAdd = () => {
    const t = newTicker.trim().toUpperCase()
    if (t && !watchlist.includes(t)) onAdd(t)
    setNewTicker('')
    setAdding(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {watchlist.map(ticker => {
        const q = quotes[ticker]
        const up = q?.dp >= 0
        const active = ticker === selected
        return (
          <button
            key={ticker}
            onClick={() => onSelect(ticker)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.65rem 0.9rem',
              background: active ? 'rgba(196,113,122,0.1)' : 'rgba(255,255,255,0.02)',
              border: active ? `1px solid rgba(196,113,122,0.35)` : '1px solid rgba(255,255,255,0.05)',
              borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ ...mono, fontSize: '0.7rem', color: active ? accent : fg }}>{ticker}</span>
              {q && <span style={{ ...mono, fontSize: '0.55rem', color: muted }}>{fmtPrice(q.c)}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
              {q && <span style={{ ...mono, fontSize: '0.6rem', color: up ? '#6AAD8A' : accent }}>{fmtPct(q.dp)}</span>}
              <button
                onClick={e => { e.stopPropagation(); onRemove(ticker) }}
                style={{ ...mono, fontSize: '0.55rem', color: dim, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >×</button>
            </div>
          </button>
        )
      })}

      {adding ? (
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
          <input
            autoFocus
            value={newTicker}
            onChange={e => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="TICKER"
            maxLength={8}
            style={{
              flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '4px', padding: '0.5rem 0.65rem',
              ...mono, fontSize: '0.7rem', color: fg, outline: 'none', textTransform: 'uppercase',
            }}
          />
          <button onClick={handleAdd} style={{ ...mono, fontSize: '0.65rem', color: accent, background: 'none', border: `1px solid ${accent}`, borderRadius: '4px', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>+</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ ...mono, fontSize: '0.6rem', color: dim, background: 'none', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0.55rem', cursor: 'pointer', marginTop: '0.1rem' }}>
          + add ticker
        </button>
      )}
    </div>
  )
}

// ── World clock ──────────────────────────────────────────────────

function WorldClock({ cities, onEdit }) {
  const [times, setTimes] = useState({})

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const result = {}
      cities.forEach(city => {
        result[city.tz] = now.toLocaleTimeString('en-US', { timeZone: city.tz, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      })
      setTimes(result)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [cities])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {cities.map(city => (
        <div key={city.tz} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ ...mono, fontSize: '0.6rem', color: muted, letterSpacing: '0.1em' }}>{city.label.toUpperCase()}</span>
          <span style={{ ...mono, fontSize: '0.75rem', color: fg }}>{times[city.tz] ?? '—'}</span>
        </div>
      ))}
      <button onClick={onEdit} style={{ ...mono, fontSize: '0.55rem', color: dim, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', marginTop: '0.25rem' }}>
        edit cities ↗
      </button>
    </div>
  )
}

// ── Stock chart + detail ─────────────────────────────────────────

function StockDetail({ ticker, quote }) {
  const upDown = quote?.dp >= 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* price strip */}
      {quote && (
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ ...serif, fontSize: '2rem', color: fg, lineHeight: 1 }}>{fmtPrice(quote.c)}</span>
          <span style={{ ...mono, fontSize: '0.85rem', color: upDown ? '#6AAD8A' : accent }}>{fmtChg(quote.d)} ({fmtPct(quote.dp)})</span>
          <span style={{ ...mono, fontSize: '0.6rem', color: muted }}>H {fmtPrice(quote.h)} · L {fmtPrice(quote.l)} · prev close {fmtPrice(quote.pc)}</span>
        </div>
      )}

      {/* Finviz chart */}
      <div style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: '#000' }}>
        <img
          src={`https://finviz.com/chart.ashx?t=${ticker}&ty=c&ta=1&p=d&s=l`}
          alt={`${ticker} chart`}
          style={{ width: '100%', display: 'block', minHeight: '180px', objectFit: 'cover' }}
          key={ticker}
        />
      </div>

      {/* links */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Finviz', href: `https://finviz.com/quote.ashx?t=${ticker}` },
          { label: 'SEC EDGAR', href: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${ticker}&type=&dateb=&owner=include&count=10` },
          { label: 'Google Trends', href: `https://trends.google.com/trends/explore?q=${ticker}&geo=US` },
          { label: 'Reddit', href: `https://www.reddit.com/search/?q=${ticker}+stock&sort=hot` },
          { label: 'Short Interest', href: `https://finviz.com/screener.ashx?v=152&f=sh_short_o30` },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer"
            style={{ ...mono, fontSize: '0.6rem', color: muted, textDecoration: 'none', letterSpacing: '0.08em', borderBottom: `1px solid ${dim}` }}>
            {label} ↗
          </a>
        ))}
      </div>
    </div>
  )
}

// ── News feed ────────────────────────────────────────────────────

function NewsFeed({ items }) {
  if (!items.length) return <p style={{ ...mono, fontSize: '0.65rem', color: dim }}>no news</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
      {items.map((n, i) => (
        <a key={i} href={n.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
          <p style={{ ...mono, fontSize: '0.55rem', color: dim, marginBottom: '0.2rem' }}>{n.source} · {ago(n.datetime)}</p>
          <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: '#C8BFB0', lineHeight: 1.4 }}>{n.headline}</p>
        </a>
      ))}
    </div>
  )
}

// ── Insider transactions ─────────────────────────────────────────

function InsiderPanel({ items }) {
  if (!items.length) return <p style={{ ...mono, fontSize: '0.65rem', color: dim }}>no data</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
      {items.map((t, i) => {
        const isBuy = (t.transactionType ?? t.change ?? 0) > 0
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <p style={{ ...mono, fontSize: '0.6rem', color: isBuy ? '#6AAD8A' : accent }}>
                {isBuy ? 'BUY' : 'SELL'} · {t.name ?? t.filingPerson ?? '—'}
              </p>
              <p style={{ ...mono, fontSize: '0.55rem', color: muted }}>{t.transactionDate ?? t.filingDate ?? '—'}</p>
            </div>
            <p style={{ ...mono, fontSize: '0.65rem', color: isBuy ? '#6AAD8A' : accent }}>
              {t.change != null ? `${t.change > 0 ? '+' : ''}${Number(t.change).toLocaleString()}` : '—'}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ── SEC filings ──────────────────────────────────────────────────

function SECPanel({ items }) {
  if (!items.length) return <p style={{ ...mono, fontSize: '0.65rem', color: dim }}>no recent filings</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
      {items.map((f, i) => (
        <div key={i} style={{ padding: '0.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', marginBottom: '0.15rem' }}>
            <span style={{ ...mono, fontSize: '0.6rem', color: accent }}>{f.form_type}</span>
            <span style={{ ...mono, fontSize: '0.55rem', color: dim }}>{f.file_date}</span>
          </div>
          <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.75rem', color: '#C8BFB0', lineHeight: 1.3 }}>
            {f.entity_name}
          </p>
        </div>
      ))}
    </div>
  )
}


// ── Itinerary widget ─────────────────────────────────────────────

const TODAY_KEY = () => `robin_itinerary_${new Date().toISOString().slice(0, 10)}`

function ItineraryWidget() {
  const [items, setItems]     = useState(() => LS.get(TODAY_KEY(), []))
  const [time, setTime]       = useState('')
  const [note, setNote]       = useState('')
  const [editingIdx, setEditingIdx] = useState(null)
  const [editNote, setEditNote]     = useState('')
  const noteRef = useRef(null)

  // reset each new day
  useEffect(() => {
    const key = TODAY_KEY()
    setItems(LS.get(key, []))
  }, [])

  const persist = (next) => { setItems(next); LS.set(TODAY_KEY(), next) }

  const add = () => {
    const t = note.trim()
    if (!t) return
    const entry = { time: time.trim() || null, note: t, done: false, id: Date.now() }
    const next = [...items, entry].sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })
    persist(next)
    setTime(''); setNote('')
    noteRef.current?.focus()
  }

  const toggle = id => persist(items.map(it => it.id === id ? { ...it, done: !it.done } : it))
  const remove = id => persist(items.filter(it => it.id !== id))
  const saveEdit = id => {
    persist(items.map(it => it.id === id ? { ...it, note: editNote } : it))
    setEditingIdx(null)
  }
  const clearDone = () => persist(items.filter(it => !it.done))

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const done = items.filter(i => i.done).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
        <p style={{ ...mono, fontSize: '0.6rem', color: muted }}>{today}</p>
        {done > 0 && (
          <button onClick={clearDone} style={{ ...mono, fontSize: '0.55rem', color: dim, background: 'none', border: 'none', cursor: 'pointer' }}>
            clear done ({done})
          </button>
        )}
      </div>

      {/* add row */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          value={time}
          onChange={e => setTime(e.target.value)}
          placeholder="9:00"
          style={{
            width: '56px', flexShrink: 0,
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px', padding: '0.5rem 0.6rem',
            ...mono, fontSize: '0.7rem', color: fg, outline: 'none',
          }}
        />
        <input
          ref={noteRef}
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="add to your day…"
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px', padding: '0.5rem 0.75rem',
            fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: fg, outline: 'none',
          }}
        />
        <button onClick={add}
          style={{ ...mono, fontSize: '0.65rem', color: accent, background: 'none', border: `1px solid ${accent}`, borderRadius: '4px', padding: '0.5rem 0.85rem', cursor: 'pointer', flexShrink: 0 }}>
          +
        </button>
      </div>

      {/* items */}
      {items.length === 0 && (
        <p style={{ ...mono, fontSize: '0.6rem', color: dim }}>nothing yet — add something above</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
        {items.map((it) => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.55rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {/* checkbox */}
            <button
              onClick={() => toggle(it.id)}
              style={{
                flexShrink: 0, marginTop: '2px',
                width: 14, height: 14, borderRadius: '3px',
                border: it.done ? `1px solid #6AAD8A` : '1px solid rgba(255,255,255,0.2)',
                background: it.done ? 'rgba(106,173,138,0.2)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {it.done && <span style={{ color: '#6AAD8A', fontSize: '9px', lineHeight: 1 }}>✓</span>}
            </button>

            {/* time */}
            {it.time && (
              <span style={{ ...mono, fontSize: '0.6rem', color: dim, flexShrink: 0, marginTop: '2px', width: '38px' }}>{it.time}</span>
            )}

            {/* note — click to edit inline */}
            <div style={{ flex: 1 }}>
              {editingIdx === it.id ? (
                <input
                  autoFocus
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(it.id); if (e.key === 'Escape') setEditingIdx(null) }}
                  onBlur={() => saveEdit(it.id)}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${accent}`, outline: 'none', fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: fg, padding: '0 0 2px' }}
                />
              ) : (
                <span
                  onClick={() => { setEditingIdx(it.id); setEditNote(it.note) }}
                  style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: it.done ? dim : '#C8BFB0', cursor: 'text', textDecoration: it.done ? 'line-through' : 'none', lineHeight: 1.4 }}
                >
                  {it.note}
                </span>
              )}
            </div>

            {/* remove */}
            <button onClick={() => remove(it.id)}
              style={{ ...mono, fontSize: '0.6rem', color: dim, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── FIRE overview widget ─────────────────────────────────────────

const DEFAULT_FIRE = {
  assets:        150000,
  studentLoans:  30000,
  creditCards:   20000,
  otherDebts:    0,
  currentSalary: 0,
  incomeTarget:  20000,   // amount OVER salary desired
  fireNumber:    2500000,
  annualReturn:  7,       // % assumed growth rate
  annualSavings: 0,       // how much saved per year
}

function fmtDollar(n) {
  if (n == null || n === '') return '—'
  const abs = Math.abs(Number(n))
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `$${(abs / 1_000).toFixed(1)}k`
  return `$${abs.toLocaleString()}`
}

function yearsToFire(netWorth, fireNumber, annualSavings, annualReturn) {
  if (!annualSavings || annualSavings <= 0) return null
  const r = annualReturn / 100
  if (netWorth >= fireNumber) return 0
  // FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
  // solve for n numerically
  let n = 0
  let fv = netWorth
  while (fv < fireNumber && n < 100) {
    fv = fv * (1 + r) + annualSavings
    n++
  }
  return n < 100 ? n : null
}

function ProgressBar({ pct, color = accent }) {
  const capped = Math.min(pct, 100)
  return (
    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${capped}%`,
        background: pct >= 100 ? '#6AAD8A' : `linear-gradient(90deg, ${color}, #A89BC4)`,
        borderRadius: '3px',
        transition: 'width 0.6s ease',
        boxShadow: `0 0 8px ${color}55`,
      }} />
    </div>
  )
}

function FireWidget() {
  const [data, setData]     = useState(() => LS.get('robin_fire', DEFAULT_FIRE))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]   = useState(data)

  const save = () => { LS.set('robin_fire', draft); setData(draft); setEditing(false) }
  const set  = (k, v) => setDraft(d => ({ ...d, [k]: v === '' ? '' : Number(v) }))

  const totalDebts = (data.studentLoans || 0) + (data.creditCards || 0) + (data.otherDebts || 0)
  const netWorth   = (data.assets || 0) - totalDebts
  const firePct    = data.fireNumber ? (netWorth / data.fireNumber) * 100 : 0
  const incomeNeeded = (data.currentSalary || 0) + (data.incomeTarget || 0)
  const incomeGap    = incomeNeeded - (data.currentSalary || 0)
  const yearsEst   = yearsToFire(netWorth, data.fireNumber, data.annualSavings, data.annualReturn)

  const Field = ({ label, k, prefix = '$' }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: muted }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <span style={{ ...mono, fontSize: '0.7rem', color: dim }}>{prefix}</span>
        <input
          type="number"
          value={draft[k] ?? ''}
          onChange={e => set(k, e.target.value)}
          style={{
            flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px', padding: '0.45rem 0.6rem',
            ...mono, fontSize: '0.7rem', color: fg, outline: 'none', width: '100%',
          }}
        />
      </div>
    </div>
  )

  if (editing) return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <Field label="Total assets"       k="assets" />
        <Field label="Student loans"      k="studentLoans" />
        <Field label="Credit cards"       k="creditCards" />
        <Field label="Other debts"        k="otherDebts" />
        <Field label="Current salary"     k="currentSalary" />
        <Field label="Income target above salary" k="incomeTarget" />
        <Field label="FIRE number"        k="fireNumber" />
        <Field label="Annual savings"     k="annualSavings" />
        <Field label="Assumed return %"   k="annualReturn" prefix="%" />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={save}
          style={{ ...mono, fontSize: '0.65rem', color: fg, background: 'rgba(196,113,122,0.15)', border: `1px solid ${accent}`, padding: '0.55rem 1.25rem', borderRadius: '4px', cursor: 'pointer' }}>
          save
        </button>
        <button onClick={() => { setDraft(data); setEditing(false) }}
          style={{ ...mono, fontSize: '0.65rem', color: muted, background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '0.55rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
          cancel
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {/* top edit button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button onClick={() => { setDraft(data); setEditing(true) }}
          style={{ ...mono, fontSize: '0.55rem', color: dim, background: 'none', border: 'none', cursor: 'pointer' }}>
          edit ↗
        </button>
      </div>

      {/* FIRE progress — hero element */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
          <span style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.12em', color: muted, textTransform: 'uppercase' }}>progress to FIRE</span>
          <span style={{ ...mono, fontSize: '0.85rem', color: firePct >= 100 ? '#6AAD8A' : fg }}>{firePct.toFixed(2)}%</span>
        </div>
        <ProgressBar pct={firePct} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
          <span style={{ ...mono, fontSize: '0.55rem', color: dim }}>{fmtDollar(netWorth)} net worth</span>
          <span style={{ ...mono, fontSize: '0.55rem', color: dim }}>{fmtDollar(data.fireNumber)} target</span>
        </div>
      </div>

      {/* stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>

        {/* assets */}
        <div style={{ padding: '1rem', background: 'rgba(106,173,138,0.06)', border: '1px solid rgba(106,173,138,0.15)', borderRadius: '0.75rem' }}>
          <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6AAD8A', marginBottom: '0.35rem' }}>assets</p>
          <p style={{ ...serif, fontSize: '1.5rem', color: fg, lineHeight: 1 }}>{fmtDollar(data.assets)}</p>
        </div>

        {/* net worth */}
        <div style={{ padding: '1rem', background: netWorth >= 0 ? 'rgba(106,173,138,0.06)' : 'rgba(196,113,122,0.06)', border: `1px solid ${netWorth >= 0 ? 'rgba(106,173,138,0.15)' : 'rgba(196,113,122,0.15)'}`, borderRadius: '0.75rem' }}>
          <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: netWorth >= 0 ? '#6AAD8A' : accent, marginBottom: '0.35rem' }}>net worth</p>
          <p style={{ ...serif, fontSize: '1.5rem', color: fg, lineHeight: 1 }}>{fmtDollar(netWorth)}</p>
        </div>

        {/* still needed */}
        <div style={{ padding: '1rem', background: panelBg, border: panelBorder, borderRadius: '0.75rem' }}>
          <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, marginBottom: '0.35rem' }}>still needed</p>
          <p style={{ ...serif, fontSize: '1.5rem', color: fg, lineHeight: 1 }}>{fmtDollar(Math.max(0, (data.fireNumber || 0) - netWorth))}</p>
        </div>

        {/* years to FIRE */}
        <div style={{ padding: '1rem', background: panelBg, border: panelBorder, borderRadius: '0.75rem' }}>
          <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, marginBottom: '0.35rem' }}>est. years to FIRE</p>
          <p style={{ ...serif, fontSize: '1.5rem', color: fg, lineHeight: 1 }}>
            {yearsEst != null ? yearsEst : '—'}
          </p>
          {!data.annualSavings && <p style={{ ...mono, fontSize: '0.55rem', color: dim, marginTop: '0.3rem' }}>add annual savings to calculate</p>}
        </div>

      </div>

      {/* debt + income breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        {/* debt breakdown */}
        <div>
          <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: muted, marginBottom: '0.75rem' }}>debt breakdown</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'student loans', value: data.studentLoans },
              { label: 'credit cards',  value: data.creditCards },
              { label: 'other',         value: data.otherDebts },
            ].filter(d => d.value).map(d => {
              const pct = totalDebts ? (d.value / totalDebts) * 100 : 0
              return (
                <div key={d.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ ...mono, fontSize: '0.6rem', color: muted }}>{d.label}</span>
                    <span style={{ ...mono, fontSize: '0.6rem', color: accent }}>{fmtDollar(d.value)}</span>
                  </div>
                  <ProgressBar pct={pct} color={accent} />
                </div>
              )
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ ...mono, fontSize: '0.6rem', color: fg }}>total</span>
              <span style={{ ...mono, fontSize: '0.65rem', color: accent }}>{fmtDollar(totalDebts)}</span>
            </div>
          </div>
        </div>

        {/* income tracker */}
        <div>
          <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: muted, marginBottom: '0.75rem' }}>income target</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ ...mono, fontSize: '0.6rem', color: muted }}>current salary</span>
              <span style={{ ...mono, fontSize: '0.6rem', color: fg }}>{data.currentSalary ? fmtDollar(data.currentSalary) : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ ...mono, fontSize: '0.6rem', color: muted }}>target above salary</span>
              <span style={{ ...mono, fontSize: '0.65rem', color: '#6AAD8A' }}>+{fmtDollar(data.incomeTarget)}</span>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ ...mono, fontSize: '0.6rem', color: fg }}>income needed</span>
              <span style={{ ...serif, fontSize: '1.1rem', color: '#6AAD8A', lineHeight: 1 }}>{data.currentSalary ? fmtDollar(incomeNeeded) : `+${fmtDollar(incomeGap)} over salary`}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Ritualwealth user stats ───────────────────────────────────────

function SuiteStats() {
  const [ov, setOv] = useState(null)
  useEffect(() => {
    supabase.rpc('robin_overview').then(({ data }) => setOv(data))
  }, [])
  if (!ov) return null
  const stats = [
    { label: 'Total wealth users', value: ov.total_users },
    { label: 'Completed FIRE quiz', value: ov.with_glow_up },
    { label: 'Debt payoff plans', value: ov.with_neighborhood },
    { label: 'Avg formality score', value: ov.avg_lifestyle_formality, sub: '/ 5' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
      {stats.map(s => (
        <div key={s.label} style={{ padding: '1.25rem', background: panelBg, borderRadius: '0.75rem', border: panelBorder }}>
          <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: muted, marginBottom: '0.5rem' }}>{s.label}</p>
          <p style={{ ...serif, fontSize: '1.75rem', color: fg, lineHeight: 1 }}>{s.value ?? '—'}</p>
          {s.sub && <p style={{ ...mono, fontSize: '0.6rem', color: dim, marginTop: '0.25rem' }}>{s.sub}</p>}
        </div>
      ))}
    </div>
  )
}

// ── City editor modal ─────────────────────────────────────────────

function CityEditor({ cities, onSave, onClose }) {
  const [list, setList] = useState(cities)
  const [newLabel, setNewLabel] = useState('')
  const [newTz, setNewTz] = useState('')

  const commonTzs = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Toronto', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris',
    'Europe/Berlin', 'Europe/Moscow', 'Asia/Dubai', 'Asia/Kolkata',
    'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#171410', border: panelBorder, borderRadius: '1rem', padding: '2rem', maxWidth: 420, width: '90%' }}>
        <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '1rem' }}>edit world clock</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
          {list.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ ...mono, fontSize: '0.65rem', color: fg }}>{c.label}</span>
              <button onClick={() => setList(list.filter((_, j) => j !== i))}
                style={{ ...mono, fontSize: '0.6rem', color: dim, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="City name"
            style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.5rem 0.7rem', ...mono, fontSize: '0.65rem', color: fg, outline: 'none' }} />
        </div>
        <select value={newTz} onChange={e => setNewTz(e.target.value)}
          style={{ width: '100%', marginBottom: '0.75rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.5rem 0.7rem', ...mono, fontSize: '0.65rem', color: newTz ? fg : muted, outline: 'none' }}>
          <option value="">select timezone</option>
          {commonTzs.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => { if (newLabel && newTz) { setList([...list, { label: newLabel, tz: newTz }]); setNewLabel(''); setNewTz('') } }}
            style={{ ...mono, fontSize: '0.6rem', color: accent, background: 'none', border: `1px solid ${accent}`, borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            add city
          </button>
          <button onClick={() => { onSave(list); onClose() }}
            style={{ ...mono, fontSize: '0.6rem', color: fg, background: 'rgba(196,113,122,0.15)', border: `1px solid ${accent}`, borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer', marginLeft: 'auto' }}>
            save
          </button>
          <button onClick={onClose}
            style={{ ...mono, fontSize: '0.6rem', color: muted, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Panel wrapper ─────────────────────────────────────────────────

function Panel({ title, children, style }) {
  return (
    <div style={{ padding: '1.5rem', background: panelBg, borderRadius: '1rem', border: panelBorder, ...style }}>
      <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '1.1rem' }}>{title}</p>
      {children}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────

export default function WealthDashboard() {
  const [apiKey, setApiKey]         = useState(() => LS.get('robin_finnhub_key', null))
  const [watchlist, setWatchlist]   = useState(() => LS.get('robin_watchlist', DEFAULT_WATCHLIST))
  const [cities, setCities]         = useState(() => LS.get('robin_clock_cities', DEFAULT_CITIES))
  const [selected, setSelected]     = useState(watchlist[0])
  const [quotes, setQuotes]         = useState({})
  const [news, setNews]             = useState([])
  const [insider, setInsider]       = useState([])
  const [secFiles, setSecFiles]     = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [editingCities, setEditingCities] = useState(false)
  const quoteTimer = useRef(null)

  const saveApiKey = useCallback(k => {
    LS.set('robin_finnhub_key', k)
    setApiKey(k)
  }, [])

  const addTicker = useCallback(t => {
    setWatchlist(prev => { const next = [...prev, t]; LS.set('robin_watchlist', next); return next })
  }, [])

  const removeTicker = useCallback(t => {
    setWatchlist(prev => { const next = prev.filter(x => x !== t); LS.set('robin_watchlist', next); if (selected === t) setSelected(next[0] ?? null); return next })
  }, [selected])

  const saveCities = useCallback(list => {
    setCities(list)
    LS.set('robin_clock_cities', list)
  }, [])


  // fetch all quotes
  const fetchAllQuotes = useCallback(async () => {
    if (!apiKey || !watchlist.length) return
    const results = await Promise.all(watchlist.map(t => fetchQuote(t, apiKey)))
    setQuotes(Object.fromEntries(results.filter(Boolean).map(q => [q.ticker, q])))
  }, [apiKey, watchlist])

  useEffect(() => {
    fetchAllQuotes()
    quoteTimer.current = setInterval(fetchAllQuotes, 30_000)
    return () => clearInterval(quoteTimer.current)
  }, [fetchAllQuotes])

  // fetch detail panel when selection changes
  useEffect(() => {
    if (!selected || !apiKey) return
    setLoadingDetail(true)
    setNews([]); setInsider([]); setSecFiles([])
    Promise.all([
      fetchNews(selected, apiKey),
      fetchInsider(selected, apiKey),
      fetchSEC(selected),
    ]).then(([n, ins, sec]) => {
      setNews(n); setInsider(ins); setSecFiles(sec)
      setLoadingDetail(false)
    })
  }, [selected, apiKey])

  const quoteList = Object.values(quotes)

  return (
    <main style={{ minHeight: '100vh', background: '#0D0F0E', color: fg, padding: 'clamp(2rem,4vw,3.5rem) clamp(1rem,3vw,2.5rem)' }}>
      <style>{`
        @keyframes ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
          <Link to="/" style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.15em', color: muted, textDecoration: 'none' }}>← robin</Link>
          <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: accent }}>RITUALWEALTH // FIRE COMMAND</p>
        </div>

        {/* API key gate */}
        {!apiKey && (
          <div style={{ marginBottom: '2rem' }}>
            <ApiKeySetup onSave={saveApiKey} />
          </div>
        )}

        {/* Live ticker — click any ticker to open its detail */}
        {quoteList.length > 0 && <TickerBar quotes={quoteList} selected={selected} onSelect={t => setSelected(prev => prev === t ? null : t)} />}

        {/* Main 2-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '1rem', marginBottom: '1rem', alignItems: 'start' }}>

          {/* Center: stock detail */}
          <Panel title={selected ? `${selected} // analysis` : 'click any ticker above'}>
            {selected
              ? <StockDetail ticker={selected} quote={quotes[selected]} />
              : <p style={{ ...mono, fontSize: '0.65rem', color: dim }}>click a ticker in the bar to pull up its chart, filings, and insider moves</p>
            }
          </Panel>

          {/* Right: world clock */}
          <Panel title="world clock">
            <WorldClock cities={cities} onEdit={() => setEditingCities(true)} />
          </Panel>

        </div>

        {/* Culture & fraud analysis row */}
        {selected && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Panel title={`sec filings // ${selected}`}>
              {loadingDetail
                ? <p style={{ ...mono, fontSize: '0.6rem', color: dim }}>loading…</p>
                : <SECPanel items={secFiles} />}
            </Panel>
            <Panel title={`insider moves // ${selected}`}>
              {loadingDetail
                ? <p style={{ ...mono, fontSize: '0.6rem', color: dim }}>loading…</p>
                : <InsiderPanel items={insider} />}
            </Panel>
          </div>
        )}

        {/* News + Calendar row */}
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.4fr' : '1fr', gap: '1rem', marginBottom: '1rem' }}>
          {selected && (
            <Panel title={`news // ${selected}`}>
              {loadingDetail
                ? <p style={{ ...mono, fontSize: '0.6rem', color: dim }}>loading…</p>
                : <NewsFeed items={news} />}
            </Panel>
          )}
          <Panel title="itinerary // today">
            <ItineraryWidget />
          </Panel>
        </div>

        {/* FIRE overview */}
        <Panel title="financial overview // fire" style={{ marginBottom: '1rem' }}>
          <FireWidget />
        </Panel>

        {/* Ritualwealth suite stats */}
        <Panel title="ritualwealth // suite data" style={{ marginBottom: '1rem' }}>
          <SuiteStats />
        </Panel>

        {/* API key edit */}
        {apiKey && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button onClick={() => { LS.set('robin_finnhub_key', null); setApiKey(null) }}
              style={{ ...mono, fontSize: '0.55rem', color: dim, background: 'none', border: 'none', cursor: 'pointer' }}>
              reset finnhub key
            </button>
          </div>
        )}

      </div>

      {/* City editor modal */}
      {editingCities && <CityEditor cities={cities} onSave={saveCities} onClose={() => setEditingCities(false)} />}
    </main>
  )
}
