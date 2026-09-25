import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
const allowedTypes = new Set(['text', 'tel', 'email', 'date', 'number', 'textarea', 'select', 'checkbox'])

function Turnstile({ onToken, resetKey }) {
  const container = useRef(null)
  useEffect(() => {
    if (!siteKey) return
    let mounted = true
    let widgetId
    const render = () => {
      if (!mounted || !container.current || !window.turnstile) return
      widgetId = window.turnstile.render(container.current, {
        sitekey:siteKey,
        callback:token => onToken(token),
        'expired-callback':() => onToken(''),
        'error-callback':() => onToken(''),
      })
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = render
    if (window.turnstile) render()
    else document.head.appendChild(script)
    return () => {
      mounted = false
      if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId)
      script.remove()
    }
  }, [resetKey])
  return <div ref={container} />
}

export default function PublicLeadForm() {
  const [settings, setSettings] = useState(null)
  const [packages, setPackages] = useState([])
  const [promotions, setPromotions] = useState([])
  const [catalogError, setCatalogError] = useState('')
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState({})
  const [dateMode, setDateMode] = useState('unknown')
  const [token, setToken] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState('')

  useEffect(() => {
    document.body.classList.add('public-lead-shell')
    return () => document.body.classList.remove('public-lead-shell')
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('service_packages').select('id, name, description, base_price').eq('is_active',true).order('sort_order'),
      supabase.from('promotions').select('id, name, package_id, discount_type, discount_value').eq('is_active',true).order('name'),
    ]).then(([p,promo]) => {
      if (!active) return
      if (p.error || promo.error) setCatalogError('Pilihan paket dan promo belum bisa dimuat. Silakan coba lagi nanti.')
      else { setPackages(p.data || []); setPromotions(promo.data || []) }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.from('lead_form_settings').select('title, description, fields').eq('id', 1).single()
      .then(({ data, error: fetchError }) => {
        if (!mounted) return
        if (fetchError || !Array.isArray(data?.fields)) setError('Formulir belum tersedia. Silakan coba lagi nanti.')
        else setSettings(data)
        setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (!token) return setError('Selesaikan verifikasi keamanan dulu.')
    if (settings.fields.some(field => field.enabled !== false && field.type === 'checkbox' &&
      field.required && !(answers[field.key] || []).length)) return setError('Lengkapi pertanyaan checklist yang wajib diisi.')
    if (!answers.contact_name?.trim() || (!answers.phone?.trim() && !answers.email?.trim())) {
      return setError('Isi nama dan minimal nomor WhatsApp atau email.')
    }
    if (settings.fields.some(field => field.key === 'event_date' && field.enabled !== false &&
      ((field.required && dateMode === 'unknown') ||
       (dateMode === 'date' && !answers.event_date) || (dateMode === 'month' && !answers.estimated_event_month)))) {
      return setError('Lengkapi tanggal atau perkiraan bulan acara.')
    }
    setSending(true); setError('')
    const query = new URLSearchParams(window.location.search)
    const tracking = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign'].map(key => [key, query.get(key) || '']))
    const { data, error: submitError } = await supabase.functions.invoke('submit-lead', {
      body: { answers, tracking, website_url:websiteUrl, turnstile_token:token },
    })
    if (submitError || data?.error) {
      let message = data?.error || 'Pendaftaran belum bisa dikirim. Coba lagi.'
      try { const details = await submitError?.context?.json(); if (details?.error) message = details.error } catch {}
      setError(message)
      setToken(''); setResetKey(key => key + 1)
    } else setSent(true)
    setSending(false)
  }

  return <div className="public-lead-page">
    <main className="public-lead-card">
      <a className="public-lead-brand" href="/">Damargaleri <small>Organizer</small></a>
      {loading ? <p>Memuat formulir…</p> : !settings ? <p role="alert">{error}</p> : sent ? <div className="public-lead-success">
        <h1>Terima kasih!</h1><p>Data kamu sudah kami terima. Tim Damargaleri akan menghubungi kamu melalui kontak yang diberikan.</p>
      </div> : <>
        <h1>{settings.title}</h1><p className="public-lead-description">{settings.description}</p>
        {!siteKey && <p className="public-lead-error">Formulir belum siap menerima pendaftaran. Silakan hubungi tim Damargaleri.</p>}
        <form onSubmit={submit}>
          {settings.fields.map(field => {
            if (!field.key || field.enabled === false || !allowedTypes.has(field.type)) return null
            if (field.key === 'interested_package') {
              const available = promotions.filter(promo => !promo.package_id || promo.package_id === answers.package_id)
              return <div className="public-lead-offer" key={field.key}>
                <label>{field.label}{field.required && ' *'}
                  <select required={field.required} value={answers.package_id || ''} onChange={e => {
                    const selected = packages.find(pkg => pkg.id === e.target.value)
                    setAnswers(current => ({...current,package_id:selected?.id || '', interested_package:selected?.name || '', promotion_id:''}))
                  }}>
                    <option value="">Belum memilih paket</option>
                    {packages.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.name}{pkg.base_price != null ? ` · harga dasar Rp ${Number(pkg.base_price).toLocaleString('id-ID')}` : ''}</option>)}
                  </select>
                </label>
                {answers.package_id && available.length > 0 && <label>Promo yang diminati (opsional)
                  <select value={answers.promotion_id || ''} onChange={e => setAnswers(current => ({...current,promotion_id:e.target.value}))}>
                    <option value="">Tanpa promo</option>
                    {available.map(promo => <option key={promo.id} value={promo.id}>{promo.name} · {promo.discount_type === 'percent' ? `${promo.discount_value}%` : `Rp ${Number(promo.discount_value).toLocaleString('id-ID')}`}</option>)}
                  </select>
                </label>}
                {catalogError && <small role="status">{catalogError}</small>}
              </div>
            }
            if (field.key === 'event_date' && field.type === 'date') return <fieldset className="public-lead-choices" key={field.key}>
              <legend>Rencana waktu acara{field.required && ' *'}</legend>
              <select value={dateMode} onChange={e => {
                const mode = e.target.value
                setDateMode(mode)
                setAnswers(current => ({...current,event_date:'',estimated_event_month:''}))
              }}>
                <option value="unknown">Belum diketahui</option>
                <option value="month">Perkiraan bulan dan tahun</option>
                <option value="date">Tanggal sudah pasti</option>
              </select>
              {dateMode === 'date' && <input aria-label="Tanggal acara" type="date" required value={answers.event_date || ''} onChange={e => setAnswers(current => ({...current,event_date:e.target.value}))}/>}
              {dateMode === 'month' && <input aria-label="Perkiraan bulan acara" type="month" required value={answers.estimated_event_month || ''} onChange={e => setAnswers(current => ({...current,estimated_event_month:e.target.value}))}/>}
            </fieldset>
            if (field.type === 'checkbox') return <fieldset className="public-lead-choices" key={field.key}>
              <legend>{field.label}{field.required && ' *'}</legend>
              {(field.options || []).map(option => <label key={option}>
                <input type="checkbox" checked={(answers[field.key] || []).includes(option)} onChange={e => setAnswers(current => {
                  const selected = current[field.key] || []
                  return {...current,[field.key]:e.target.checked ? [...selected,option] : selected.filter(item => item !== option)}
                })}/>{option}
              </label>)}
            </fieldset>
            return <label key={field.key}>{field.label}{field.required && ' *'}
              {field.type === 'textarea' ? <textarea maxLength="500" rows="3" required={field.required} value={answers[field.key] || ''} onChange={e => setAnswers(a => ({...a,[field.key]:e.target.value}))}/>
                : field.type === 'select' ? <select required={field.required} value={answers[field.key] || ''} onChange={e => setAnswers(a => ({...a,[field.key]:e.target.value}))}>
                  <option value="">Pilih jawaban</option>{(field.options || []).map(option => <option key={option} value={option}>{option}</option>)}
                </select> : <input type={field.type} maxLength={field.type === 'number' ? undefined : 500} min={field.type === 'number' ? '0' : undefined}
                  required={field.required} value={answers[field.key] || ''} onChange={e => setAnswers(a => ({...a,[field.key]:e.target.value}))}/>}
            </label>
          })}
          <label className="public-lead-honeypot" aria-hidden="true">Website <input tabIndex="-1" autoComplete="off" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}/></label>
          {siteKey && <Turnstile onToken={setToken} resetKey={resetKey}/>}
          {error && <p className="public-lead-error" role="alert">{error}</p>}
          <button disabled={sending || !siteKey || !token}>{sending ? 'Mengirim…' : 'Kirim pendaftaran'}</button>
          <small>Data kamu digunakan untuk menghubungi kamu terkait layanan Damargaleri.</small>
        </form>
      </>}
    </main>
  </div>
}
