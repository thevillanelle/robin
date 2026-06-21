import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import ThemeDropdown from '../components/ThemeDropdown'
import DoTheDash from './DoTheDash'

const mono  = { fontFamily: 'monospace' }
const serif = { fontFamily: '"Playfair Display", Georgia, serif' }
const sans  = { fontFamily: '"DM Sans", sans-serif' }

// ── Module definitions ─────────────────────────────────────────────

const MODULE_META = {
  ritualwear: {
    label: 'Ritualwear',
    sub: 'oracle',
    color: '#C4717A',
    url: 'https://wear.ritualware.app',
    tagline: 'Your style, decoded.',
  },
  glowup: {
    label: 'Glow Up',
    sub: 'pyramid',
    color: '#C4A96E',
    url: 'https://glowup.ritualware.app',
    tagline: 'Your beauty architecture.',
  },
  ritualwhere: {
    label: 'Ritualwhere?',
    sub: 'map',
    color: '#6AAD8A',
    url: 'https://where.ritualware.app',
    tagline: 'Where you belong.',
  },
  ritualwealth: {
    label: 'Ritualwealth',
    sub: 'fire',
    color: '#A89BC4',
    url: 'https://wealth.ritualware.app',
    tagline: 'Your financial freedom number.',
  },
  matelier: {
    label: "m'atelier",
    sub: 'studio',
    color: '#8B7E72',
    url: 'https://studio.ritualware.app',
    tagline: 'Your creative life, organized.',
  },
}

// ── Data fetching ──────────────────────────────────────────────────

async function fetchModuleData(userId) {
  const [
    styleProfile, styleRules, savedLooks,
    glowUp, styleFinder,
    neighborhood, burnout, reinvention, dating,
    firePlan, savings,
    projects, goals, skills,
  ] = await Promise.all([
    supabase.from('style_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('style_rules').select('rule_text').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('saved_looks').select('occasion,is_favourite').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    supabase.from('glow_up_results').select('result').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('style_finder_results').select('archetype,result').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('neighborhood_results').select('top_match,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('burnout_results').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('reinvention_plans').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('dating_profiles').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('user_fire_plans').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_savings_buckets').select('name,target,current').eq('user_id', userId).order('sort_order'),
    supabase.from('atelier_projects').select('name,status').eq('user_id', userId).in('status', ['active','planning']).order('created_at', { ascending: false }),
    supabase.from('atelier_goals').select('title,category,timeframe,is_complete').eq('user_id', userId).eq('is_complete', false).order('created_at', { ascending: false }),
    supabase.from('atelier_skills').select('label,level').eq('user_id', userId).order('created_at', { ascending: false }),
  ])

  return {
    ritualwear: {
      profile:    styleProfile.data,
      rules:      styleRules.data ?? [],
      looks:      savedLooks.data ?? [],
    },
    glowup: {
      glowUp:      glowUp.data,
      styleFinder: styleFinder.data,
    },
    ritualwhere: {
      neighborhood: neighborhood.data,
      burnout:      burnout.data,
      reinvention:  reinvention.data,
      dating:       dating.data,
    },
    ritualwealth: {
      firePlan: firePlan.data,
      savings:  savings.data ?? [],
    },
    matelier: {
      projects: projects.data ?? [],
      goals:    goals.data ?? [],
      skills:   skills.data ?? [],
    },
  }
}

// ── Shared utilities ───────────────────────────────────────────────

const fmt = (v) => v ? String(v).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null

const FORMALITY_LABELS = { 1: 'Very Casual', 2: 'Casual', 3: 'Creative Professional', 4: 'Elevated', 5: 'Always Elevated' }

const GLOW_SECTIONS = ['skin','sleep','nutrition','fitness','hair','face','body','teeth','fragrance','services','fashion','mindset']
const GLOW_LABELS   = { skin:'Skin', sleep:'Sleep', nutrition:'Nutrition', fitness:'Fitness', hair:'Hair', face:'Face & Makeup', body:'Body', teeth:'Teeth', fragrance:'Fragrance', services:'Pro Services', fashion:'Fashion', mindset:'Mindset' }

// ── Shared sub-components ──────────────────────────────────────────

function Label({ children }) {
  return (
    <p style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--c-dim)', marginBottom: '0.35rem' }}>
      {children}
    </p>
  )
}

function Tag({ text, color }) {
  return (
    <span style={{ ...mono, fontSize: '0.58rem', color, background: `${color}12`, border: `1px solid ${color}30`, borderRadius: '3px', padding: '0.2rem 0.5rem' }}>
      {text}
    </span>
  )
}

function ScoreBar({ label, score, color }) {
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <Label>{label}</Label>
        <span style={{ ...mono, fontSize: '0.5rem', color }}>{score}</span>
      </div>
      <div style={{ height: '4px', background: 'var(--c-border-1)', borderRadius: '2px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(score / 10) * 100}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: '2px' }}
        />
      </div>
    </div>
  )
}

function Chip({ label, value, color = 'var(--c-muted2)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <p style={{ ...mono, fontSize: '0.47rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--c-dim)' }}>{label}</p>
      <p style={{ ...sans, fontSize: '0.82rem', color, lineHeight: 1 }}>{value}</p>
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--c-border-1)', margin: '0.75rem 0' }} />
}

function EmptyState({ label, url, prompt }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <p style={{ ...sans, fontSize: '0.78rem', color: 'var(--c-dim)', lineHeight: 1.5, fontStyle: 'italic' }}>{prompt}</p>
      <a href={url} target="_blank" rel="noreferrer"
        style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--c-accent)', textDecoration: 'none' }}>
        open {label} ↗
      </a>
    </div>
  )
}

// ── Module card content — full depth ──────────────────────────────

function RitualwearContent({ data }) {
  const { profile, rules, looks } = data
  if (!profile?.kibbe_type) return (
    <EmptyState label="Ritualwear" url="https://wear.ritualware.app" prompt="Complete your Style Bible to unlock this module." />
  )
  const color = '#C4717A'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {profile.kibbe_type    && <Chip label="kibbe type"    value={fmt(profile.kibbe_type)}    color={color} />}
        {profile.color_season  && <Chip label="colour season" value={fmt(profile.color_season)}  />}
        {profile.undertone     && <Chip label="undertone"     value={fmt(profile.undertone)}     />}
        {profile.metal_preference && <Chip label="metal"      value={fmt(profile.metal_preference)} />}
        {profile.lifestyle_formality && <Chip label="formality" value={FORMALITY_LABELS[profile.lifestyle_formality]} />}
      </div>

      {profile.style_words?.length > 0 && (
        <div>
          <Label>style words</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {profile.style_words.map(w => <Tag key={w} text={fmt(w)} color={color} />)}
          </div>
        </div>
      )}

      {profile.palette_loves?.length > 0 && (
        <div>
          <Label>palette</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {profile.palette_loves.map(c => <Tag key={c} text={c} color="#C8A86B" />)}
          </div>
        </div>
      )}

      {profile.designers_loved?.length > 0 && (
        <div>
          <Label>designer DNA</Label>
          <p style={{ ...sans, fontSize: '0.8rem', color: 'var(--c-body-text)', fontStyle: 'italic', lineHeight: 1.5 }}>
            {profile.designers_loved.map(fmt).join(', ')}
          </p>
        </div>
      )}

      {profile.fabric_loves?.length > 0 && (
        <div>
          <Label>fabrics</Label>
          <p style={{ ...sans, fontSize: '0.78rem', color: 'var(--c-body-text)' }}>
            {profile.fabric_loves.map(fmt).join(' · ')}
          </p>
        </div>
      )}

      {rules.length > 0 && (
        <div>
          <Label>your rules ({rules.length})</Label>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {rules.slice(0, 7).map((r, i) => (
              <li key={i} style={{ ...sans, display: 'flex', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--c-body-text)', lineHeight: 1.45 }}>
                <span style={{ color, flexShrink: 0, marginTop: '0.1rem' }}>✦</span>{r.rule_text}
              </li>
            ))}
            {rules.length > 7 && (
              <li style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-dim)', marginTop: '0.1rem' }}>+{rules.length - 7} more rules</li>
            )}
          </ul>
        </div>
      )}

      {looks.length > 0 && (
        <div>
          <Label>recent looks</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {looks.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ ...sans, fontSize: '0.78rem', color: 'var(--c-body-text)' }}>{l.occasion}</span>
                {l.is_favourite && <span style={{ ...mono, fontSize: '0.48rem', color: '#C8A86B' }}>★ fav</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GlowUpContent({ data }) {
  const { glowUp, styleFinder } = data
  if (!glowUp && !styleFinder) return (
    <EmptyState label="Glow Up" url="https://glowup.ritualware.app" prompt="Run your first audit to unlock this module." />
  )
  const color = '#C4A96E'
  const r = glowUp?.result
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {r?.headline && (
        <p style={{ ...sans, fontSize: '0.85rem', color: 'var(--c-body-text)', fontStyle: 'italic', lineHeight: 1.5 }}>
          "{r.headline}"
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {r?.overall_tier        && <Chip label="glow tier"    value={r.overall_tier}         color={color} />}
        {r?.strongest_area      && <Chip label="strongest"    value={r.strongest_area}        />}
        {r?.biggest_opportunity && <Chip label="opportunity"  value={r.biggest_opportunity}   />}
        {styleFinder?.archetype && <Chip label="archetype"    value={fmt(styleFinder.archetype)} />}
      </div>

      {styleFinder?.result?.persona_name && (
        <div>
          <Label>style persona</Label>
          <p style={{ ...sans, fontSize: '0.8rem', color: 'var(--c-body-text)', lineHeight: 1.4 }}>
            {styleFinder.result.persona_name}
          </p>
        </div>
      )}

      {r?.section_verdicts && (
        <div>
          <Label>section scores</Label>
          <div style={{ marginTop: '0.4rem' }}>
            {GLOW_SECTIONS.filter(k => r.section_verdicts?.[k]).map(k => (
              <ScoreBar key={k} label={GLOW_LABELS[k]} score={r.section_verdicts[k].score} color={color} />
            ))}
          </div>
        </div>
      )}

      {r?.quick_wins?.length > 0 && (
        <div>
          <Label>quick wins</Label>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {r.quick_wins.slice(0, 4).map((w, i) => (
              <li key={i} style={{ ...sans, display: 'flex', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--c-body-text)', lineHeight: 1.45 }}>
                <span style={{ color: '#6AAD8A', flexShrink: 0 }}>✓</span>{w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function RitualwhereContent({ data }) {
  const { neighborhood, burnout, reinvention, dating } = data
  if (!neighborhood && !burnout && !reinvention && !dating) return (
    <EmptyState label="Ritualwhere?" url="https://where.ritualware.app" prompt="Take the neighborhood quiz to unlock this module." />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {neighborhood && (
        <div>
          <Label>neighborhood match</Label>
          <p style={{ ...serif, fontSize: '1.4rem', color: 'var(--c-fg)', lineHeight: 1, marginTop: '0.25rem' }}>
            {neighborhood.top_match}
          </p>
        </div>
      )}

      {burnout && (
        <>
          {neighborhood && <Divider />}
          <div>
            <Label>burnout type</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              <p style={{ ...sans, fontSize: '0.95rem', color: 'var(--c-fg)', textTransform: 'capitalize' }}>
                {burnout.burnout_type} Burnout
              </p>
              {burnout.is_chronic && (
                <span style={{ ...mono, fontSize: '0.48rem', color: '#D97706', border: '1px solid #D97706', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
                  CHRONIC
                </span>
              )}
              {burnout.severity != null && (
                <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-dim)' }}>severity {burnout.severity}</span>
              )}
            </div>
            {burnout.protocol?.immediate?.length > 0 && (
              <div style={{ marginTop: '0.6rem' }}>
                <Label>immediate moves</Label>
                <ul style={{ listStyle: 'none', margin: '0.25rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {burnout.protocol.immediate.slice(0, 3).map((item, i) => (
                    <li key={i} style={{ ...sans, display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--c-body-text)', lineHeight: 1.4 }}>
                      <span style={{ color: '#6AAD8A', flexShrink: 0 }}>→</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      {reinvention && (
        <>
          <Divider />
          <div>
            <Label>quarterly reinvention{reinvention.quarter ? ` · ${reinvention.quarter}` : ''}</Label>
            <p style={{ ...sans, fontSize: '0.95rem', color: 'var(--c-fg)', marginTop: '0.25rem', marginBottom: '0.4rem' }}>
              {reinvention.priority_area}
            </p>
            {reinvention.moves?.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {reinvention.moves.slice(0, 3).map((m, i) => (
                  <li key={i} style={{ ...sans, display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--c-body-text)', lineHeight: 1.4 }}>
                    <span style={{ color: '#6AAD8A', flexShrink: 0 }}>✦</span>{m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {dating && (
        <>
          <Divider />
          <div>
            <Label>dating strategy</Label>
            <p style={{ ...sans, fontSize: '0.9rem', color: 'var(--c-fg)', textTransform: 'capitalize', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
              {fmt(dating.dating_goal)}
            </p>
            {dating.main_strategy && (
              <p style={{ ...sans, fontSize: '0.75rem', color: 'var(--c-body-text)', fontStyle: 'italic', lineHeight: 1.5 }}>
                {dating.main_strategy}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function RitualwealthContent({ data }) {
  const { firePlan, savings } = data
  if (!firePlan) return (
    <EmptyState label="Ritualwealth" url="https://wealth.ritualware.app" prompt="Map your FIRE plan to unlock this module." />
  )
  const color = '#A89BC4'
  const totalSaved  = savings.reduce((s, b) => s + (parseFloat(b.current) || 0), 0)
  const totalTarget = savings.reduce((s, b) => s + (parseFloat(b.target) || 0), 0)
  const pct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {firePlan.fire_type     && <Chip label="fire type"     value={fmt(firePlan.fire_type)}  color={color} />}
        {firePlan.target_age    && <Chip label="target age"    value={firePlan.target_age}       />}
        {firePlan.target_number && (
          <Chip label="target number" value={`$${Number(firePlan.target_number).toLocaleString()}`} color={color} />
        )}
        {firePlan.annual_spend && (
          <Chip label="annual spend" value={`$${Number(firePlan.annual_spend).toLocaleString()}`} />
        )}
      </div>

      {savings.length > 0 && (
        <div>
          <Label>savings buckets</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.4rem' }}>
            {savings.map((b, i) => {
              const bPct = b.target > 0 ? Math.min((parseFloat(b.current) / parseFloat(b.target)) * 100, 100) : 0
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ ...sans, fontSize: '0.75rem', color: 'var(--c-body-text)' }}>{b.name}</span>
                    <span style={{ ...mono, fontSize: '0.48rem', color }}>
                      ${Number(b.current || 0).toLocaleString()} / ${Number(b.target || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: '3px', background: 'var(--c-border-1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${bPct}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      style={{ height: '100%', background: color, borderRadius: '2px' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {pct != null && (
            <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...mono, fontSize: '0.48rem', color: 'var(--c-dim)' }}>overall progress</span>
              <span style={{ ...mono, fontSize: '0.55rem', color }}>{Math.round(pct)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AtelierContent({ data }) {
  const { projects, goals, skills } = data
  if (!projects.length && !goals.length && !skills.length) return (
    <EmptyState label="m'atelier" url="https://studio.ritualware.app" prompt="Add your first project to unlock this module." />
  )
  const color = '#8B7E72'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {projects.length > 0 && (
        <div>
          <Label>active projects</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.3rem' }}>
            {projects.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                <span style={{ ...sans, fontSize: '0.8rem', color: 'var(--c-body-text)' }}>{p.name}</span>
                <span style={{ ...mono, fontSize: '0.47rem', color: p.status === 'active' ? '#6AAD8A' : color }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length > 0 && (
        <div>
          {projects.length > 0 && <Divider />}
          <Label>open goals</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.3rem' }}>
            {goals.map((g, i) => (
              <div key={i}>
                <p style={{ ...sans, fontSize: '0.8rem', color: 'var(--c-body-text)' }}>{g.title}</p>
                {(g.category || g.timeframe) && (
                  <p style={{ ...mono, fontSize: '0.47rem', color: 'var(--c-dim)', marginTop: '0.1rem' }}>
                    {[g.category, g.timeframe].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div>
          {(projects.length > 0 || goals.length > 0) && <Divider />}
          <Label>skills</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.35rem' }}>
            {skills.map((s, i) => (
              <Tag key={i} text={`${s.label}${s.level && s.level !== 'Familiar' ? ` · ${s.level}` : ''}`} color={color} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Module card ────────────────────────────────────────────────────

function ModuleCard({ mod, data, editing, onMoveUp, onMoveDown, onToggle, isFirst, isLast }) {
  const meta    = MODULE_META[mod.id]
  const content = {
    ritualwear:   <RitualwearContent   data={data} />,
    glowup:       <GlowUpContent       data={data} />,
    ritualwhere:  <RitualwhereContent  data={data} />,
    ritualwealth: <RitualwealthContent data={data} />,
    matelier:     <AtelierContent      data={data} />,
  }[mod.id]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: mod.enabled ? 1 : 0.3, y: 0 }}
      style={{
        padding: '1.5rem 1.75rem',
        background: 'var(--c-surface-1)',
        borderRadius: '1rem',
        border: `1px solid ${editing ? 'var(--c-border-3)' : 'var(--c-border-1)'}`,
        transition: 'opacity 0.2s, border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <p style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: meta.color, marginBottom: '0.2rem' }}>
            {meta.sub}
          </p>
          <p style={{ ...serif, fontSize: '1.15rem', color: 'var(--c-fg)', lineHeight: 1 }}>{meta.label}</p>
          <p style={{ ...mono, fontSize: '0.5rem', color: 'var(--c-dim)', marginTop: '0.2rem', fontStyle: 'italic' }}>{meta.tagline}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {editing ? (
            <>
              <button onClick={() => onToggle(mod.id)}
                style={{ ...mono, fontSize: '0.52rem', color: mod.enabled ? 'var(--c-up)' : 'var(--c-dim)', background: 'none', border: '1px solid var(--c-border-3)', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
                {mod.enabled ? 'visible' : 'hidden'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button onClick={() => onMoveUp(mod.id)} disabled={isFirst}
                  style={{ ...mono, fontSize: '0.6rem', color: isFirst ? 'var(--c-border-3)' : 'var(--c-muted)', background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer', lineHeight: 1, padding: '2px' }}>▲</button>
                <button onClick={() => onMoveDown(mod.id)} disabled={isLast}
                  style={{ ...mono, fontSize: '0.6rem', color: isLast ? 'var(--c-border-3)' : 'var(--c-muted)', background: 'none', border: 'none', cursor: isLast ? 'default' : 'pointer', lineHeight: 1, padding: '2px' }}>▼</button>
              </div>
            </>
          ) : (
            <a href={meta.url} target="_blank" rel="noreferrer"
              style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--c-dim)', textDecoration: 'none' }}>
              open ↗
            </a>
          )}
        </div>
      </div>
      {mod.enabled && content}
    </motion.div>
  )
}

// ── Completion header ──────────────────────────────────────────────

function completionItems(moduleData) {
  if (!moduleData) return []
  const d = moduleData
  return [
    { label: 'Style Bible',          done: !!d.ritualwear?.profile?.kibbe_type },
    { label: 'Glow Up Audit',        done: !!d.glowup?.glowUp?.result },
    { label: 'Neighborhood',         done: !!d.ritualwhere?.neighborhood },
    { label: 'Burnout Audit',        done: !!d.ritualwhere?.burnout },
    { label: 'Quarterly Focus',      done: !!d.ritualwhere?.reinvention },
    { label: 'Dating Strategy',      done: !!d.ritualwhere?.dating },
    { label: 'Projects',             done: (d.matelier?.projects?.length ?? 0) > 0 },
    { label: 'Goals',                done: (d.matelier?.goals?.length ?? 0) > 0 },
    { label: 'FIRE Plan',            done: !!d.ritualwealth?.firePlan },
  ]
}

// ── Main ──────────────────────────────────────────────────────────

export default function UserDashboard({ user, onExitPreview = null }) {
  const [modules, setModules]         = useState(null)
  const [moduleData, setModuleData]   = useState(null)
  const [loading, setLoading]         = useState(true)
  const [editing, setEditing]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [showAddTray, setShowAddTray] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  useEffect(() => {
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
  }, [user.id])

  const saveModules = async (mods) => {
    setSaving(true)
    await supabase.from('robin_dashboard_config').upsert({
      user_id: user.id, modules: mods,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSaving(false)
  }

  const moveUp = (id) => {
    setModules(prev => {
      const i = prev.findIndex(m => m.id === id)
      if (i === 0) return prev
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      saveModules(next)
      return next
    })
  }

  const moveDown = (id) => {
    setModules(prev => {
      const i = prev.findIndex(m => m.id === id)
      if (i === prev.length - 1) return prev
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      saveModules(next)
      return next
    })
  }

  const toggleModule = (id) => {
    setModules(prev => {
      const next = prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)
      saveModules(next)
      return next
    })
  }

  const addModule = (id) => {
    setModules(prev => {
      const existing = prev.find(m => m.id === id)
      const next = existing
        ? prev.map(m => m.id === id ? { ...m, enabled: true } : m)
        : [...prev, { id, enabled: true, order: prev.length }]
      saveModules(next)
      return next
    })
    setShowAddTray(false)
  }

  const retakeQuiz = async () => {
    await supabase.from('robin_dashboard_config').delete().eq('user_id', user.id)
    await supabase.from('robin_quiz_results').delete().eq('user_id', user.id)
    setModules(null)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--c-dim)' }}>loading your profile…</p>
    </main>
  )

  if (!modules) return (
    <DoTheDash user={user} onComplete={(mods) => setModules(mods)} />
  )

  const items      = completionItems(moduleData)
  const doneCount  = items.filter(i => i.done).length
  const totalCount = items.length
  const pctDone    = Math.round((doneCount / totalCount) * 100)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-fg)', padding: 'clamp(2rem,4vw,3.5rem) clamp(1rem,3vw,2.5rem)' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--c-accent)' }}>ROBIN // YOUR RITUALWARE</p>
              {onExitPreview && (
                <button onClick={onExitPreview}
                  style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.12em', color: 'var(--c-dim)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--c-border-2)', borderRadius: '4px', padding: '0.25rem 0.7rem', cursor: 'pointer' }}>
                  back to admin
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => setEditing(e => !e)}
                style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.12em', color: editing ? 'var(--c-accent)' : 'var(--c-dim)', background: 'none', border: `1px solid ${editing ? 'var(--c-accent-border)' : 'var(--c-border-2)'}`, borderRadius: '4px', padding: '0.35rem 0.85rem', cursor: 'pointer' }}>
                {editing ? (saving ? 'saving…' : 'done') : 'edit dashboard'}
              </button>
              <ThemeDropdown />
            </div>
          </div>
          <h1 style={{ ...serif, fontSize: 'clamp(24px,3.5vw,42px)', fontWeight: 400, lineHeight: 1.1 }}>
            Your ritual life, <em style={{ color: 'var(--c-accent)' }}>in depth.</em>
          </h1>
        </motion.div>

        {/* Completion tracker */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', background: 'var(--c-surface-1)', borderRadius: '1rem', border: '1px solid var(--c-border-1)', cursor: 'pointer' }}
          onClick={() => setShowCompletion(s => !s)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--c-accent)', textTransform: 'uppercase' }}>
              profile completion
            </p>
            <p style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-muted2)' }}>
              {doneCount}/{totalCount} · {pctDone}%
            </p>
          </div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {items.map((item, i) => (
              <div key={i} title={item.label} style={{ flex: 1, height: '4px', borderRadius: '2px', background: item.done ? 'var(--c-accent)' : 'var(--c-border-2)', transition: 'background 0.3s' }} />
            ))}
          </div>
          <AnimatePresence>
            {showCompletion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ paddingTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {items.map((item, i) => (
                    <span key={i} style={{
                      ...mono, fontSize: '0.5rem', letterSpacing: '0.08em', padding: '0.25rem 0.6rem', borderRadius: '3px',
                      background: item.done ? 'var(--c-accent)18' : 'var(--c-surface-2)',
                      color: item.done ? 'var(--c-accent)' : 'var(--c-dim)',
                      border: `1px solid ${item.done ? 'var(--c-accent)40' : 'var(--c-border-1)'}`,
                    }}>
                      {item.done ? '✓' : '○'} {item.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Module grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <AnimatePresence>
            {modules.map((mod, i) => (
              <ModuleCard
                key={mod.id}
                mod={mod}
                data={moduleData?.[mod.id] ?? {}}
                editing={editing}
                onMoveUp={moveUp}
                onMoveDown={moveDown}
                onToggle={toggleModule}
                isFirst={i === 0}
                isLast={i === modules.length - 1}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Add module tray */}
        {(() => {
          const addable = Object.keys(MODULE_META).filter(id => {
            const inConfig = modules.find(m => m.id === id)
            return !inConfig || !inConfig.enabled
          })
          if (!addable.length) return null
          return (
            <div style={{ marginBottom: '2rem' }}>
              {showAddTray ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ padding: '1.25rem', background: 'var(--c-surface-1)', borderRadius: '0.75rem', border: '1px solid var(--c-border-2)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <p style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--c-accent)', textTransform: 'uppercase' }}>add a module</p>
                    <button onClick={() => setShowAddTray(false)}
                      style={{ ...mono, fontSize: '0.55rem', color: 'var(--c-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      cancel
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {addable.map(id => {
                      const meta = MODULE_META[id]
                      return (
                        <motion.button key={id}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => addModule(id)}
                          style={{
                            ...mono, fontSize: '0.6rem', letterSpacing: '0.1em',
                            display: 'flex', flexDirection: 'column', gap: '0.2rem',
                            padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer',
                            background: 'var(--c-surface-2)',
                            border: `1px solid ${meta.color}40`,
                            color: meta.color, textAlign: 'left',
                          }}
                        >
                          <span>{meta.label}</span>
                          <span style={{ ...sans, fontSize: '0.65rem', color: 'var(--c-dim)' }}>{meta.tagline}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => setShowAddTray(true)}
                  style={{
                    ...mono, fontSize: '0.55rem', letterSpacing: '0.15em',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    width: '100%', padding: '0.75rem 1.25rem',
                    background: 'none', border: '1px dashed var(--c-border-2)',
                    borderRadius: '0.75rem', cursor: 'pointer',
                    color: 'var(--c-dim)', transition: 'border-color 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-border-3)'; e.currentTarget.style.color = 'var(--c-muted)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-border-2)'; e.currentTarget.style.color = 'var(--c-dim)' }}
                >
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
                  <span>add a module</span>
                </button>
              )}
            </div>
          )
        })()}

        {/* Footer */}
        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--c-border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button onClick={retakeQuiz}
            style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--c-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
            retake do the dash
          </button>
          <button onClick={() => supabase.auth.signOut()}
            style={{ ...mono, fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--c-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
            sign out
          </button>
        </div>

      </div>
    </main>
  )
}
