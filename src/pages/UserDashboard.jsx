import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import DoTheDash from './DoTheDash'
import ThemeDropdown from '../components/ThemeDropdown'
import { useThemeStore } from '../stores/useThemeStore'

// ── Brand ──────────────────────────────────────────────────────────
const ROBIN_BG    = '#1C0905'
const ROBIN_MID   = '#2E100A'
const ROBIN_WARM  = '#C4622D'
const CREAM       = '#FAF0E8'
const CREAM_DIM   = 'rgba(250,240,232,0.45)'
const CREAM_MUTED = 'rgba(250,240,232,0.22)'

const serif   = { fontFamily: '"Cormorant Garamond","Playfair Display",Georgia,serif' }
const display = { fontFamily: '"Playfair Display",Georgia,serif' }
const sans    = { fontFamily: '"DM Sans",system-ui,sans-serif' }
const mono    = { fontFamily: 'monospace' }
const fmt     = s => String(s ?? '').replace(/_/g, ' ')

// ── App config ─────────────────────────────────────────────────────
const APP = {
  ritualwear:   { color: '#C4717A', url: 'https://wear.ritualware.app',   label: 'Ritualwear',   sub: 'oracle'   },
  glowup:       { color: '#C4A96E', url: 'https://glowup.ritualware.app', label: 'Glow Up',      sub: 'pyramid'  },
  ritualwhere:  { color: '#6AAD8A', url: 'https://where.ritualware.app',  label: 'Ritualwhere?', sub: 'map'      },
  ritualwealth: { color: '#A89BC4', url: 'https://wealth.ritualware.app', label: 'Ritualwealth', sub: 'fire'     },
  matelier:     { color: '#B07840', url: 'https://studio.ritualware.app', label: "m'atelier",    sub: 'studio'   },
}

const FIRE_QUIZZES = [
  { slug: 'fire_type', label: 'FIRE Type' },
  { slug: 'career',    label: 'Career'    },
  { slug: 'home',      label: 'Home'      },
  { slug: 'creative',  label: 'Creative'  },
  { slug: 'risk',      label: 'Risk'      },
]

const GLOW_CATEGORIES = [
  'skin','sleep','nutrition','fitness','hair','face','body','teeth','fragrance','services','fashion','mindset',
]

// ── Faux data (fully loaded demo profile) ─────────────────────────
const FAUX_DATA = {
  ritualwear: {
    profile: {
      kibbe_type:   'soft_dramatic',
      color_season: 'Autumn',
      undertone:    'Warm',
      metal:        'Gold',
      formality:    'Always Elevated',
      style_words:  ['Sensual', 'Dreamy', 'Subversive', 'Maximalist', 'Theatrical'],
      palette:      ['Jewel Tones', 'Warm Neutrals', 'Earth Tones', 'Deep Burgundy', 'Rust', 'Ivory'],
      designer_dna: ['Saint Laurent', 'Mugler', 'Alaïa', 'Valentino', 'Versace', 'Cavalli', 'Tom Ford', 'Bottega', 'Vintage Couture'],
      fabrics:      ['Silk', 'Satin', 'Cashmere', 'Velvet', 'Chiffon', 'Leather'],
    },
    looksCount: 47,
  },
  glowup: {
    glowUp: {
      result: {
        overall_tier:   'Professional Grooming',
        headline:       'You are already doing the work. The gap is in the elevated services.',
        strongest_area: 'Fragrance',
        skin:       { score: 9,  verdict: 'Your skin is your strongest asset. Consistent routine, minimal texture, good clarity.' },
        sleep:      { score: 7,  verdict: 'Functional but not restorative. You are productive on six hours but not thriving on it.' },
        nutrition:  { score: 7,  verdict: 'You know what works. You are not always doing it. The gap is consistency, not knowledge.' },
        fitness:    { score: 7,  verdict: 'Active enough to maintain, not training enough to transform. A structured approach accelerates everything.' },
        hair:       { score: 8,  verdict: 'Healthy, styled, intentional. You know your hair — professional maintenance is the next layer.' },
        face:       { score: 9,  verdict: 'Your makeup is editorial. The technique is there. Investment in services would seal it.' },
        body:       { score: 7,  verdict: 'You present beautifully but underlying work could be more consistent. Body care as ritual, not afterthought.' },
        teeth:      { score: 8,  verdict: 'Clean, cared for, consistent. Whitening maintenance would close the gap.' },
        fragrance:  { score: 10, verdict: 'This is your signature and your superpower. You understand fragrance as identity, not accessory.' },
        services:   { score: 6,  verdict: 'This is the gap. You are overdue on professional-level maintenance. Book the appointments.' },
        fashion:    { score: 9,  verdict: 'Intentional, editorial, yours. The wardrobe is doing what it is supposed to do.' },
        mindset:    { score: 8,  verdict: 'You believe in yourself. The work is in translating that belief into consistency when it is inconvenient.' },
      },
    },
    styleFinder: {
      archetype: 'The Romantic',
      result: {
        persona_name: 'The one who makes everything feel intentional.',
        blind_spots:  ['Overthinks the practical', 'Underestimates how much the room is already watching', 'Confuses warmth with availability'],
        style_words:  ['Lush', 'Tactile', 'Opulent', 'Warm', 'Magnetic'],
      },
    },
  },
  ritualwhere: {
    neighborhood: { top_match: 'West Village' },
    burnout: {
      burnout_type: 'The Overachiever',
      severity:     6,
      is_chronic:   true,
      protocol:     'Rest as strategy, not collapse.',
    },
    reinvention: {
      priority_area: 'Skills',
      moves: [
        'Your target: Film Scoring — block 3 hours minimum per week.',
        'Find one resource (mentor, project, or course) that accelerates it.',
        'Tell one person what you are building — accountability is not optional.',
      ],
      quarter: 'Q2 2026',
    },
    dating: {
      dating_goal:   'Intentional partnership',
      dominant_type: 'Selective',
      main_strategy: 'Stop auditioning for people who have not yet proven themselves.',
      pattern:       'over_invest',
    },
  },
  ritualwealth: {
    firePlan: { fire_type: 'Fat Fire', target_number: 2000000, target_age: 47 },
    fireQuizzes: { fire_type: true, career: true, home: true, creative: true, risk: true },
    savings: [
      { name: 'Emergency Fund',      current: 24000,  target: 30000   },
      { name: 'Investments',         current: 210000, target: 1000000 },
      { name: 'Real Estate Fund',    current: 80000,  target: 400000  },
      { name: 'Travel & Experience', current: 8000,   target: 20000   },
      { name: 'Creative Capital',    current: 42000,  target: 50000   },
    ],
  },
  matelier: {
    projects: [
      { name: 'Distressed & Darling',    status: 'active' },
      { name: 'VILE LLC Brand Identity', status: 'active' },
      { name: 'Ritualware Suite',        status: 'active' },
      { name: 'Film Score — TBD',        status: 'active' },
    ],
    goals: [
      { title: 'Release debut album',      is_complete: true  },
      { title: 'Launch Ritualwear beta',   is_complete: true  },
      { title: 'First sync placement',     is_complete: false },
      { title: '100k YouTube subscribers', is_complete: false },
      { title: 'Score a feature film',     is_complete: false },
    ],
    skills: [
      { label: 'Music Composition',    category: 'creative',    level: 'expert'   },
      { label: 'Film Scoring',         category: 'creative',    level: 'advanced' },
      { label: 'Systems Architecture', category: 'technical',   level: 'expert'   },
      { label: 'Content Strategy',     category: 'business',    level: 'advanced' },
      { label: 'Fraud Analysis',       category: 'analytical',  level: 'advanced' },
    ],
    circle: [
      { name: 'Core Collaborator', role: 'producer' },
      { name: 'Legal',             role: 'advisor'  },
      { name: 'Brand Strategist',  role: 'advisor'  },
    ],
  },
}

// ── Data fetch ─────────────────────────────────────────────────────
async function fetchModuleData(userId) {
  const [
    styleProfile, savedLooks,
    glowUp, styleFinder,
    neighborhood, burnout, reinvention, dating,
    firePlan, savings, fireQuizResults,
    projects, goals, skills, circle,
  ] = await Promise.all([
    supabase.from('style_profiles').select('kibbe_type,color_season,style_words,undertone,metal,formality,palette,designer_dna,fabrics').eq('user_id', userId).maybeSingle(),
    supabase.from('saved_looks').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('glow_up_results').select('result').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('style_finder_results').select('archetype,result').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('neighborhood_results').select('top_match').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('burnout_results').select('burnout_type,severity,is_chronic,protocol').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('reinvention_plans').select('priority_area,moves,quarter').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('dating_profiles').select('dating_goal,dominant_type,main_strategy,pattern').eq('user_id', userId).maybeSingle(),
    supabase.from('user_fire_plans').select('fire_type,target_number,target_age').eq('user_id', userId).maybeSingle(),
    supabase.from('user_savings_buckets').select('name,target,current').eq('user_id', userId).order('sort_order'),
    supabase.from('fire_quiz_results').select('quiz_slug').eq('user_id', userId),
    supabase.from('atelier_projects').select('name,status').eq('user_id', userId).eq('status', 'active'),
    supabase.from('atelier_goals').select('title,is_complete').eq('user_id', userId),
    supabase.from('atelier_skills').select('label,category,level').eq('user_id', userId),
    supabase.from('atelier_circle').select('name,role').eq('user_id', userId),
  ])

  const doneQ = new Set((fireQuizResults.data ?? []).map(r => r.quiz_slug))

  return {
    ritualwear:   { profile: styleProfile.data, looksCount: savedLooks.count ?? 0 },
    glowup:       { glowUp: glowUp.data, styleFinder: styleFinder.data },
    ritualwhere:  { neighborhood: neighborhood.data, burnout: burnout.data, reinvention: reinvention.data, dating: dating.data },
    ritualwealth: {
      firePlan: firePlan.data,
      savings:  savings.data ?? [],
      fireQuizzes: { fire_type: doneQ.has('fire_type'), career: doneQ.has('career'), home: doneQ.has('home'), creative: doneQ.has('creative'), risk: doneQ.has('risk') },
    },
    matelier: { projects: projects.data ?? [], goals: goals.data ?? [], skills: skills.data ?? [], circle: circle.data ?? [] },
  }
}

// ── Shared primitives ──────────────────────────────────────────────
function FL({ children, color }) {
  return (
    <p style={{ ...mono, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: color || CREAM_MUTED, marginBottom: '3px', marginTop: '10px' }}>
      {children}
    </p>
  )
}

function FVBig({ children, color }) {
  return <p style={{ ...display, fontSize: '16px', color: color || CREAM, textTransform: 'capitalize', lineHeight: 1.1 }}>{children}</p>
}

function FV({ children, style = {} }) {
  return <p style={{ ...sans, fontSize: '13px', color: CREAM, textTransform: 'capitalize', ...style }}>{children}</p>
}

function Tag({ children, color }) {
  return (
    <span style={{ ...mono, fontSize: '10px', letterSpacing: '0.06em', color, border: `1px solid ${color}35`, borderRadius: '3px', padding: '2px 8px', textTransform: 'capitalize', display: 'inline-block', margin: '2px 2px 0 0' }}>
      {children}
    </span>
  )
}

function Bar({ pct, color, height = 2 }) {
  return (
    <div style={{ height, background: `${color}18`, borderRadius: '2px', overflow: 'hidden', margin: '4px 0 3px' }}>
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{ height: '100%', background: color, borderRadius: '2px' }}
      />
    </div>
  )
}

function GoDeeper({ appKey }) {
  const app = APP[appKey]
  return (
    <a href={app.url} target="_blank" rel="noreferrer"
      style={{ ...mono, fontSize: '9px', letterSpacing: '0.15em', color: app.color, textDecoration: 'none', opacity: 0.65, display: 'block', marginTop: '14px' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.65'}>
      go deeper in {app.label} ↗
    </a>
  )
}

function EmptySlate({ appKey, text, cta, href }) {
  const app = APP[appKey]
  return (
    <div>
      <p style={{ ...serif, fontStyle: 'italic', fontSize: '15px', color: CREAM_DIM, lineHeight: 1.65, marginBottom: '10px' }}>{text}</p>
      <a href={href} target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '9px', letterSpacing: '0.15em', color: app.color, textDecoration: 'none' }}>{cta} ↗</a>
    </div>
  )
}

function CardShell({ appKey, children }) {
  const app = APP[appKey]
  return (
    <div style={{ background: ROBIN_MID, border: `1px solid ${ROBIN_WARM}18`, borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <p style={{ ...mono, fontSize: '9px', letterSpacing: '0.25em', color: app.color, marginBottom: '2px' }}>{app.sub.toUpperCase()}</p>
          <p style={{ ...display, fontSize: '17px', color: CREAM, lineHeight: 1 }}>{app.label}</p>
        </div>
        <a href={app.url} target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '9px', color: CREAM_MUTED, textDecoration: 'none', opacity: 0.45 }}>open ↗</a>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
      <GoDeeper appKey={appKey} />
    </div>
  )
}

// ── DASHBOARD: Style card ──────────────────────────────────────────
function StyleCard({ data }) {
  const { profile, looksCount } = data
  const app = APP.ritualwear
  if (!profile?.kibbe_type) return (
    <CardShell appKey="ritualwear">
      <EmptySlate appKey="ritualwear" text="Take the Style Bible quiz to decode your body type, colour season, and the rules that make your wardrobe feel like yours." cta="Take the Style Bible" href="https://wear.ritualware.app/quiz" />
    </CardShell>
  )
  return (
    <CardShell appKey="ritualwear">
      <FL color={app.color}>Body type</FL>
      <FVBig color={app.color}>{fmt(profile.kibbe_type)}</FVBig>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <div><FL color={app.color}>Colour season</FL><FV>{fmt(profile.color_season)}</FV></div>
        <div><FL color={app.color}>Undertone</FL><FV>{fmt(profile.undertone)}</FV></div>
        <div><FL color={app.color}>Metal</FL><FV>{fmt(profile.metal)}</FV></div>
        <div><FL color={app.color}>Formality</FL><FV>{fmt(profile.formality)}</FV></div>
      </div>
      {profile.style_words?.length > 0 && (
        <div>
          <FL color={app.color}>Style words</FL>
          <div style={{ marginTop: '4px' }}>{profile.style_words.map(w => <Tag key={w} color={app.color}>{fmt(w)}</Tag>)}</div>
        </div>
      )}
      {profile.palette?.length > 0 && (
        <div>
          <FL color={app.color}>Palette</FL>
          <div style={{ marginTop: '4px' }}>{profile.palette.map(p => <Tag key={p} color={app.color}>{fmt(p)}</Tag>)}</div>
        </div>
      )}
      {profile.designer_dna?.length > 0 && (
        <div>
          <FL color={app.color}>Designer DNA</FL>
          <p style={{ ...sans, fontSize: '12px', color: CREAM_DIM, lineHeight: 1.7, fontStyle: 'italic', marginTop: '3px' }}>{profile.designer_dna.join(' · ')}</p>
        </div>
      )}
      {profile.fabrics?.length > 0 && (
        <div>
          <FL color={app.color}>Fabrics</FL>
          <p style={{ ...sans, fontSize: '12px', color: CREAM_DIM, lineHeight: 1.7, marginTop: '3px' }}>{profile.fabrics.join(' · ')}</p>
        </div>
      )}
      {looksCount > 0 && <p style={{ ...mono, fontSize: '9px', color: app.color, marginTop: '10px' }}>{looksCount} looks saved</p>}
    </CardShell>
  )
}

// ── DASHBOARD: Beauty card ─────────────────────────────────────────
function BeautyCard({ data }) {
  const { glowUp, styleFinder } = data
  const app = APP.glowup
  if (!glowUp && !styleFinder) return (
    <CardShell appKey="glowup">
      <EmptySlate appKey="glowup" text="Run your Glow Up audit to see your tier and find your style archetype." cta="Take the Glow Up audit" href="https://glowup.ritualware.app/glow-up" />
    </CardShell>
  )
  const r          = glowUp?.result
  const archetype  = styleFinder?.archetype
  const persona    = styleFinder?.result?.persona_name
  const blindSpots = styleFinder?.result?.blind_spots ?? []
  const styleWords = styleFinder?.result?.style_words ?? []
  return (
    <CardShell appKey="glowup">
      {r?.overall_tier && (
        <div>
          <FL color={app.color}>Glow tier</FL>
          <FVBig color={app.color}>{fmt(r.overall_tier)}</FVBig>
          {r.strongest_area && <p style={{ ...mono, fontSize: '9px', color: CREAM_MUTED, marginTop: '3px' }}>strongest: <span style={{ color: app.color }}>{fmt(r.strongest_area)}</span></p>}
          {r.headline && <p style={{ ...sans, fontSize: '11px', color: CREAM_DIM, fontStyle: 'italic', lineHeight: 1.55, marginTop: '6px' }}>{r.headline}</p>}
        </div>
      )}
      {r && GLOW_CATEGORIES.some(k => r[k]?.score) && (
        <div>
          <FL color={app.color}>Category scores</FL>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '5px' }}>
            {GLOW_CATEGORIES.map(k => {
              const score = r[k]?.score
              if (!score) return null
              return (
                <div key={k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...sans, fontSize: '11px', color: CREAM_DIM, textTransform: 'capitalize' }}>{k}</span>
                    <span style={{ ...mono, fontSize: '9px', color: app.color }}>{score}/10</span>
                  </div>
                  <Bar pct={score * 10} color={app.color} />
                </div>
              )
            })}
          </div>
        </div>
      )}
      {archetype && (
        <div>
          <FL color={app.color}>Style archetype</FL>
          <FVBig color={app.color}>{fmt(archetype)}</FVBig>
          {persona && <p style={{ ...sans, fontSize: '11px', color: CREAM_DIM, marginTop: '3px' }}>{persona}</p>}
        </div>
      )}
      {styleWords.length > 0 && (
        <div>
          <FL color={app.color}>Style words</FL>
          <div style={{ marginTop: '4px' }}>{styleWords.map(w => <Tag key={w} color={app.color}>{fmt(w)}</Tag>)}</div>
        </div>
      )}
      {blindSpots.length > 0 && (
        <div>
          <FL color={app.color}>Blind spots</FL>
          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {blindSpots.map((b, i) => <p key={i} style={{ ...sans, fontSize: '11px', color: CREAM_DIM, lineHeight: 1.5 }}>— {b}</p>)}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
        {!glowUp && <a href="https://glowup.ritualware.app/glow-up" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '9px', letterSpacing: '0.12em', color: app.color, textDecoration: 'none' }}>glow up audit ↗</a>}
        {!styleFinder && <a href="https://glowup.ritualware.app/style-finder" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '9px', letterSpacing: '0.12em', color: app.color, textDecoration: 'none' }}>style finder ↗</a>}
      </div>
    </CardShell>
  )
}

// ── DASHBOARD: Place card ──────────────────────────────────────────
function PlaceCard({ data }) {
  const { neighborhood, burnout, reinvention, dating } = data
  const app = APP.ritualwhere
  if (!neighborhood) return (
    <CardShell appKey="ritualwhere">
      <EmptySlate appKey="ritualwhere" text="Where do you actually belong? Take the neighborhood quiz to find your city match." cta="Take the neighborhood quiz" href="https://where.ritualware.app/neighborhood" />
    </CardShell>
  )
  return (
    <CardShell appKey="ritualwhere">
      <FL color={app.color}>Neighborhood match</FL>
      <FVBig color={app.color}>{fmt(neighborhood.top_match)}</FVBig>

      {burnout ? (
        <div>
          <FL color={app.color}>Burnout type</FL>
          <FVBig color={app.color}>{fmt(burnout.burnout_type)}</FVBig>
          {burnout.severity != null && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                <span style={{ ...mono, fontSize: '9px', color: CREAM_MUTED }}>SEVERITY{burnout.is_chronic ? ' · CHRONIC' : ''}</span>
                <span style={{ ...mono, fontSize: '9px', color: app.color }}>{burnout.severity}/10</span>
              </div>
              <Bar pct={burnout.severity * 10} color={app.color} />
            </>
          )}
          {burnout.protocol && <p style={{ ...sans, fontSize: '11px', color: CREAM_DIM, fontStyle: 'italic', marginTop: '5px', lineHeight: 1.5 }}>{burnout.protocol}</p>}
        </div>
      ) : (
        <a href="https://where.ritualware.app/burnout" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '9px', letterSpacing: '0.12em', color: app.color, textDecoration: 'none', display: 'block', marginTop: '8px' }}>take the burnout audit ↗</a>
      )}

      {reinvention ? (
        <div>
          <FL color={app.color}>Quarterly reinvention{reinvention.quarter ? ` · ${reinvention.quarter}` : ''}</FL>
          <FV style={{ color: app.color, textTransform: 'capitalize' }}>{fmt(reinvention.priority_area)}</FV>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '5px' }}>
            {(reinvention.moves || []).map((m, i) => <p key={i} style={{ ...sans, fontSize: '11px', color: CREAM_DIM, lineHeight: 1.55 }}>— {m}</p>)}
          </div>
        </div>
      ) : (
        <a href="https://where.ritualware.app/reinvention" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '9px', letterSpacing: '0.12em', color: app.color, textDecoration: 'none', display: 'block', marginTop: '8px' }}>quarterly reinvention ↗</a>
      )}

      {dating ? (
        <div>
          <FL color={app.color}>Dating</FL>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div><FL color={app.color}>Goal</FL><FV>{fmt(dating.dating_goal)}</FV></div>
            <div><FL color={app.color}>Type</FL><FV>{fmt(dating.dominant_type)}</FV></div>
            <div style={{ gridColumn: 'span 2' }}><FL color={app.color}>Pattern</FL><FV>{fmt(dating.pattern)}</FV></div>
          </div>
          {dating.main_strategy && <p style={{ ...sans, fontSize: '11px', color: CREAM_DIM, fontStyle: 'italic', marginTop: '6px', lineHeight: 1.55 }}>{dating.main_strategy}</p>}
        </div>
      ) : (
        <a href="https://where.ritualware.app/dating" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '9px', letterSpacing: '0.12em', color: app.color, textDecoration: 'none', display: 'block', marginTop: '8px' }}>dating quiz ↗</a>
      )}
    </CardShell>
  )
}

// ── DASHBOARD: Wealth card ─────────────────────────────────────────
function WealthCard({ data }) {
  const { firePlan, savings = [], fireQuizzes } = data
  const app = APP.ritualwealth
  if (!firePlan) return (
    <CardShell appKey="ritualwealth">
      <EmptySlate appKey="ritualwealth" text="Your number is out there. Take the FIRE quiz to map your path to financial freedom." cta="Take the FIRE quiz" href="https://wealth.ritualware.app/quiz/fire_type" />
    </CardShell>
  )
  const totalSaved  = savings.reduce((s, b) => s + (parseFloat(b.current) || 0), 0)
  const totalTarget = savings.reduce((s, b) => s + (parseFloat(b.target)  || 0), 0)
  const overallPct  = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : null
  return (
    <CardShell appKey="ritualwealth">
      <FL color={app.color}>FIRE type</FL>
      <FVBig color={app.color}>{fmt(firePlan.fire_type)}</FVBig>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        {firePlan.target_number && <div><FL color={app.color}>Target number</FL><p style={{ ...display, fontSize: '15px', color: app.color }}>${Number(firePlan.target_number).toLocaleString()}</p></div>}
        {firePlan.target_age    && <div><FL color={app.color}>Target age</FL><p style={{ ...display, fontSize: '15px', color: CREAM }}>{firePlan.target_age}</p></div>}
      </div>

      {fireQuizzes && (
        <div>
          <FL color={app.color}>Quizzes complete</FL>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
            {FIRE_QUIZZES.map(q => (
              <span key={q.slug} style={{
                ...mono, fontSize: '8px', letterSpacing: '0.1em', padding: '2px 7px', borderRadius: '3px',
                background: fireQuizzes[q.slug] ? `${app.color}18` : 'transparent',
                color:      fireQuizzes[q.slug] ? app.color : CREAM_MUTED,
                border:     `1px solid ${fireQuizzes[q.slug] ? `${app.color}35` : `${CREAM_MUTED}25`}`,
              }}>
                {fireQuizzes[q.slug] ? '✓ ' : '○ '}{q.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {overallPct != null && savings.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <FL color={app.color}>Savings progress</FL>
            <span style={{ ...mono, fontSize: '9px', color: app.color, marginTop: '10px' }}>{Math.round(overallPct)}%</span>
          </div>
          <Bar pct={overallPct} color={app.color} height={3} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
            {savings.map(b => {
              const pct = b.target > 0 ? Math.min((b.current / b.target) * 100, 100) : 0
              return (
                <div key={b.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...sans, fontSize: '11px', color: CREAM_DIM, textTransform: 'capitalize' }}>{fmt(b.name)}</span>
                    <span style={{ ...mono, fontSize: '9px', color: app.color }}>
                      ${Number(b.current || 0).toLocaleString()} <span style={{ color: CREAM_MUTED }}>/ ${Number(b.target || 0).toLocaleString()}</span>
                    </span>
                  </div>
                  <Bar pct={pct} color={app.color} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </CardShell>
  )
}

// ── DASHBOARD: Studio card (full-width) ────────────────────────────
function StudioCard({ data }) {
  const { projects = [], goals = [], skills = [], circle = [] } = data
  const app = APP.matelier
  if (!projects.length && !goals.length && !skills.length) return (
    <CardShell appKey="matelier">
      <EmptySlate appKey="matelier" text="Your creative life needs a home. Add a project in m'atelier to start tracking what you're building." cta="Open m'atelier" href="https://studio.ritualware.app" />
    </CardShell>
  )
  const doneGoals = goals.filter(g => g.is_complete)
  return (
    <CardShell appKey="matelier">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div>
          {projects.length > 0 && (
            <div>
              <FL color={app.color}>Active projects</FL>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px' }}>
                {projects.map(p => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: app.color, flexShrink: 0 }} />
                    <p style={{ ...sans, fontSize: '12px', color: CREAM, textTransform: 'capitalize' }}>{fmt(p.name)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {circle.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              <FL color={app.color}>Circle</FL>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '5px' }}>
                {circle.map(c => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ ...sans, fontSize: '12px', color: CREAM }}>{c.name}</p>
                    <span style={{ ...mono, fontSize: '8px', color: CREAM_MUTED }}>{fmt(c.role)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          {goals.length > 0 && (
            <div>
              <FL color={app.color}>Goals — {doneGoals.length}/{goals.length} done</FL>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px' }}>
                {goals.map(g => (
                  <div key={g.title} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ ...mono, fontSize: '10px', color: g.is_complete ? app.color : CREAM_MUTED }}>{g.is_complete ? '✓' : '○'}</span>
                    <p style={{ ...sans, fontSize: '12px', color: g.is_complete ? CREAM_DIM : CREAM, textDecoration: g.is_complete ? 'line-through' : 'none' }}>{g.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          {skills.length > 0 && (
            <div>
              <FL color={app.color}>Skills</FL>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px' }}>
                {skills.map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ ...sans, fontSize: '12px', color: CREAM }}>{s.label}</p>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ ...mono, fontSize: '8px', color: CREAM_MUTED }}>{s.category}</span>
                      <span style={{ ...mono, fontSize: '8px', color: app.color }}>{s.level}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CardShell>
  )
}

// ── DASHBOARD view ─────────────────────────────────────────────────
function DashboardView({ moduleData, name, isFaux, onExitPreview, retakeQuiz }) {
  const d = moduleData || {}
  const filled = [
    d.ritualwear?.profile?.kibbe_type,
    d.glowup?.glowUp || d.glowup?.styleFinder,
    d.ritualwhere?.neighborhood,
    d.ritualwealth?.firePlan,
    d.matelier?.projects?.length > 0 || d.matelier?.goals?.length > 0,
  ].filter(Boolean).length

  return (
    <main style={{ minHeight: '100vh', background: ROBIN_BG, color: CREAM }}>
      <TopNav isFaux={isFaux} onExitPreview={onExitPreview} />
      <div style={{ padding: 'clamp(2rem,4vw,4rem) clamp(1.5rem,4vw,3rem) 6rem' }}>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: '2rem' }}>
          <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.3em', color: CREAM_MUTED, marginBottom: '0.6rem' }}>YOUR RITUAL PROFILE</p>
          <h1 style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(28px,4vw,46px)', color: CREAM, lineHeight: 1, marginBottom: '1.25rem' }}>
            {name}'s ritual life, <span style={{ color: ROBIN_WARM }}>in depth.</span>
          </h1>
          <div style={{ background: `${ROBIN_WARM}0A`, border: `1px solid ${ROBIN_WARM}18`, borderRadius: '6px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '400px' }}>
            <span style={{ ...mono, fontSize: '9px', letterSpacing: '0.2em', color: ROBIN_WARM, whiteSpace: 'nowrap' }}>PROFILE</span>
            <div style={{ flex: 1, height: '3px', background: `${ROBIN_WARM}18`, borderRadius: '2px', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${(filled / 5) * 100}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                style={{ height: '100%', background: ROBIN_WARM, borderRadius: '2px' }} />
            </div>
            <span style={{ ...mono, fontSize: '9px', color: ROBIN_WARM, whiteSpace: 'nowrap' }}>{filled}/5</span>
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { key: 'ritualwear',   Card: StyleCard   },
            { key: 'glowup',       Card: BeautyCard  },
            { key: 'ritualwhere',  Card: PlaceCard   },
            { key: 'ritualwealth', Card: WealthCard  },
          ].map(({ key, Card }, i) => (
            <motion.div key={key}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.6, delay: i * 0.05 }}>
              <Card data={d[key] ?? {}} />
            </motion.div>
          ))}
          <motion.div style={{ gridColumn: 'span 2' }}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.6, delay: 0.2 }}>
            <StudioCard data={d.matelier ?? {}} />
          </motion.div>
        </div>

        <div style={{ borderTop: `1px solid ${ROBIN_WARM}15`, paddingTop: '2rem', marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {!isFaux && <button onClick={retakeQuiz} style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: CREAM_MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>retake do the dash</button>}
          <p style={{ ...mono, fontSize: '10px', color: CREAM_MUTED, letterSpacing: '0.08em', opacity: 0.35 }}>robin · ritualware suite</p>
        </div>
      </div>
    </main>
  )
}

// ── MAGAZINE section components ────────────────────────────────────
function MagLabel({ children, color }) {
  return <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: color || CREAM_MUTED, marginBottom: '0.4rem' }}>{children}</p>
}
function MagTag({ children, color }) {
  return <span style={{ ...mono, fontSize: '11px', letterSpacing: '0.08em', color, border: `1px solid ${color}40`, borderRadius: '3px', padding: '3px 10px', textTransform: 'capitalize', display: 'inline-block', margin: '2px 2px 0 0' }}>{children}</span>
}
function MagGoDeeper({ appKey }) {
  const app = APP[appKey]
  return (
    <a href={app.url} target="_blank" rel="noreferrer"
      style={{ ...mono, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: app.color, textDecoration: 'none', opacity: 0.7 }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
      go deeper in {app.label} ↗
    </a>
  )
}
function MagBar({ pct, color }) {
  return (
    <div style={{ height: '2px', background: `${color}20`, borderRadius: '2px', overflow: 'hidden', margin: '4px 0 2px' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} style={{ height: '100%', background: color, borderRadius: '2px' }} />
    </div>
  )
}
function SectionRule({ color }) {
  return <div style={{ height: '1px', background: `${color}25`, margin: '2.5rem 0' }} />
}

function MagStyleSection({ data }) {
  const { profile, looksCount } = data
  const app = APP.ritualwear
  if (!profile?.kibbe_type) return (
    <div>
      <p style={{ ...serif, fontStyle: 'italic', fontSize: '20px', color: CREAM_DIM, lineHeight: 1.6 }}>Your style profile is waiting. Take the Style Bible quiz to unlock your body type, colour season, and the rules that make your wardrobe feel like yours.</p>
      <a href="https://wear.ritualware.app/quiz" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: app.color, textDecoration: 'none' }}>Take the Style Bible quiz ↗</a>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <p style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(32px,4vw,54px)', color: CREAM, lineHeight: 1.1 }}>
          {fmt(profile.kibbe_type)}.{profile.color_season && <> <span style={{ color: app.color }}>{fmt(profile.color_season)} season.</span></>}
        </p>
        {profile.undertone && <p style={{ ...sans, fontSize: '14px', color: CREAM_DIM, marginTop: '0.5rem' }}>{fmt(profile.undertone)} undertone{profile.metal && ` · ${fmt(profile.metal)} metals`}{profile.formality && ` · ${fmt(profile.formality)}`}</p>}
      </div>
      {profile.style_words?.length > 0 && <div><MagLabel color={app.color}>Style words</MagLabel><div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{profile.style_words.map(w => <MagTag key={w} color={app.color}>{fmt(w)}</MagTag>)}</div></div>}
      {profile.palette?.length > 0 && <div><MagLabel color={app.color}>Palette</MagLabel><div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{profile.palette.map(p => <MagTag key={p} color={app.color}>{fmt(p)}</MagTag>)}</div></div>}
      {profile.designer_dna?.length > 0 && <div><MagLabel color={app.color}>Designer DNA</MagLabel><p style={{ ...sans, fontSize: '15px', color: CREAM_DIM, lineHeight: 1.7, fontStyle: 'italic' }}>{profile.designer_dna.join(' · ')}</p></div>}
      {profile.fabrics?.length > 0 && <div><MagLabel color={app.color}>Fabrics</MagLabel><p style={{ ...sans, fontSize: '15px', color: CREAM_DIM, lineHeight: 1.7 }}>{profile.fabrics.join(' · ')}</p></div>}
      {looksCount > 0 && <p style={{ ...mono, fontSize: '11px', color: CREAM_MUTED, letterSpacing: '0.1em' }}>{looksCount} look{looksCount !== 1 ? 's' : ''} saved</p>}
      <MagGoDeeper appKey="ritualwear" />
    </div>
  )
}

function MagBeautySection({ data }) {
  const { glowUp, styleFinder } = data
  const app = APP.glowup
  if (!glowUp && !styleFinder) return (
    <div>
      <p style={{ ...serif, fontStyle: 'italic', fontSize: '20px', color: CREAM_DIM, lineHeight: 1.6 }}>Your beauty architecture is unmapped. Run your Glow Up audit to see your tier and find your style archetype.</p>
      <a href="https://glowup.ritualware.app/glow-up" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: app.color, textDecoration: 'none' }}>Take the Glow Up audit ↗</a>
    </div>
  )
  const r          = glowUp?.result
  const archetype  = styleFinder?.archetype
  const persona    = styleFinder?.result?.persona_name
  const blindSpots = styleFinder?.result?.blind_spots ?? []
  const styleWords = styleFinder?.result?.style_words ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {r?.overall_tier && (
        <div>
          <MagLabel color={app.color}>Glow tier</MagLabel>
          <p style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(28px,3.5vw,46px)', color: CREAM, lineHeight: 1.1, textTransform: 'capitalize' }}>{fmt(r.overall_tier)}.</p>
          {r.headline && <p style={{ ...sans, fontSize: '14px', color: CREAM_DIM, marginTop: '0.5rem', fontStyle: 'italic' }}>{r.headline}</p>}
        </div>
      )}
      {r && GLOW_CATEGORIES.some(k => r[k]?.score) && (
        <div>
          <MagLabel color={app.color}>Category scores</MagLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '0.5rem' }}>
            {GLOW_CATEGORIES.map(k => {
              const score = r[k]?.score; if (!score) return null
              return (
                <div key={k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...sans, fontSize: '13px', color: CREAM_DIM, textTransform: 'capitalize' }}>{k}</span>
                    <span style={{ ...mono, fontSize: '10px', color: app.color }}>{score}/10</span>
                  </div>
                  <MagBar pct={score * 10} color={app.color} />
                  {r[k]?.verdict && <p style={{ ...sans, fontSize: '12px', color: CREAM_MUTED, lineHeight: 1.5, marginTop: '2px' }}>{r[k].verdict}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {archetype && <div><MagLabel color={app.color}>Style archetype</MagLabel><p style={{ ...display, fontSize: '22px', color: app.color, lineHeight: 1.1, textTransform: 'capitalize' }}>{fmt(archetype)}</p>{persona && <p style={{ ...sans, fontSize: '14px', color: CREAM_DIM, marginTop: '0.4rem' }}>{persona}</p>}</div>}
      {styleWords.length > 0 && <div><MagLabel color={app.color}>Style words</MagLabel><div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{styleWords.map(w => <MagTag key={w} color={app.color}>{fmt(w)}</MagTag>)}</div></div>}
      {blindSpots.length > 0 && <div><MagLabel color={app.color}>Blind spots</MagLabel>{blindSpots.map((b, i) => <p key={i} style={{ ...sans, fontSize: '14px', color: CREAM_DIM, lineHeight: 1.6 }}>— {b}</p>)}</div>}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {!glowUp    && <a href="https://glowup.ritualware.app/glow-up"      target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.15em', color: app.color, textDecoration: 'none' }}>run glow up audit ↗</a>}
        {!styleFinder && <a href="https://glowup.ritualware.app/style-finder" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.15em', color: app.color, textDecoration: 'none' }}>find your archetype ↗</a>}
      </div>
      <MagGoDeeper appKey="glowup" />
    </div>
  )
}

function MagPlaceSection({ data }) {
  const { neighborhood, burnout, reinvention, dating } = data
  const app = APP.ritualwhere
  if (!neighborhood) return (
    <div>
      <p style={{ ...serif, fontStyle: 'italic', fontSize: '20px', color: CREAM_DIM, lineHeight: 1.6 }}>Where do you actually belong? Take the neighborhood quiz to find your city match.</p>
      <a href="https://where.ritualware.app/neighborhood" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: app.color, textDecoration: 'none' }}>Take the neighborhood quiz ↗</a>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div><MagLabel color={app.color}>Your neighborhood</MagLabel><p style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(28px,3.5vw,46px)', color: CREAM, lineHeight: 1.1, textTransform: 'capitalize' }}>{fmt(neighborhood.top_match)}.</p></div>
      {burnout?.burnout_type && (
        <div>
          <MagLabel color={app.color}>Burnout type</MagLabel>
          <p style={{ ...display, fontSize: '20px', color: app.color, textTransform: 'capitalize' }}>{fmt(burnout.burnout_type)}</p>
          {burnout.severity != null && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <p style={{ ...mono, fontSize: '10px', color: CREAM_MUTED, letterSpacing: '0.1em' }}>SEVERITY{burnout.is_chronic ? ' · CHRONIC' : ''}</p>
                <p style={{ ...mono, fontSize: '10px', color: app.color }}>{burnout.severity} / 10</p>
              </div>
              <MagBar pct={burnout.severity * 10} color={app.color} />
            </div>
          )}
          {burnout.protocol && <p style={{ ...sans, fontSize: '14px', color: CREAM_DIM, fontStyle: 'italic', marginTop: '0.5rem' }}>{burnout.protocol}</p>}
        </div>
      )}
      {reinvention && (
        <div>
          <MagLabel color={app.color}>Quarterly reinvention{reinvention.quarter ? ` · ${reinvention.quarter}` : ''}</MagLabel>
          <p style={{ ...display, fontSize: '18px', color: app.color, textTransform: 'capitalize' }}>{fmt(reinvention.priority_area)}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
            {(reinvention.moves || []).map((m, i) => <p key={i} style={{ ...sans, fontSize: '14px', color: CREAM_DIM, lineHeight: 1.6 }}>— {m}</p>)}
          </div>
        </div>
      )}
      {dating && (
        <div>
          <MagLabel color={app.color}>Dating</MagLabel>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div><p style={{ ...mono, fontSize: '10px', color: CREAM_MUTED, letterSpacing: '0.1em', marginBottom: '2px' }}>GOAL</p><p style={{ ...sans, fontSize: '14px', color: CREAM }}>{fmt(dating.dating_goal)}</p></div>
            <div><p style={{ ...mono, fontSize: '10px', color: CREAM_MUTED, letterSpacing: '0.1em', marginBottom: '2px' }}>TYPE</p><p style={{ ...sans, fontSize: '14px', color: CREAM }}>{fmt(dating.dominant_type)}</p></div>
            <div><p style={{ ...mono, fontSize: '10px', color: CREAM_MUTED, letterSpacing: '0.1em', marginBottom: '2px' }}>PATTERN</p><p style={{ ...sans, fontSize: '14px', color: CREAM }}>{fmt(dating.pattern)}</p></div>
          </div>
          {dating.main_strategy && <p style={{ ...sans, fontSize: '14px', color: CREAM_DIM, fontStyle: 'italic', lineHeight: 1.6 }}>{dating.main_strategy}</p>}
        </div>
      )}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {!burnout     && <a href="https://where.ritualware.app/burnout"     target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.15em', color: app.color, textDecoration: 'none' }}>take the burnout audit ↗</a>}
        {!reinvention && <a href="https://where.ritualware.app/reinvention" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.15em', color: app.color, textDecoration: 'none' }}>quarterly reinvention ↗</a>}
        {!dating      && <a href="https://where.ritualware.app/dating"      target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.15em', color: app.color, textDecoration: 'none' }}>dating quiz ↗</a>}
      </div>
      <MagGoDeeper appKey="ritualwhere" />
    </div>
  )
}

function MagWealthSection({ data }) {
  const { firePlan, savings = [], fireQuizzes } = data
  const app = APP.ritualwealth
  if (!firePlan) return (
    <div>
      <p style={{ ...serif, fontStyle: 'italic', fontSize: '20px', color: CREAM_DIM, lineHeight: 1.6 }}>Your number is out there. Take the FIRE quiz to map your path to financial freedom.</p>
      <a href="https://wealth.ritualware.app/quiz/fire_type" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: app.color, textDecoration: 'none' }}>Take the FIRE quiz ↗</a>
    </div>
  )
  const totalSaved  = savings.reduce((s, b) => s + (parseFloat(b.current) || 0), 0)
  const totalTarget = savings.reduce((s, b) => s + (parseFloat(b.target)  || 0), 0)
  const pct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div><MagLabel color={app.color}>FIRE type</MagLabel><p style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(28px,3.5vw,46px)', color: CREAM, lineHeight: 1.1, textTransform: 'capitalize' }}>{fmt(firePlan.fire_type)}.</p></div>
      <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
        {firePlan.target_number && <div><MagLabel color={app.color}>Target number</MagLabel><p style={{ ...display, fontSize: '24px', color: app.color }}>${Number(firePlan.target_number).toLocaleString()}</p></div>}
        {firePlan.target_age    && <div><MagLabel color={app.color}>Target age</MagLabel><p style={{ ...display, fontSize: '24px', color: CREAM }}>{firePlan.target_age}</p></div>}
      </div>
      {fireQuizzes && (
        <div>
          <MagLabel color={app.color}>Quizzes complete</MagLabel>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {FIRE_QUIZZES.map(q => (
              <span key={q.slug} style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em', padding: '3px 10px', borderRadius: '3px', background: fireQuizzes[q.slug] ? `${app.color}15` : 'transparent', color: fireQuizzes[q.slug] ? app.color : CREAM_MUTED, border: `1px solid ${fireQuizzes[q.slug] ? `${app.color}35` : `${CREAM_MUTED}25`}` }}>
                {fireQuizzes[q.slug] ? '✓ ' : '○ '}{q.label}
              </span>
            ))}
          </div>
        </div>
      )}
      {pct != null && savings.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <MagLabel color={app.color}>Savings progress</MagLabel>
            <p style={{ ...mono, fontSize: '10px', color: app.color, letterSpacing: '0.1em' }}>{Math.round(pct)}%</p>
          </div>
          <div style={{ height: '3px', background: `${app.color}20`, borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} style={{ height: '100%', background: app.color, borderRadius: '2px' }} />
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {savings.map(b => (
              <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ ...sans, fontSize: '13px', color: CREAM_DIM, textTransform: 'capitalize' }}>{fmt(b.name)}</p>
                <p style={{ ...mono, fontSize: '11px', color: app.color }}>${Number(b.current || 0).toLocaleString()} <span style={{ color: CREAM_MUTED }}>/ ${Number(b.target || 0).toLocaleString()}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}
      <MagGoDeeper appKey="ritualwealth" />
    </div>
  )
}

function MagStudioSection({ data }) {
  const { projects = [], goals = [], skills = [], circle = [] } = data
  const app = APP.matelier
  if (!projects.length && !goals.length && !skills.length) return (
    <div>
      <p style={{ ...serif, fontStyle: 'italic', fontSize: '20px', color: CREAM_DIM, lineHeight: 1.6 }}>Your creative life needs a home. Add a project in m'atelier to start tracking what you're building.</p>
      <a href="https://studio.ritualware.app" target="_blank" rel="noreferrer" style={{ ...mono, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: app.color, textDecoration: 'none' }}>Open m'atelier ↗</a>
    </div>
  )
  const doneGoals = goals.filter(g => g.is_complete)
  const openGoals = goals.filter(g => !g.is_complete)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {projects.length > 0 && (
        <div><MagLabel color={app.color}>Active projects</MagLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
          {projects.map(p => <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: app.color, flexShrink: 0 }} /><p style={{ ...sans, fontSize: '15px', color: CREAM, textTransform: 'capitalize' }}>{fmt(p.name)}</p></div>)}
        </div></div>
      )}
      {goals.length > 0 && (
        <div><MagLabel color={app.color}>Goals</MagLabel>
        <p style={{ ...serif, fontStyle: 'italic', fontSize: '22px', color: CREAM, lineHeight: 1.2 }}>{doneGoals.length} of {goals.length} complete.{openGoals.length > 0 && <span style={{ color: app.color }}> {openGoals.length} still becoming.</span>}</p>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {goals.map(g => <div key={g.title} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ ...mono, fontSize: '11px', color: g.is_complete ? app.color : CREAM_MUTED }}>{g.is_complete ? '✓' : '○'}</span><p style={{ ...sans, fontSize: '14px', color: g.is_complete ? CREAM_DIM : CREAM, textDecoration: g.is_complete ? 'line-through' : 'none' }}>{g.title}</p></div>)}
        </div></div>
      )}
      {skills.length > 0 && (
        <div><MagLabel color={app.color}>Skills</MagLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          {skills.map(s => <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><p style={{ ...sans, fontSize: '14px', color: CREAM }}>{s.label}</p><div style={{ display: 'flex', gap: '0.5rem' }}><span style={{ ...mono, fontSize: '10px', color: CREAM_MUTED }}>{s.category}</span><span style={{ ...mono, fontSize: '10px', color: app.color }}>{s.level}</span></div></div>)}
        </div></div>
      )}
      {circle.length > 0 && (
        <div><MagLabel color={app.color}>Circle</MagLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          {circle.map(c => <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><p style={{ ...sans, fontSize: '14px', color: CREAM }}>{c.name}</p><span style={{ ...mono, fontSize: '10px', color: CREAM_MUTED }}>{fmt(c.role)}</span></div>)}
        </div></div>
      )}
      <MagGoDeeper appKey="matelier" />
    </div>
  )
}

// ── MAGAZINE view ─────────────────────────────────────────────────
function MagazineView({ moduleData, name, isFaux, onExitPreview, retakeQuiz }) {
  const d = moduleData || {}
  const MAG_SECTIONS = [
    { key: 'ritualwear',   label: 'Style',   Section: MagStyleSection  },
    { key: 'glowup',       label: 'Beauty',  Section: MagBeautySection },
    { key: 'ritualwhere',  label: 'Place',   Section: MagPlaceSection  },
    { key: 'ritualwealth', label: 'Wealth',  Section: MagWealthSection },
    { key: 'matelier',     label: 'Studio',  Section: MagStudioSection },
  ]
  return (
    <main style={{ minHeight: '100vh', background: ROBIN_BG, color: CREAM }}>
      <TopNav isFaux={isFaux} onExitPreview={onExitPreview} />
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(3rem,6vw,6rem) clamp(1.5rem,4vw,3.5rem) 8rem' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: '4rem' }}>
          <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.3em', color: CREAM_MUTED, marginBottom: '1.5rem' }}>YOUR RITUAL PROFILE</p>
          <h1 style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(48px,7vw,96px)', lineHeight: 0.95, color: CREAM }}>
            Who is<br /><span style={{ color: ROBIN_WARM }}>{name}</span><br />becoming?
          </h1>
        </motion.div>
        <div style={{ height: '1px', background: `${ROBIN_WARM}20`, marginBottom: '4rem' }} />
        {MAG_SECTIONS.map(({ key, label, Section }, i) => (
          <motion.div key={key}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '2rem' }}>
              <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: APP[key].color, opacity: 0.7, width: '60px', flexShrink: 0 }}>{APP[key].sub}</p>
              <h2 style={{ ...serif, fontStyle: 'italic', fontSize: 'clamp(26px,3vw,38px)', color: CREAM, lineHeight: 1 }}>{label}</h2>
            </div>
            <div style={{ paddingLeft: '76px' }}>
              <Section data={d[key] ?? {}} />
            </div>
            {i < MAG_SECTIONS.length - 1 && <SectionRule color={ROBIN_WARM} />}
          </motion.div>
        ))}
        <div style={{ borderTop: `1px solid ${ROBIN_WARM}15`, paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {!isFaux && <button onClick={retakeQuiz} style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: CREAM_MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>retake do the dash</button>}
          <p style={{ ...mono, fontSize: '10px', color: CREAM_MUTED, letterSpacing: '0.08em', opacity: 0.35 }}>robin · ritualware suite</p>
        </div>
      </div>
    </main>
  )
}

// ── Shared nav ────────────────────────────────────────────────────
function TopNav({ isFaux, onExitPreview }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 20, background: `${ROBIN_BG}E8`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${ROBIN_WARM}18`, padding: '0.85rem clamp(1.5rem,4vw,3.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <p style={{ ...mono, fontSize: '10px', letterSpacing: '0.3em', color: ROBIN_WARM }}>ROBIN</p>
        {isFaux && <span style={{ ...mono, fontSize: '9px', color: CREAM_MUTED, background: `${ROBIN_WARM}15`, border: `1px solid ${ROBIN_WARM}30`, borderRadius: '3px', padding: '2px 8px' }}>faux profile</span>}
        {onExitPreview && (
          <button onClick={onExitPreview} style={{ ...mono, fontSize: '10px', letterSpacing: '0.1em', color: CREAM_MUTED, background: 'none', border: `1px solid ${ROBIN_WARM}30`, borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}>
            back to admin
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ThemeDropdown />
        <button onClick={() => supabase.auth.signOut()} style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', color: CREAM_MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>
          sign out
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function UserDashboard({ user, onExitPreview = null, faux = false }) {
  const [modules,    setModules]    = useState(null)
  const [moduleData, setModuleData] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const { view } = useThemeStore()

  useEffect(() => {
    if (faux) {
      setModules(['all'])
      setModuleData(FAUX_DATA)
      setLoading(false)
      return
    }
    async function load() {
      const [config, data] = await Promise.all([
        supabase.from('robin_dashboard_config').select('modules').eq('user_id', user.id).maybeSingle(),
        fetchModuleData(user.id),
      ])
      setModules(config.data?.modules ?? null)
      setModuleData(data)
      setLoading(false)
    }
    load()
  }, [user.id, faux])

  const retakeQuiz = async () => {
    await supabase.from('robin_dashboard_config').delete().eq('user_id', user.id)
    await supabase.from('robin_quiz_results').delete().eq('user_id', user.id)
    setModules(null)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: ROBIN_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ ...mono, fontSize: '11px', letterSpacing: '0.25em', color: CREAM_MUTED }}>loading your profile…</p>
    </main>
  )

  if (!modules) return <DoTheDash user={user} onComplete={mods => setModules(mods)} />

  const name  = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'you'
  const props = { moduleData, name, isFaux: faux, onExitPreview, retakeQuiz }

  return view === 'magazine'
    ? <MagazineView {...props} />
    : <DashboardView {...props} />
}
