import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const builtin = new Set([
  'contact_name','phone','email','bride_name','groom_name','event_date',
  'location','estimated_budget','interested_package','source_detail',
])
const types = ['text', 'textarea', 'select']

export default function LeadFormSettings() {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    supabase.from('lead_form_settings').select('title, description, fields').eq('id', 1).single()
      .then(({data,error}) => {
        if (!active) return
        if (error) setMessage(`Pengaturan belum tersedia: ${error.message}`)
        else setForm({ ...data, fields:data.fields.map(field => ({...field, enabled:true})) })
      })
    return () => { active = false }
  }, [])

  function update(index, change) {
    setForm(current => ({ ...current, fields:current.fields.map((field, position) => position === index ? {...field,...change} : field) }))
  }

  function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= form.fields.length) return
    const fields = [...form.fields]
    ;[fields[index],fields[target]] = [fields[target],fields[index]]
    setForm({...form,fields})
  }

  async function save() {
    const fields = form.fields.map(field => ({
      ...field, label:field.label.trim(), options:field.type === 'select' ? field.options : undefined,
    }))
    const active = fields.filter(field => field.enabled !== false)
    if (!active.some(field => field.key === 'contact_name') || !active.some(field => ['phone','email'].includes(field.key))) {
      return setMessage('Nama kontak dan minimal satu pilihan kontak (WhatsApp atau email) harus ditampilkan.')
    }
    if (!active.find(field => field.key === 'contact_name')?.required) {
      return setMessage('Nama kontak wajib diisi agar calon client bisa dicatat.')
    }
    if (active.some(field => !field.label || (field.type === 'select' && (!field.options?.length || field.options.some(option => !option.trim()))))) {
      return setMessage('Lengkapi label dan pilihan jawaban setiap pertanyaan yang aktif.')
    }
    setSaving(true); setMessage('')
    const { data, error } = await supabase.from('lead_form_settings')
      .update({ title:form.title.trim(), description:form.description.trim(), fields, updated_at:new Date().toISOString() })
      .eq('id', 1).select('id').single()
    if (error || !data) setMessage(`Gagal menyimpan: ${error?.message || 'Akses ditolak.'}`)
    else {
      setForm({...form,fields})
      setMessage('Pengaturan formulir tersimpan. Perubahan langsung berlaku di halaman /daftar.')
    }
    setSaving(false)
  }

  return <section className="lead-form-settings">
    <div className="lead-form-settings-heading"><div><h2>Form pendaftaran website</h2>
      <p>Atur pertanyaan yang tampil di <a href="/daftar" target="_blank" rel="noreferrer">app.damargaleri.com/daftar ↗</a>. Data baru masuk sebagai lead.</p></div>
      {form && <button type="button" onClick={save} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan pengaturan'}</button>}
    </div>
    {message && <p className="lead-form-settings-message" role="status">{message}</p>}
    {form && <>
      <label>Judul formulir <input maxLength="120" value={form.title} onChange={e => setForm({...form,title:e.target.value})}/></label>
      <label>Pengantar <textarea maxLength="400" rows="2" value={form.description} onChange={e => setForm({...form,description:e.target.value})}/></label>
      <h3>Pertanyaan</h3>
      <p className="lead-form-settings-hint">Nama dan setidaknya satu kontak wajib tampil. Pertanyaan tambahan akan tersimpan di detail lead.</p>
      {form.fields.map((field, index) => <div className="lead-form-field" key={field.key}>
        <label className="lead-field-enabled"><input type="checkbox" checked={field.enabled !== false} onChange={e => update(index,{enabled:e.target.checked})}/> Tampilkan</label>
        <label>Label <input value={field.label} maxLength="100" onChange={e => update(index,{label:e.target.value})}/></label>
        {!builtin.has(field.key) && <label>Jenis <select value={field.type} onChange={e => update(index,{type:e.target.value})}>{types.map(type => <option key={type} value={type}>{type}</option>)}</select></label>}
        {field.type === 'select' && <label>Pilihan (satu per baris) <textarea value={(field.options || []).join('\n')} onChange={e => update(index,{options:e.target.value.split('\n').map(value => value.trim())})}/></label>}
        <label className="lead-field-enabled"><input type="checkbox" checked={!!field.required} disabled={field.key === 'contact_name'} onChange={e => update(index,{required:e.target.checked})}/> Wajib diisi</label>
        <div className="lead-form-field-actions"><button type="button" onClick={() => move(index,-1)} disabled={index===0}>↑</button><button type="button" onClick={() => move(index,1)} disabled={index===form.fields.length-1}>↓</button>
          {!builtin.has(field.key) && <button type="button" onClick={() => setForm({...form,fields:form.fields.filter((_, position) => position !== index)})}>Hapus</button>}
        </div>
      </div>)}
      <button type="button" className="lead-add-field" onClick={() => setForm({...form,fields:[...form.fields,{
        key:'custom_' + crypto.randomUUID().replaceAll('-','').slice(0,12),label:'Pertanyaan baru',type:'text',required:false,enabled:true,
      }]})} disabled={form.fields.length>=25}>+ Tambah pertanyaan</button>
    </>}
  </section>
}
