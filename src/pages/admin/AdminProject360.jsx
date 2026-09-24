import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const eventTypes = [
  ['meeting','Meeting'], ['prewedding','Prewedding'], ['engagement','Lamaran'],
  ['fitting','Fitting'], ['food_tasting','Food tasting'], ['technical_meeting','Technical meeting'],
  ['akad','Akad'], ['reception','Resepsi'], ['wedding','Pernikahan'], ['other','Lainnya'],
]

const eventTypeLabel = Object.fromEntries(eventTypes)
const auditLabels = {
  leads:'Lead', projects:'Project', project_members:'Akses client',
  project_invitations:'Undangan client', project_events:'Agenda',
}

function formatDate(value, withTime=false) {
  if (!value) return 'Belum diatur'
  return new Date(value).toLocaleDateString('id-ID', {
    day:'numeric', month:'short', year:'numeric',
    ...(withTime ? { hour:'2-digit', minute:'2-digit' } : {}),
  })
}

function rupiah(value) {
  return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 })
    .format(Number(value || 0))
}

export default function AdminProject360({ project, onBack, onEdit }) {
  const [data, setData] = useState({ tasks:[], events:[], budgets:[], vendors:[], audits:[] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventBusy, setEventBusy] = useState(false)
  const [eventForm, setEventForm] = useState({
    title:'', event_type:'meeting', date:'', time:'10:00', location:'', notes:'',
  })

  useEffect(() => { fetchProject360() }, [project.id])

  async function fetchProject360() {
    setLoading(true)
    setError('')
    const [tasks, events, budgets, vendors, audits] = await Promise.all([
      supabase.from('checklist_tasks').select('id, text, done, due_date, status, pic').eq('project_id', project.id).order('due_date', { ascending:true, nullsFirst:false }),
      supabase.from('project_events').select('*').eq('project_id', project.id).order('starts_at'),
      supabase.from('budget_categories').select('*').eq('project_id', project.id).order('sort_order'),
      supabase.from('vendors').select('*').eq('project_id', project.id).order('sort_order'),
      supabase.from('audit_logs').select('id, action, entity_type, entity_id, created_at').eq('project_id', project.id).order('created_at', { ascending:false }).limit(12),
    ])
    const failed = [tasks, events, budgets, vendors, audits].find(result => result.error)
    if (failed) setError(failed.error.message)
    setData({
      tasks:tasks.data || [], events:events.data || [], budgets:budgets.data || [],
      vendors:vendors.data || [], audits:audits.data || [],
    })
    setLoading(false)
  }

  async function createEvent(e) {
    e.preventDefault()
    if (!eventForm.title.trim() || !eventForm.date) return
    setEventBusy(true)
    const startsAt = new Date(`${eventForm.date}T${eventForm.time || '00:00'}:00`).toISOString()
    const { error: insertError } = await supabase.from('project_events').insert({
      project_id:project.id,
      title:eventForm.title.trim(),
      event_type:eventForm.event_type,
      starts_at:startsAt,
      location:eventForm.location.trim() || null,
      notes:eventForm.notes.trim() || null,
    })
    if (insertError) setError(insertError.message)
    else {
      setEventForm({ title:'', event_type:'meeting', date:'', time:'10:00', location:'', notes:'' })
      setShowEventForm(false)
      await fetchProject360()
    }
    setEventBusy(false)
  }

  async function updateEventStatus(id, status) {
    const { error: updateError } = await supabase.from('project_events').update({ status }).eq('id', id)
    if (updateError) setError(updateError.message)
    else fetchProject360()
  }

  async function removeEvent(event) {
    if (!window.confirm(`Hapus agenda “${event.title}”?`)) return
    const { error: deleteError } = await supabase.from('project_events').delete().eq('id', event.id)
    if (deleteError) setError(deleteError.message)
    else fetchProject360()
  }

  const doneTasks = data.tasks.filter(task => task.done).length
  const progress = data.tasks.length ? Math.round(doneTasks / data.tasks.length * 100) : 0
  const today = new Date(); today.setHours(0,0,0,0)
  const overdue = data.tasks.filter(task => !task.done && task.due_date && new Date(`${task.due_date}T00:00:00`) < today)
  const nextTasks = data.tasks.filter(task => !task.done).slice(0, 6)
  const upcomingEvents = data.events.filter(event => event.status === 'scheduled')
  const allocated = data.budgets.reduce((sum, row) => sum + Number(row.allocated || 0), 0)
  const committed = data.vendors.filter(vendor => vendor.status === 'booking').reduce((sum, vendor) => sum + Number(vendor.contract_amount || 0), 0)
  const paid = data.vendors.reduce((sum, vendor) => sum + Number(vendor.paid_amount || 0), 0)
  const invitations = project.project_invitations || []

  return (
    <div className="project360">
      <div className="project360-topline">
        <button type="button" onClick={onBack}>← Semua project</button>
        <div>
          <button type="button" onClick={() => onEdit(project)}>Edit project</button>
          <a href={`/${project.slug}`} target="_blank" rel="noreferrer">Buka halaman client ↗</a>
        </div>
      </div>

      <header className="project360-hero">
        <div>
          <span>PROJECT 360</span>
          <h1>{project.bride_name} & {project.groom_name}</h1>
          <p>{formatDate(project.wedding_date)} · {project.venue || project.location || 'Lokasi belum diatur'}</p>
        </div>
        <div className="project360-status">
          <span>{project.project_status === 'active' ? 'Aktif' : project.project_status}</span>
          <p>PM: <strong>{project.profiles?.full_name || 'Belum ditugaskan'}</strong></p>
          <small>{project.package_name || 'Paket belum dipilih'}</small>
        </div>
      </header>

      {error && <div className="project360-error">Sebagian data gagal diproses: {error}</div>}

      <div className="project360-kpis">
        <article><span>Progress checklist</span><strong>{loading ? '—' : `${progress}%`}</strong><small>{doneTasks}/{data.tasks.length} tugas selesai</small></article>
        <article><span>Tugas terlambat</span><strong className={overdue.length ? 'is-danger' : ''}>{loading ? '—' : overdue.length}</strong><small>Perlu tindak lanjut</small></article>
        <article><span>Agenda mendatang</span><strong>{loading ? '—' : upcomingEvents.length}</strong><small>{upcomingEvents[0] ? formatDate(upcomingEvents[0].starts_at) : 'Belum ada agenda'}</small></article>
        <article><span>Vendor booking</span><strong>{loading ? '—' : data.vendors.filter(v => v.status === 'booking').length}</strong><small>{data.vendors.length} vendor tersimpan</small></article>
      </div>

      <div className="project360-columns">
        <section className="project360-card project360-agenda">
          <div className="project360-card-title">
            <div><span>TIMELINE PROJECT</span><h2>Agenda & kegiatan</h2></div>
            <button type="button" onClick={() => setShowEventForm(value => !value)}>{showEventForm ? 'Tutup' : '+ Tambah agenda'}</button>
          </div>
          {showEventForm && <form className="project360-event-form" onSubmit={createEvent}>
            <input required placeholder="Nama kegiatan" value={eventForm.title} onChange={e => setEventForm(s => ({...s,title:e.target.value}))}/>
            <select value={eventForm.event_type} onChange={e => setEventForm(s => ({...s,event_type:e.target.value}))}>{eventTypes.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select>
            <input required type="date" value={eventForm.date} onChange={e => setEventForm(s => ({...s,date:e.target.value}))}/>
            <input type="time" value={eventForm.time} onChange={e => setEventForm(s => ({...s,time:e.target.value}))}/>
            <input placeholder="Lokasi" value={eventForm.location} onChange={e => setEventForm(s => ({...s,location:e.target.value}))}/>
            <input placeholder="Catatan singkat" value={eventForm.notes} onChange={e => setEventForm(s => ({...s,notes:e.target.value}))}/>
            <button disabled={eventBusy}>{eventBusy ? 'Menyimpan…' : 'Simpan agenda'}</button>
          </form>}
          {loading ? <p className="project360-empty">Memuat agenda…</p> : data.events.length === 0 ? <p className="project360-empty">Belum ada agenda.</p> : data.events.map(event => <div className="project360-event" key={event.id}>
            <div className="project360-date"><strong>{new Date(event.starts_at).toLocaleDateString('id-ID',{day:'2-digit'})}</strong><span>{new Date(event.starts_at).toLocaleDateString('id-ID',{month:'short'})}</span></div>
            <div><strong>{event.title}</strong><span>{eventTypeLabel[event.event_type] || 'Agenda'} · {formatDate(event.starts_at, true)}</span><small>{event.location || 'Lokasi belum diatur'}</small></div>
            <div className="project360-event-actions">
              {event.status === 'scheduled' ? <button type="button" onClick={() => updateEventStatus(event.id,'completed')}>Selesai</button> : <span>{event.status === 'completed' ? '✓ Selesai' : 'Dibatalkan'}</span>}
              <button type="button" className="danger" onClick={() => removeEvent(event)}>Hapus</button>
            </div>
          </div>)}
        </section>

        <section className="project360-card">
          <div className="project360-card-title"><div><span>CHECKLIST</span><h2>Prioritas berikutnya</h2></div><strong>{overdue.length} terlambat</strong></div>
          <div className="project360-progress"><i style={{width:`${progress}%`}} /></div>
          {nextTasks.length === 0 ? <p className="project360-empty">Semua checklist sudah selesai.</p> : nextTasks.map(task => {
            const isLate = task.due_date && new Date(`${task.due_date}T00:00:00`) < today
            return <div className="project360-task" key={task.id}><i className={isLate ? 'late' : ''}/><div><strong>{task.text}</strong><span>PIC: {task.pic || 'Belum ditentukan'}</span></div><small className={isLate ? 'is-danger' : ''}>{formatDate(task.due_date)}</small></div>
          })}
        </section>
      </div>

      <div className="project360-columns project360-columns--equal">
        <section className="project360-card">
          <div className="project360-card-title"><div><span>CLIENT</span><h2>Akses pasangan</h2></div><strong>{invitations.length} akun</strong></div>
          {invitations.length === 0 ? <p className="project360-empty">Belum ada undangan client.</p> : invitations.map(invite => <div className="project360-client" key={invite.id}><div><strong>{invite.client_name || 'Client'}</strong><span>{invite.email}</span></div><b className={`client-${invite.status}`}>{invite.status === 'accepted' ? 'Aktif' : invite.status === 'sent' ? 'Terkirim' : invite.status === 'error' ? 'Gagal' : 'Belum dikirim'}</b></div>)}
        </section>

        <section className="project360-card">
          <div className="project360-card-title"><div><span>VENDOR & BUDGET</span><h2>Komitmen biaya</h2></div><strong>{data.vendors.length} vendor</strong></div>
          <div className="project360-money"><div><span>Budget project</span><strong>{rupiah(project.budget_total)}</strong></div><div><span>Alokasi kategori</span><strong>{rupiah(allocated)}</strong></div><div><span>Kontrak vendor</span><strong>{rupiah(committed)}</strong></div><div><span>Sudah dibayar</span><strong>{rupiah(paid)}</strong></div></div>
          <div className="project360-budget-track"><i style={{width:`${Math.min(100, project.budget_total ? committed/Number(project.budget_total)*100 : 0)}%`}} /></div>
        </section>
      </div>

      <section className="project360-card project360-audit">
        <div className="project360-card-title"><div><span>AUDIT LOG</span><h2>Aktivitas terbaru</h2></div><button type="button" onClick={fetchProject360}>↻ Perbarui</button></div>
        {data.audits.length === 0 ? <p className="project360-empty">Belum ada perubahan sejak audit log diaktifkan.</p> : data.audits.map(log => <div className="project360-audit-row" key={log.id}><i/><div><strong>{log.action === 'insert' ? 'Menambahkan' : log.action === 'update' ? 'Mengubah' : 'Menghapus'} {auditLabels[log.entity_type] || log.entity_type}</strong><span>ID {String(log.entity_id || '').slice(0,8)}</span></div><time>{formatDate(log.created_at, true)}</time></div>)}
      </section>
    </div>
  )
}
