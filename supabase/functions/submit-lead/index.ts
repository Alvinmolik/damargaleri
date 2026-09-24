import { createClient } from 'npm:@supabase/supabase-js@2.116.0'

const origins = new Set(['https://app.damargaleri.com', 'http://localhost:5173'])
const standardKeys = new Set([
  'contact_name', 'phone', 'email', 'bride_name', 'groom_name', 'event_date',
  'location', 'estimated_budget', 'interested_package', 'source_detail',
])

type FormField = { key: string; type: string; required?: boolean; enabled?: boolean; options?: string[] }

function reply(origin: string, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Vary': 'Origin',
    },
  })
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin') || ''
  if (!origins.has(origin)) return new Response('Forbidden', { status: 403 })
  if (request.method === 'OPTIONS') return reply(origin, { ok: true })
  if (request.method !== 'POST') return reply(origin, { error: 'Method not allowed' }, 405)

  try {
    const raw = await request.text()
    if (raw.length > 12000) return reply(origin, { error: 'Isian terlalu panjang.' }, 413)
    const body = JSON.parse(raw)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(origin, { error: 'Data tidak valid.' }, 400)
    if (body.website_url) return reply(origin, { ok: true }, 202) // Honeypot; no lead is created.

    const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
    const allowedHostname = Deno.env.get('TURNSTILE_ALLOWED_HOSTNAME') || 'app.damargaleri.com'
    if (!secret) return reply(origin, { error: 'Formulir belum siap. Silakan hubungi tim kami.' }, 503)
    const captcha = String(body.turnstile_token || '')
    if (!captcha || captcha.length > 2048) return reply(origin, { error: 'Verifikasi keamanan diperlukan.' }, 400)

    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response:captcha, remoteip:request.headers.get('CF-Connecting-IP') || '' }),
    })
    if (!verification.ok) throw new Error('Turnstile unavailable')
    const verdict = await verification.json()
    if (!verdict.success || verdict.hostname !== allowedHostname) {
      return reply(origin, { error: 'Verifikasi keamanan gagal. Ulangi lalu kirim lagi.' }, 400)
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', {
      auth: { persistSession:false, autoRefreshToken:false },
    })
    const { data: settings, error: settingsError } = await admin.from('lead_form_settings')
      .select('fields').eq('id', 1).single()
    if (settingsError || !settings || !Array.isArray(settings.fields)) throw new Error('Form settings unavailable')

    const inputs = body.answers
    if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
      return reply(origin, { error: 'Isian tidak valid.' }, 400)
    }
    const answers: Record<string, string> = {}
    const selections: Record<string, string[]> = {}
    for (const field of settings.fields as FormField[]) {
      if (field.enabled === false) continue
      if (!field.key || (!standardKeys.has(field.key) && !/^custom_[a-z0-9_]{1,40}$/.test(field.key))) {
        throw new Error('Invalid form field')
      }
      const value = inputs[field.key]
      if (field.type === 'checkbox') {
        if (!field.key.startsWith('custom_') || !Array.isArray(value) && value !== undefined) {
          return reply(origin, { error: 'Pilihan tidak valid.' }, 400)
        }
        const selected = value || []
        if (!Array.isArray(field.options) || field.options.length > 20 || selected.length > 20 ||
          selected.some((item: unknown) => typeof item !== 'string' || item.length > 500 || !field.options?.includes(item)) ||
          new Set(selected).size !== selected.length) return reply(origin, { error: 'Pilihan tidak valid.' }, 400)
        if (field.required && selected.length === 0) return reply(origin, { error: `Lengkapi kolom ${field.key}.` }, 400)
        if (selected.length) selections[field.key] = selected
        continue
      }
      if (value !== undefined && typeof value !== 'string') return reply(origin, { error: 'Isian tidak valid.' }, 400)
      const cleaned = String(value || '').trim()
      if (field.required && !cleaned) return reply(origin, { error: `Lengkapi kolom ${field.key}.` }, 400)
      if (cleaned.length > 500) return reply(origin, { error: 'Isian terlalu panjang.' }, 400)
      if (field.type === 'select' && cleaned && !field.options?.includes(cleaned)) {
        return reply(origin, { error: 'Pilihan tidak valid.' }, 400)
      }
      if (cleaned) answers[field.key] = cleaned
    }

    if (!answers.contact_name || (!answers.phone && !answers.email)) {
      return reply(origin, { error: 'Nama dan nomor WhatsApp atau email wajib diisi.' }, 400)
    }
    if (answers.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)) {
      return reply(origin, { error: 'Alamat email tidak valid.' }, 400)
    }
    if (answers.phone && !/^\+?[0-9\s()-]{8,25}$/.test(answers.phone)) {
      return reply(origin, { error: 'Nomor WhatsApp tidak valid.' }, 400)
    }
    if (answers.event_date && (!/^\d{4}-\d{2}-\d{2}$/.test(answers.event_date)
      || Number.isNaN(Date.parse(`${answers.event_date}T00:00:00Z`))
      || new Date(`${answers.event_date}T00:00:00Z`).toISOString().slice(0, 10) !== answers.event_date)) {
      return reply(origin, { error: 'Tanggal acara tidak valid.' }, 400)
    }
    const budget = answers.estimated_budget ? Number(answers.estimated_budget) : 0
    if (!Number.isSafeInteger(budget) || budget < 0) return reply(origin, { error: 'Budget tidak valid.' }, 400)

    const tracking = body.tracking && typeof body.tracking === 'object' && !Array.isArray(body.tracking)
      ? body.tracking : {}
    const track = (key: string) => String(tracking[key] || '').slice(0, 120).trim() || null
    const extra = Object.fromEntries((settings.fields as FormField[])
      .filter(field => field.key.startsWith('custom_') && (answers[field.key] || selections[field.key]))
      .map(field => [field.key, { label:String((field as FormField & { label?: string }).label || field.key).slice(0, 100), value:selections[field.key] || answers[field.key] }]))
    const { error: insertError } = await admin.from('leads').insert({
      contact_name:answers.contact_name, phone:answers.phone || null,
      email:answers.email?.toLowerCase() || null, bride_name:answers.bride_name || null,
      groom_name:answers.groom_name || null, event_date:answers.event_date || null,
      location:answers.location || null, estimated_budget:budget,
      interested_package:answers.interested_package || null,
      source:'website', source_detail:answers.source_detail || null,
      utm_source:track('utm_source'), utm_medium:track('utm_medium'), utm_campaign:track('utm_campaign'),
      form_answers:extra, owner_admin:null, created_by:null,
    })
    if (insertError) throw insertError
    return reply(origin, { ok:true }, 201)
  } catch (error) {
    console.error('Public lead submission failed', error)
    return reply(origin, { error:'Pendaftaran belum bisa dikirim. Coba lagi nanti.' }, 500)
  }
})
