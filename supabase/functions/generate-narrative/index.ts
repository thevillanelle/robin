import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

function fmt(value) {
  if (value == null) return ""
  if (Array.isArray(value)) return value.map(fmt).filter(Boolean).join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value).replace(/_/g, " ")
}

function buildPrompt(payload, displayName) {
  const lines = []
  const p = payload.profile ?? {}
  if (p.kibbe_type) lines.push(`Style: ${fmt(p.kibbe_type)} body type, ${fmt(p.color_season)} colour season, ${fmt(p.undertone)} undertone.`)
  if (p.style_words) lines.push(`Style words: ${fmt(p.style_words)}.`)
  if (p.designer_dna) lines.push(`Designer DNA: ${fmt(p.designer_dna)}.`)
  if (p.never_wears) lines.push(`Never wears: ${fmt(p.never_wears)}.`)
  if (p.style_uniform) lines.push(`Style uniform: ${fmt(p.style_uniform)}.`)
  if (p.style_mistake) lines.push(`Self-identified style mistake: ${fmt(p.style_mistake)}.`)

  const rules = payload.rules ?? []
  if (rules.length) lines.push(`Personal style rules: ${rules.map(r => `[${fmt(r.rule_type)}] ${fmt(r.rule_text)}`).join("; ")}.`)

  const glow = payload.glow
  if (glow?.overall_tier) lines.push(`Glow Up tier: ${fmt(glow.overall_tier)}. Strongest area: ${fmt(glow.strongest_area)}. Biggest opportunity: ${fmt(glow.biggest_opportunity)}.`)

  const sf = payload.styleFinder
  if (sf?.persona_name) lines.push(`Style Finder archetype persona: ${fmt(sf.persona_name)}.`)

  const n = payload.neighborhood
  if (n?.top_match) lines.push(`Best-match NYC neighborhood: ${fmt(n.top_match)}.`)

  const dating = payload.dating
  if (dating?.dating_goal) lines.push(`Dating goal: ${fmt(dating.dating_goal)}. Pattern: ${fmt(dating.pattern)}. Strategy: ${fmt(dating.main_strategy)}.`)

  const goals = payload.goals ?? []
  if (goals.length) lines.push(`Goals: ${goals.map(g => `${fmt(g.title)}${g.is_complete ? " (done)" : ""}`).join("; ")}.`)

  const atelier = payload.atelier ?? []
  if (atelier.length) lines.push(`Active projects: ${atelier.map(a => fmt(a.name)).join(", ")}.`)

  const facts = lines.length ? lines.join("\n") : "No data has been recorded yet for this person."

  return `You are Elle Porcher: a New York composer and cultural analyst who decodes desire, fraud, and performance for a living, and who is glam, sharp, theatrical, and a little subversive. You're writing a short prose "case study" narrative about a customer of your Ritualware app suite, based only on the facts below — never invent details that aren't given.

Write 3-4 short paragraphs, second person ("you"), in your voice: perceptive, a little wry, attentive to the gap between image and reality, never generic self-help language. Ground every claim in the facts provided. If a category has no data, simply don't mention it — don't apologize for missing data or pad with filler. End on a single sharp, memorable line.

Facts about ${displayName || "this person"}:
${facts}`
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return json({ error: "Missing authorization" }, 401)
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ error: "Server misconfigured" }, 500)

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ error: "Unauthorized" }, 401)

  if (!GEMINI_API_KEY) return json({ error: "Narrative generation is not configured yet — ask Elle to set the GEMINI_API_KEY secret on this project." }, 503)

  let payload
  try {
    const body = await req.json()
    payload = body.payload ?? {}
  } catch {
    return json({ error: "Invalid request body" }, 400)
  }

  const displayName = user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "you"
  const prompt = buildPrompt(payload, displayName)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  )

  if (!res.ok) {
    console.error("Gemini error:", await res.text())
    return json({ error: "Narrative generation failed" }, 502)
  }

  const result = await res.json()
  const narrative = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!narrative) return json({ error: "Narrative generation returned nothing" }, 502)

  return json({ narrative })
})
