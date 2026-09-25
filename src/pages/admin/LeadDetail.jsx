import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const types = { note:'Catatan', call:'Telepon', whatsapp:'WhatsApp', email:'Email', meeting:'Meeting', follow_up:'Follow-up', status_change:'Perubahan status' }
const emptyActivity = { activity_type:'note', description:'' }

function displayDate(value) {
  return value ? new Date(value).toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' }) : 'Belum dijadwalkan'
}

export default function LeadDetail({ lead, admins, isSuperadmin, onClose, onChanged }) {
  const [activities, setActivities] = useState([])
  const [activity, setActivity] = useState(emptyActivity)
  const [followUp, setFollowUp] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fieldLabels, setFieldLabels] = useState({})

  async function assignPm(event) {
    const owner = event.target.value || null
    setBusy(true); setError('')
    const { data, error: updateError } = await supabase.from('leads')
      .update({ owner_admin:owner }).eq('id', lead.id).select('id, owner_admin').single()
    if (updateError || !data) setError(`Gagal menugaskan PM: ${updateError?.message || 'Akses ditolak.'}`)
    else onChanged({ ...lead, owner_admin:data.owner_admin })
    setBusy(false)
  }

  useEffect(() => {
    let active = true
    supabase.from('lead_form_settings').select('fields').eq('id', 1).single()
      .then(({data}) => {
        if (active && Array.isArray(data?.fields)) setFieldLabels(Object.fromEntries(data.fields.map(field => [field.key,field.label])))
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    supabase.from('lead_activities')
      .select('id, activity_type, description, happened_at')
      .eq('lead_id', lead.id).order('happened_at', { ascending:false })
      .then(({ data, error: loadError }) => {
        if (!active) return
        if (loadError) setError(loadError.message)
        else setActivities(data || [])
        setLoading(false)
      })
    return () => { active = false }
  }, [lead.id])

  async function saveActivity(event) {
    event.preventDefault()
    if (!activity.description.trim()) return
    setBusy(true); setError('')
    const { data, error: insertError } = await supabase.from('lead_activities')
      .insert({ lead_id:lead.id, activity_type:activity.activity_type, description:activity.description.trim() })
      .select('id, activity_type, description, happened_at').single()
    if (insertError) setError(insertError.message)
    else { setActivities(previous => [data, ...previous]); setActivity(emptyActivity) }
    setBusy(false)
  }

  async function saveFollowUp(event) {
    event.preventDefault()
    setBusy(true); setError('')
    const date = followUp ? new Date(followUp) : null
    if (date && Number.isNaN(date.getTime())) {
      setError('Tanggal follow-up tidak valid.'); setBusy(false); return
    }
    const { data, error: updateError } = await supabase.from('leads')
      .update({ next_follow_up_at:date?.toISOString() || null })
      .eq('id', lead.id).select('id, next_follow_up_at').single()
    if (updateError) setError(updateError.message)
    else { onChanged({ ...lead, next_follow_up_at:data.next_follow_up_at }); setFollowUp('') }
    setBusy(false)
  }

  async function finishFollowUp() {
    setBusy(true); setError('')
    const { data, error: updateError } = await supabase.from('leads')
      .update({ next_follow_up_at:null, ...(lead.status === 'new' ? { status:'contacted' } : {}) })
      .eq('id', lead.id).select('id, next_follow_up_at, status').single()
    if (updateError || !data) setError(`Gagal menyelesaikan follow-up: ${updateError?.message || 'Akses ditolak.'}`)
    else {
      onChanged({ ...lead, next_follow_up_at:null, status:data.status })
      const { data: log, error: logError } = await supabase.from('lead_activities')
        .insert({ lead_id:lead.id, activity_type:'follow_up', description:'Follow-up ditandai selesai' })
        .select('id, activity_type, description, happened_at').single()
      if (logError) setError(`Jadwal sudah dihapus, tetapi riwayat gagal disimpan: ${logError.message}`)
      else setActivities(previous => [log, ...previous])
    }
    setBusy(false)
  }

  return <div className="lead-detail-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="lead-detail" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title">
      <header className="lead-detail-header">
        <div><span>DETAIL CALON CLIENT</span><h2 id="lead-detail-title">{lead.contact_name}</h2><p>{[lead.bride_name, lead.groom_name].filter(Boolean).join(' & ') || 'Nama pasangan belum lengkap'}</p></div>
        <button type="button" aria-label="Tutup detail" onClick={onClose}>✕</button>
      </header>
      <div className="lead-detail-body">
        <div className="lead-detail-facts">
          <div><span>WhatsApp</span><strong>{lead.phone || '—'}</strong></div>
          <div><span>Email</span><strong>{lead.email || '—'}</strong></div>
          <div><span>Masuk melalui</span><strong>{lead.source || '—'}</strong></div>
          <div><span>Tahu Damargaleri dari</span><strong>{lead.source_detail || '—'}</strong></div>
          <div><span>Acara</span><strong>{lead.event_date || (lead.estimated_event_month ? `Perkiraan ${new Date(`${lead.estimated_event_month}-01T12:00:00`).toLocaleDateString('id-ID',{month:'long',year:'numeric'})}` : 'Belum diketahui')}</strong></div>
          <div><span>Paket</span><strong>{lead.interested_package || '—'}</strong></div>
          <div><span>Follow-up berikutnya</span><strong>{displayDate(lead.next_follow_up_at)}</strong></div>
        </div>
        {isSuperadmin && <label className="lead-detail-owner">Ditangani oleh
          <select value={lead.owner_admin || ''} onChange={assignPm} disabled={busy}>
            <option value="">Belum ditugaskan (superadmin)</option>
            {admins.filter(admin => admin.role === 'admin' || admin.role === 'superadmin')
              .map(admin => <option value={admin.id} key={admin.id}>{admin.full_name}</option>)}
          </select>
        </label>}
        {Object.keys(lead.form_answers || {}).length > 0 && <div className="lead-detail-facts">
          {Object.entries(lead.form_answers).map(([key,value]) => <div key={key}>
            <span>{(typeof value === 'object' && value?.label) || fieldLabels[key] || 'Jawaban tambahan'}</span>
            <strong>{Array.isArray(value?.value) ? value.value.join(', ') : String(typeof value === 'object' && value !== null ? value.value : value)}</strong>
          </div>)}
        </div>}
        {lead.notes && <p className="lead-detail-initial">Catatan awal: {lead.notes}</p>}
        <form className="lead-detail-followup" onSubmit={saveFollowUp}>
          <label htmlFor="lead-next-followup">Jadwalkan follow-up (waktu lokal perangkat)</label>
          <div><input id="lead-next-followup" type="datetime-local" value={followUp} onChange={event => setFollowUp(event.target.value)}/><button disabled={busy || !followUp}>Simpan jadwal</button></div>
          {lead.next_follow_up_at && <button type="button" className="lead-detail-finish" disabled={busy} onClick={finishFollowUp}>Tandai follow-up selesai</button>}
        </form>
        <h3>Riwayat interaksi</h3>
        {loading ? <p className="lead-detail-empty">Memuat interaksi…</p> : activities.length === 0 ? <p className="lead-detail-empty">Belum ada interaksi tercatat.</p> :
          <div className="lead-detail-timeline">{activities.map(item => <article key={item.id}><strong>{types[item.activity_type] || item.activity_type}</strong><time>{displayDate(item.happened_at)}</time><p>{item.description}</p></article>)}</div>}
        <form className="lead-detail-activity" onSubmit={saveActivity}>
          <label htmlFor="lead-activity-type">Catat interaksi baru</label>
          <select id="lead-activity-type" value={activity.activity_type} onChange={event => setActivity(previous => ({...previous,activity_type:event.target.value}))}>{Object.entries(types).filter(([key]) => key !== 'status_change').map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>
          <textarea required rows={3} value={activity.description} onChange={event => setActivity(previous => ({...previous,description:event.target.value}))} placeholder="Apa yang dibicarakan dan tindak lanjutnya?"/>
          {error && <p role="alert" className="lead-detail-error">{error}</p>}
          <button disabled={busy || !activity.description.trim()}>{busy ? 'Menyimpan…' : 'Simpan interaksi'}</button>
        </form>
      </div>
    </section>
  </div>
}
