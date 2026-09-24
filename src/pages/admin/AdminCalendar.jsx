import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

const ZONE = 'Asia/Jakarta'
const TYPES = [
  ['meeting', 'Meeting'], ['prewedding', 'Prewedding'], ['engagement', 'Lamaran'],
  ['fitting', 'Fitting'], ['food_tasting', 'Tes food'], ['technical_meeting', 'Technical meeting'],
  ['akad', 'Akad'], ['reception', 'Resepsi'], ['wedding', 'Pernikahan'], ['other', 'Lainnya'],
]
const LABELS = Object.fromEntries(TYPES)
const blankForm = { project_id:'', title:'', event_type:'meeting', date:'', time:'10:00', location:'', notes:'' }
const dateParts = new Intl.DateTimeFormat('en-GB', { timeZone:ZONE, year:'numeric', month:'2-digit', day:'2-digit' })
const dateKey = value => {
  const parts = Object.fromEntries(dateParts.formatToParts(new Date(value)).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
const dateTime = value => new Intl.DateTimeFormat('id-ID', {
  timeZone:ZONE, hour:'2-digit', minute:'2-digit', hourCycle:'h23',
}).format(new Date(value))
const dateLabel = value => new Intl.DateTimeFormat('id-ID', {
  timeZone:ZONE, weekday:'long', day:'numeric', month:'long', year:'numeric',
}).format(new Date(`${value}T12:00:00+07:00`))
const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`

export default function AdminCalendar({ projects, admins, isSuperadmin, onOpenProject, onChanged }) {
  const [month, setMonth] = useState(() => {
    const [year, number] = dateKey(new Date()).split('-').map(Number)
    return { year, number:number - 1 }
  })
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()))
  const [projectFilter, setProjectFilter] = useState('')
  const [pmFilter, setPmFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const monthId = monthKey(month.year, month.number)
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const start = new Date(Date.UTC(month.year, month.number, 1) - 7 * 3600000).toISOString()
      const end = new Date(Date.UTC(month.year, month.number + 1, 1) - 7 * 3600000).toISOString()
      const { data, error: queryError, count } = await supabase.from('project_events')
        .select('id, project_id, title, event_type, starts_at, location, notes, status', { count:'exact' })
        .gte('starts_at', start).lt('starts_at', end)
        .order('starts_at').range(0, 999)
      if (!active) return
      if (queryError) setError(`Agenda gagal dimuat: ${queryError.message}`)
      else if (count > 1000) setError('Terlalu banyak agenda dalam bulan ini. Hubungi admin untuk membagi tampilan.')
      setEvents(queryError ? [] : data || [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [month.year, month.number])

  // Project list has already been scoped by RLS and excludes the public demo.
  const visibleProjects = useMemo(() => projects.filter(project => project.slug !== 'demo'), [projects])
  const projectById = useMemo(() => Object.fromEntries(visibleProjects.map(project => [project.id, project])), [visibleProjects])
  const filtered = useMemo(() => events.filter(event => {
    const project = projectById[event.project_id]
    return project && (!projectFilter || event.project_id === projectFilter)
      && (!pmFilter || project.assigned_admin === pmFilter)
  }), [events, projectById, projectFilter, pmFilter])
  const byDay = useMemo(() => filtered.reduce((days, event) => {
    const key = dateKey(event.starts_at)
    ;(days[key] ||= []).push(event)
    return days
  }, {}), [filtered])

  const firstWeekday = (new Date(Date.UTC(month.year, month.number, 1)).getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(month.year, month.number + 1, 0)).getUTCDate()
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length:daysInMonth }, (_, index) => index + 1)]
  while (cells.length % 7) cells.push(null)
  const selectedEvents = byDay[selectedDay] || []
  const today = dateKey(new Date())
  const monthTitle = new Intl.DateTimeFormat('id-ID', { month:'long', year:'numeric', timeZone:ZONE })
    .format(new Date(Date.UTC(month.year, month.number, 15)))

  function moveMonth(delta) {
    const next = new Date(Date.UTC(month.year, month.number + delta, 1))
    setMonth({ year:next.getUTCFullYear(), number:next.getUTCMonth() })
    setSelectedDay(monthKey(next.getUTCFullYear(), next.getUTCMonth()) + '-01')
    setForm(null)
  }

  function startNew() {
    setEditingId(null)
    setForm({ ...blankForm, project_id:projectFilter || visibleProjects[0]?.id || '', date:selectedDay })
  }

  function startEdit(event) {
    setEditingId(event.id)
    setForm({ project_id:event.project_id, title:event.title, event_type:event.event_type,
      date:dateKey(event.starts_at), time:dateTime(event.starts_at),
      location:event.location || '', notes:event.notes || '' })
  }

  async function save(event) {
    event.preventDefault()
    if (!form.project_id || !projectById[form.project_id] || !form.title.trim() || !form.date || !form.time) return
    setSaving(true); setError('')
    const payload = { project_id:form.project_id, title:form.title.trim(), event_type:form.event_type,
      starts_at:new Date(`${form.date}T${form.time}:00+07:00`).toISOString(),
      location:form.location.trim() || null, notes:form.notes.trim() || null }
    const result = editingId
      ? await supabase.from('project_events').update(payload).eq('id', editingId).select('id').single()
      : await supabase.from('project_events').insert(payload).select('id').single()
    if (result.error) setError(`Agenda gagal disimpan: ${result.error.message}`)
    else {
      const previousMonth = monthId
      const [year, number] = form.date.split('-').map(Number)
      setSelectedDay(form.date)
      setMonth({ year, number:number - 1 })
      setForm(null); setEditingId(null)
      if (previousMonth === form.date.slice(0, 7)) {
        const { data, error: reloadError } = await supabase.from('project_events')
          .select('id, project_id, title, event_type, starts_at, location, notes, status')
          .gte('starts_at', new Date(Date.UTC(year, number - 1, 1) - 7 * 3600000).toISOString())
          .lt('starts_at', new Date(Date.UTC(year, number, 1) - 7 * 3600000).toISOString())
          .order('starts_at').range(0, 999)
        if (reloadError) setError(`Agenda tersimpan, tetapi gagal dimuat ulang: ${reloadError.message}`)
        else setEvents(data || [])
      }
      onChanged?.()
    }
    setSaving(false)
  }

  return <section className="admin-calendar">
    <header className="calendar-header">
      <div><span>KALENDER OPERASIONAL · WIB</span><h1>Agenda semua project</h1>
        <p>Pantau prewedding, akad, resepsi, meeting, dan kegiatan lain dalam satu kalender.</p></div>
      <button type="button" onClick={startNew} disabled={!visibleProjects.length}>+ Tambah agenda</button>
    </header>

    <div className="calendar-filters">
      <label>Project <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
        <option value="">Semua project</option>
        {visibleProjects.map(project => <option value={project.id} key={project.id}>{project.bride_name} & {project.groom_name}</option>)}
      </select></label>
      {isSuperadmin && <label>Project Manager <select value={pmFilter} onChange={e => setPmFilter(e.target.value)}>
        <option value="">Semua PM</option>
        {admins.map(admin => <option value={admin.id} key={admin.id}>{admin.full_name}</option>)}
      </select></label>}
    </div>
    {error && <p className="calendar-error" role="alert">{error}</p>}

    {form && <form className="calendar-form" onSubmit={save}>
      <h2>{editingId ? 'Edit agenda' : 'Agenda baru'}</h2>
      <div className="calendar-form-grid">
        <label>Project <select required value={form.project_id} onChange={e => setForm({...form,project_id:e.target.value})}>
          <option value="">Pilih project</option>
          {visibleProjects.map(project => <option value={project.id} key={project.id}>{project.bride_name} & {project.groom_name}</option>)}
        </select></label>
        <label>Jenis <select value={form.event_type} onChange={e => setForm({...form,event_type:e.target.value})}>
          {TYPES.map(([value,label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
        <label>Nama kegiatan <input required maxLength="200" value={form.title} onChange={e => setForm({...form,title:e.target.value})}/></label>
        <label>Tanggal <input required type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})}/></label>
        <label>Jam (WIB) <input required type="time" value={form.time} onChange={e => setForm({...form,time:e.target.value})}/></label>
        <label>Lokasi <input value={form.location} onChange={e => setForm({...form,location:e.target.value})}/></label>
        <label className="calendar-notes">Catatan <textarea rows="2" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})}/></label>
      </div>
      <div className="calendar-form-actions"><button disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan agenda'}</button>
        <button type="button" onClick={() => setForm(null)}>Batal</button></div>
    </form>}

    <div className="calendar-workspace">
      <div className="calendar-month">
        <div className="calendar-month-nav"><button type="button" aria-label="Bulan sebelumnya" onClick={() => moveMonth(-1)}>‹</button>
          <h2>{monthTitle}</h2><button type="button" aria-label="Bulan berikutnya" onClick={() => moveMonth(1)}>›</button>
          <button type="button" onClick={() => { const [year, number] = today.split('-').map(Number); setMonth({year,number:number-1});setSelectedDay(today) }}>Hari ini</button>
        </div>
        <div className="calendar-grid">
          {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}
          {cells.map((day, index) => {
            const key = day ? `${monthId}-${String(day).padStart(2,'0')}` : null
            const items = key ? byDay[key] || [] : []
            return day ? <button type="button" key={key} className={`calendar-day ${key === selectedDay ? 'selected' : ''} ${key === today ? 'today' : ''}`}
                onClick={() => { setSelectedDay(key);setForm(null) }} aria-label={`${dateLabel(key)}, ${items.length} agenda`}>
              <strong>{day}</strong><span>{items.slice(0,2).map(item => <small className={item.status} key={item.id}>{item.title}</small>)}
                {items.length > 2 && <small>+{items.length - 2} agenda</small>}</span>
            </button> : <span className="calendar-day calendar-day--empty" key={`blank-${index}`}/>
          })}
        </div>
      </div>
      <aside className="calendar-detail"><div className="calendar-detail-heading"><span>AGENDA HARIAN</span><h2>{dateLabel(selectedDay)}</h2>
        <p>{loading ? 'Memuat…' : `${selectedEvents.length} kegiatan`}</p></div>
        {!loading && selectedEvents.length === 0 && <p className="calendar-empty">Belum ada agenda pada tanggal ini.</p>}
        {selectedEvents.map(event => <article className="calendar-event" key={event.id}>
          <span>{dateTime(event.starts_at)} WIB · {LABELS[event.event_type] || 'Lainnya'} · {event.status === 'scheduled' ? 'Terjadwal' : event.status === 'completed' ? 'Selesai' : 'Dibatalkan'}</span>
          <h3>{event.title}</h3><p>{projectById[event.project_id]?.bride_name} & {projectById[event.project_id]?.groom_name}</p>
          {event.location && <small>{event.location}</small>}
          {event.notes && <p className="calendar-event-notes">{event.notes}</p>}
          <div><button type="button" onClick={() => startEdit(event)}>Edit</button>
            <button type="button" onClick={() => onOpenProject(projectById[event.project_id])}>Buka project →</button></div>
        </article>)}
      </aside>
    </div>
  </section>
}
