import { useState } from 'react'

const monthLabel = value => value ? new Date(`${value}-01T12:00:00`).toLocaleDateString('id-ID', { month:'long', year:'numeric' }) : ''

export default function ConvertLeadDialog({ lead, admins, isSuperadmin, busy, error, onClose, onSubmit }) {
  const [dateMode, setDateMode] = useState(lead.event_date ? 'date' : lead.estimated_event_month ? 'month' : 'unknown')
  const [form, setForm] = useState({
    bride_name:lead.bride_name || '', groom_name:lead.groom_name || '',
    event_date:lead.event_date || '', estimated_event_month:lead.estimated_event_month || '',
    venue:lead.venue || '', location:lead.location || '',
    interested_package:lead.interested_package || '',
    estimated_budget:String(lead.estimated_budget || 0),
    assigned_admin:lead.owner_admin || '',
  })
  const change = (key, value) => setForm(current => ({...current,[key]:value}))
  const changeMode = mode => {
    setDateMode(mode)
    setForm(current => ({...current,event_date:'',estimated_event_month:''}))
  }
  const field = (key, label, type='text', required=false) => <label key={key}>{label}
    <input type={type} required={required} maxLength={type === 'number' ? undefined : 200} min={type === 'number' ? '0' : undefined}
      value={form[key]} onChange={event => change(key,event.target.value)} />
  </label>

  return <div className="lead-detail-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section className="lead-detail" role="dialog" aria-modal="true" aria-labelledby="convert-lead-title">
      <header className="lead-detail-header"><div><span>KONVERSI CALON CLIENT</span><h2 id="convert-lead-title">Buat project dari {lead.contact_name}</h2>
        <p>Periksa data sebelum halaman client dan checklist dibuat.</p></div>
        <button type="button" aria-label="Tutup" onClick={onClose} disabled={busy}>✕</button>
      </header>
      <form className="lead-convert-form" onSubmit={event => { event.preventDefault(); onSubmit(form) }}>
        <p>Kontak: {lead.phone || '—'} · {lead.email || 'Email belum tersedia'}. Akun client dapat diundang setelah project dibuat.</p>
        {field('bride_name','Nama calon pengantin wanita *','text',true)}
        {field('groom_name','Nama calon pengantin pria *','text',true)}
        <label>Kepastian tanggal acara
          <select value={dateMode} onChange={event => changeMode(event.target.value)}>
            <option value="unknown">Belum diketahui</option>
            <option value="month">Perkiraan bulan dan tahun</option>
            <option value="date">Tanggal sudah pasti</option>
          </select>
        </label>
        {dateMode === 'date' && field('event_date','Tanggal acara *','date',true)}
        {dateMode === 'month' && <>{field('estimated_event_month','Perkiraan bulan *','month',true)}
          <small>Checklist dibuat tanpa tenggat otomatis sampai tanggal pasti ditentukan. Perkiraan: {monthLabel(form.estimated_event_month) || '—'}</small></>}
        {field('location','Kota acara')}
        {field('venue','Venue (jika sudah diketahui)')}
        {field('interested_package','Paket yang disepakati')}
        {field('estimated_budget','Perkiraan budget (Rp)','number')}
        {isSuperadmin && <label>Project Manager
          <select value={form.assigned_admin} onChange={event => change('assigned_admin',event.target.value)}>
            <option value="">Super Admin</option>
            {admins.filter(admin => admin.role === 'admin').map(admin => <option key={admin.id} value={admin.id}>{admin.full_name}</option>)}
          </select>
        </label>}
        {error && <p role="alert" className="lead-detail-error">{error}</p>}
        <div className="lead-convert-actions"><button type="button" onClick={onClose} disabled={busy}>Batal</button>
          <button type="submit" disabled={busy}>{busy ? 'Membuat project…' : 'Buat project'}</button></div>
      </form>
    </section>
  </div>
}
