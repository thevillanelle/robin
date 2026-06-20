import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import ThemeDropdown from '../components/ThemeDropdown'

const mono  = { fontFamily: 'monospace' }
const serif = { fontFamily: '"Playfair Display", Georgia, serif' }
const sans  = { fontFamily: '"DM Sans", sans-serif' }

// ── Questions ──────────────────────────────────────────────────────

const CORE = [
  {
    id: 'primary_lens',
    q: "What's your primary life lens right now?",
    hint: "the thing you return to, even when you're trying not to",
    options: [
      { id: 'creative',  label: 'Building something creative' },
      { id: 'money',     label: 'Making real money' },
      { id: 'beauty',    label: 'Living beautifully' },
      { id: 'identity',  label: 'Figuring out who I am' },
    ],
  },
  {
    id: 'freedom_means',
    q: 'What does freedom actually mean to you?',
    hint: 'not the right answer — the real one',
    options: [
      { id: 'financial', label: 'Never having to work again' },
      { id: 'creative',  label: 'Making exactly what I want' },
      { id: 'location',  label: 'Living anywhere I choose' },
      { id: 'time',      label: 'Owning my own schedule' },
    ],
  },
  {
    id: 'ideal_location',
    q: 'When you imagine your ideal week — where are you?',
    hint: 'close your eyes. where does your mind go first?',
    options: [
      { id: 'city',       label: 'In a city with culture, restaurants, people' },
      { id: 'two_places', label: 'Moving between two places I love' },
      { id: 'quiet',      label: 'Somewhere quiet and intentional' },
      { id: 'anywhere',   label: 'I don\'t care about place — I care about what I\'m doing' },
    ],
  },
  {
    id: 'life_vibe',
    q: "What's the vibe of your ideal life?",
    hint: 'not aspirational — actual',
    options: [
      { id: 'curated',   label: 'Curated and aesthetic — everything means something' },
      { id: 'ambitious', label: 'Ambitious and productive — building toward something big' },
      { id: 'social',    label: 'Social and connected — the people are the point' },
      { id: 'sensory',   label: 'Slow and sensory — pleasure is the whole point' },
    ],
  },
  {
    id: 'body_wants',
    q: 'What does your body want more of?',
    hint: 'your actual body, not the version you\'re supposed to want',
    options: [
      { id: 'rest',    label: 'Rest and restoration' },
      { id: 'movement', label: 'Movement and physical confidence' },
      { id: 'ritual',  label: 'Ritual and care — skin, beauty, fragrance' },
      { id: 'style',   label: 'Style that actually feels like me' },
    ],
  },
  {
    id: 'financial_goal',
    q: "What's the financial goal you're actually working toward?",
    hint: 'or want to be working toward',
    options: [
      { id: 'fire',         label: 'Hit a number and never need to work again' },
      { id: 'creative_biz', label: 'Build a creative business that funds my life' },
      { id: 'earn_more',    label: 'Earn significantly more so I can live bigger' },
      { id: 'no_goal',      label: 'I don\'t have a clear financial goal yet' },
    ],
  },
  {
    id: 'mental_energy',
    q: 'Where does most of your mental energy actually go?',
    hint: 'not where you want it to go — where it actually goes',
    options: [
      { id: 'creative',   label: 'Creative projects — writing, content, music, art' },
      { id: 'career',     label: 'My career and professional identity' },
      { id: 'appearance', label: 'How I look and present myself' },
      { id: 'money',      label: 'Money and financial planning' },
    ],
  },
  {
    id: 'relationships',
    q: 'What kind of relationships are you investing in?',
    hint: 'building, not just maintaining',
    options: [
      { id: 'inner_circle', label: 'A tight inner circle who really knows me' },
      { id: 'network',      label: 'A wide network of interesting people' },
      { id: 'romantic',     label: 'One or two deep romantic connections' },
      { id: 'solo',         label: 'I\'m focused on myself right now' },
    ],
  },
  {
    id: 'home_wants',
    q: 'What do you want your city to give you?',
    hint: 'what you\'d miss if it wasn\'t there',
    options: [
      { id: 'city',      label: 'Cultural density — museums, restaurants, people, movement' },
      { id: 'space',     label: 'Space, quiet, intentionality' },
      { id: 'scene',     label: 'Proximity to a specific scene or community' },
      { id: 'undecided', label: 'I haven\'t decided where I want to be yet' },
    ],
  },
  {
    id: 'beauty_stance',
    q: "What's your relationship with beauty and aesthetics?",
    hint: 'honest',
    options: [
      { id: 'strong_pov',   label: 'It\'s core to my identity — I have a point of view' },
      { id: 'figuring_out', label: 'I\'m figuring out my style and want guidance' },
      { id: 'rituals',      label: 'I\'m more interested in beauty rituals than fashion' },
      { id: 'low_priority', label: 'It\'s not a primary focus for me' },
    ],
  },
  {
    id: 'five_years',
    q: '"Doing well" in five years looks like…',
    hint: 'not the answer that sounds good — the one that feels true',
    options: [
      { id: 'financial',       label: 'I have financial security and could stop working' },
      { id: 'built_something', label: 'I\'ve built something with my name on it' },
      { id: 'beautiful_life',  label: 'I live somewhere beautiful and love my daily life' },
      { id: 'self_knowledge',  label: 'I know exactly who I am and live accordingly' },
    ],
  },
  {
    id: 'missing',
    q: 'What\'s most missing from your life that you want to add?',
    hint: 'the gap you feel most acutely',
    options: [
      { id: 'financial_plan', label: 'A clear financial plan and path forward' },
      { id: 'aesthetic',      label: 'A stronger aesthetic identity' },
      { id: 'creative',       label: 'Creative momentum and actual output' },
      { id: 'community',      label: 'Community, or the right partner' },
      { id: 'clarity',        label: 'Clarity on who I am and what I want' },
    ],
  },
]

const EXTENDED = [
  {
    id: 'money_relationship',
    q: 'How do you relate to money right now?',
    hint: null,
    options: [
      { id: 'anxious',   label: 'I think about it constantly and it stresses me out' },
      { id: 'strategic', label: 'I have a plan and I\'m executing it' },
      { id: 'fluid',     label: 'It comes and goes and I don\'t track it closely' },
      { id: 'avoidant',  label: 'I try not to think about it too much' },
    ],
  },
  {
    id: 'style_self_knowledge',
    q: 'Do you have a clear sense of your personal style?',
    hint: null,
    options: [
      { id: 'yes_clear',    label: 'Yes — I know my body, my palette, my rules' },
      { id: 'mostly',       label: 'Mostly — I\'d just like it sharper' },
      { id: 'exploring',    label: 'I\'m still figuring it out' },
      { id: 'not_priority', label: 'Style isn\'t something I focus on' },
    ],
  },
  {
    id: 'creative_ambition',
    q: "What's your biggest creative ambition?",
    hint: "the one you'd be embarrassed to say out loud",
    options: [
      { id: 'content',  label: 'Build an audience around my creative work' },
      { id: 'art',      label: 'Make art that lasts — writing, music, film, something real' },
      { id: 'business', label: 'Build a brand or business around what I love' },
      { id: 'no_idea',  label: 'I haven\'t found it yet' },
    ],
  },
  {
    id: 'wardrobe_vibe',
    q: 'What does your ideal wardrobe feel like?',
    hint: null,
    options: [
      { id: 'curated_uniform', label: 'A curated uniform — consistent, intentional, always right' },
      { id: 'expressive',      label: 'Expressive — it says something about who I am' },
      { id: 'minimal',         label: 'Minimal — fewer things, all excellent' },
      { id: 'in_progress',     label: 'I\'m still building it — I don\'t have it figured out yet' },
    ],
  },
  {
    id: 'neighborhood_aesthetic',
    q: 'How important is your neighborhood\'s aesthetic to you?',
    hint: null,
    options: [
      { id: 'very',          label: 'Very — my environment is part of my identity' },
      { id: 'somewhat',      label: 'Somewhat — I notice it, it matters' },
      { id: 'not_really',    label: 'Not really — I care more about what\'s accessible' },
      { id: 'never_thought', label: 'I\'ve never really thought about it' },
    ],
  },
  {
    id: 'beauty_motivation',
    q: 'What pulls you toward beauty rituals?',
    hint: null,
    options: [
      { id: 'self_care',       label: 'Self-care — it\'s restorative, I do it for me' },
      { id: 'self_expression', label: 'Self-expression — how I look is part of how I communicate' },
      { id: 'performance',     label: 'Performance — I want to be perceived a certain way' },
      { id: 'all_three',       label: 'All three — they\'re not separable for me' },
    ],
  },
  {
    id: 'fragrance_identity',
    q: "What's your fragrance personality?",
    hint: 'if you had to pick a lane',
    options: [
      { id: 'dark_resinous', label: 'Dark and resinous — oud, amber, smoke, depth' },
      { id: 'fresh_clean',   label: 'Fresh and clean — green, citrus, aquatic' },
      { id: 'floral',        label: 'Floral with intention — not sweet, structural' },
      { id: 'gourmand',      label: 'Warm and edible — vanilla, musk, skin' },
    ],
  },
  {
    id: 'dashboard_priority',
    q: 'What do you always want at the top of your dashboard?',
    hint: 'the thing you\'d check first',
    options: [
      { id: 'finances', label: 'My financial picture' },
      { id: 'style',    label: 'Style and aesthetic identity' },
      { id: 'creative', label: 'Creative projects and goals' },
      { id: 'beauty',   label: 'Beauty and ritual tracker' },
      { id: 'location', label: 'Where I live and want to be' },
    ],
  },
]

// ── Module weight scoring ──────────────────────────────────────────

const SCORING = {
  primary_lens:          { creative: { matelier: 2, ritualwear: 1 }, money: { ritualwealth: 2 }, beauty: { ritualwear: 2, glowup: 1 }, identity: { glowup: 2, ritualwear: 1 } },
  freedom_means:         { financial: { ritualwealth: 2 }, creative: { matelier: 2 }, location: { ritualwhere: 2 }, time: { matelier: 1, ritualwealth: 1 } },
  ideal_location:        { city: { ritualwhere: 2, ritualwear: 1 }, two_places: { ritualwhere: 1 }, quiet: { ritualwhere: 1 }, anywhere: { matelier: 1 } },
  life_vibe:             { curated: { ritualwear: 2, glowup: 1 }, ambitious: { matelier: 2, ritualwealth: 1 }, social: { ritualwhere: 1, matelier: 1 }, sensory: { glowup: 2, ritualwear: 1 } },
  body_wants:            { rest: { glowup: 1 }, movement: { glowup: 1 }, ritual: { glowup: 2, ritualwear: 1 }, style: { ritualwear: 2 } },
  financial_goal:        { fire: { ritualwealth: 3 }, creative_biz: { matelier: 2, ritualwealth: 1 }, earn_more: { ritualwealth: 2 }, no_goal: { ritualwealth: 1 } },
  mental_energy:         { creative: { matelier: 2 }, career: { matelier: 1, ritualwealth: 1 }, appearance: { ritualwear: 2, glowup: 1 }, money: { ritualwealth: 2 } },
  relationships:         { inner_circle: { matelier: 1 }, network: { ritualwhere: 1, matelier: 1 }, romantic: { ritualwhere: 1 }, solo: {} },
  home_wants:            { city: { ritualwhere: 2 }, space: { ritualwhere: 1 }, scene: { ritualwhere: 2 }, undecided: { ritualwhere: 1 } },
  beauty_stance:         { strong_pov: { ritualwear: 3 }, figuring_out: { ritualwear: 2 }, rituals: { glowup: 2 }, low_priority: {} },
  five_years:            { financial: { ritualwealth: 2 }, built_something: { matelier: 2 }, beautiful_life: { ritualwear: 1, ritualwhere: 1, glowup: 1 }, self_knowledge: { glowup: 2 } },
  missing:               { financial_plan: { ritualwealth: 2 }, aesthetic: { ritualwear: 2 }, creative: { matelier: 2 }, community: { ritualwhere: 2 }, clarity: { glowup: 2 } },
  money_relationship:    { anxious: { ritualwealth: 2 }, strategic: { ritualwealth: 1 }, fluid: { matelier: 1 }, avoidant: { ritualwealth: 2 } },
  style_self_knowledge:  { yes_clear: { ritualwear: 1 }, mostly: { ritualwear: 2 }, exploring: { ritualwear: 2 }, not_priority: {} },
  creative_ambition:     { content: { matelier: 2, ritualwear: 1 }, art: { matelier: 2 }, business: { matelier: 1, ritualwealth: 1 }, no_idea: { matelier: 1 } },
  wardrobe_vibe:         { curated_uniform: { ritualwear: 2 }, expressive: { ritualwear: 2 }, minimal: { ritualwear: 1 }, in_progress: { ritualwear: 2 } },
  neighborhood_aesthetic:{ very: { ritualwhere: 2 }, somewhat: { ritualwhere: 1 }, not_really: {}, never_thought: {} },
  beauty_motivation:     { self_care: { glowup: 2 }, self_expression: { ritualwear: 1, glowup: 1 }, performance: { glowup: 1 }, all_three: { glowup: 2, ritualwear: 1 } },
  fragrance_identity:    { dark_resinous: { glowup: 1, ritualwear: 1 }, fresh_clean: { glowup: 1 }, floral: { glowup: 1 }, gourmand: { glowup: 1 } },
  dashboard_priority:    { finances: { ritualwealth: 3 }, style: { ritualwear: 3 }, creative: { matelier: 3 }, beauty: { glowup: 3 }, location: { ritualwhere: 3 } },
}

function computeModules(answers) {
  const w = { ritualwealth: 0, matelier: 0, ritualwear: 0, glowup: 0, ritualwhere: 0 }
  for (const [qid, answer] of Object.entries(answers)) {
    const qw = SCORING[qid]?.[answer] ?? {}
    for (const [mod, pts] of Object.entries(qw)) w[mod] = (w[mod] || 0) + pts
  }
  return Object.entries(w)
    .sort(([, a], [, b]) => b - a)
    .map(([id], order) => ({ id, enabled: true, order }))
}

// ── Quiz ──────────────────────────────────────────────────────────

export default function DoTheDash({ user, onComplete }) {
  const allQuestions = [...CORE]
  const [answers, setAnswers]           = useState({})
  const [idx, setIdx]                   = useState(0)
  const [extended, setExtended]         = useState(false)
  const [showExtendedPrompt, setShowExtendedPrompt] = useState(false)
  const [saving, setSaving]             = useState(false)
  const [dir, setDir]                   = useState(1)

  const questions = extended ? [...CORE, ...EXTENDED] : CORE
  const total     = questions.length
  const q         = questions[idx]
  const isLast    = idx === total - 1
  const selected  = answers[q?.id]

  const advance = async () => {
    if (idx === CORE.length - 1 && !extended) {
      setShowExtendedPrompt(true)
      return
    }
    if (isLast) {
      await save()
      return
    }
    setDir(1)
    setIdx(i => i + 1)
  }

  const back = () => {
    if (idx === 0) return
    setDir(-1)
    setIdx(i => i - 1)
  }

  const pick = (optId) => {
    setAnswers(prev => ({ ...prev, [q.id]: optId }))
  }

  const goExtended = () => {
    setExtended(true)
    setShowExtendedPrompt(false)
    setDir(1)
    setIdx(CORE.length)
  }

  const save = async () => {
    setSaving(true)
    const modules = computeModules(answers)
    await Promise.all([
      supabase.from('robin_quiz_results').upsert({
        user_id: user.id, answers, extended,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }),
      supabase.from('robin_dashboard_config').upsert({
        user_id: user.id, modules,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }),
    ])
    onComplete(modules)
  }

  const progress = total > 0 ? ((idx) / total) * 100 : 0

  if (showExtendedPrompt) return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}
      >
        <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--c-accent)', marginBottom: '0.75rem' }}>DO THE DASH</p>
        <h2 style={{ ...serif, fontSize: 'clamp(22px,3vw,34px)', fontWeight: 400, lineHeight: 1.15, marginBottom: '0.75rem' }}>
          That's the core. <em style={{ color: 'var(--c-accent)' }}>Want to go deeper?</em>
        </h2>
        <p style={{ ...sans, fontSize: '0.85rem', color: 'var(--c-muted2)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          8 more questions give your dashboard more precision — fragrance identity, creative ambitions, style self-knowledge, and more.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={goExtended}
            style={{ ...mono, fontSize: '0.65rem', letterSpacing: '0.12em', padding: '0.75rem 1.75rem', borderRadius: '6px', cursor: 'pointer', background: 'var(--c-accent)', color: '#fff', border: 'none' }}
          >
            yes, 8 more questions
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{ ...mono, fontSize: '0.65rem', letterSpacing: '0.12em', padding: '0.75rem 1.75rem', borderRadius: '6px', cursor: 'pointer', background: 'none', color: 'var(--c-muted)', border: '1px solid var(--c-border-3)' }}
          >
            {saving ? 'building…' : 'no, build my dashboard'}
          </button>
        </div>
      </motion.div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-fg)', display: 'flex', flexDirection: 'column' }}>

      {/* Progress bar */}
      <div style={{ height: '2px', background: 'var(--c-border-1)', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ height: '100%', background: 'var(--c-accent)' }}
        />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem' }}>
        <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--c-accent)' }}>DO THE DASH</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <p style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-dim)', letterSpacing: '0.1em' }}>{idx + 1} / {total}</p>
          <ThemeDropdown />
        </div>
      </div>

      {/* Question */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '560px', width: '100%' }}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={q.id}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <h2 style={{ ...serif, fontSize: 'clamp(20px,3vw,32px)', fontWeight: 400, lineHeight: 1.2, marginBottom: '0.5rem' }}>
                {q.q}
              </h2>
              {q.hint && (
                <p style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-dim)', letterSpacing: '0.08em', marginBottom: '2rem', fontStyle: 'italic' }}>
                  {q.hint}
                </p>
              )}
              {!q.hint && <div style={{ marginBottom: '2rem' }} />}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {q.options.map(opt => {
                  const active = selected === opt.id
                  return (
                    <motion.button
                      key={opt.id}
                      onClick={() => pick(opt.id)}
                      whileHover={{ x: 3 }}
                      transition={{ duration: 0.12 }}
                      style={{
                        ...sans,
                        fontSize: '0.9rem',
                        color: active ? 'var(--c-fg)' : 'var(--c-body-text)',
                        background: active ? 'var(--c-accent-soft)' : 'var(--c-surface-1)',
                        border: `1px solid ${active ? 'var(--c-accent-border-strong)' : 'var(--c-border-2)'}`,
                        borderRadius: '0.5rem',
                        padding: '0.85rem 1.25rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                        background: active ? 'var(--c-accent)' : 'var(--c-border-3)',
                        transition: 'background 0.15s',
                      }} />
                      {opt.label}
                    </motion.button>
                  )
                })}
              </div>

              {/* Nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button
                  onClick={back}
                  disabled={idx === 0}
                  style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.1em', color: idx === 0 ? 'var(--c-border-3)' : 'var(--c-dim)', background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: '0.5rem 0' }}
                >
                  ← back
                </button>
                <AnimatePresence>
                  {selected && (
                    <motion.button
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      onClick={advance}
                      disabled={saving}
                      style={{ ...mono, fontSize: '0.65rem', letterSpacing: '0.15em', padding: '0.65rem 1.75rem', borderRadius: '6px', cursor: 'pointer', background: 'var(--c-accent)', color: '#fff', border: 'none' }}
                    >
                      {saving ? 'building…' : isLast ? 'build my dashboard →' : 'next →'}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
