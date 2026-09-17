import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const G900='#1B4332',G700='#2D6A4F',G500='#52B788',G100='#D8F3DC',G50='#F0FAF3'
const DARK='#1C1C1E',MID='#3D3D3A',MUTED='#8A8A8E',BORDER='#E2EDE6',WHITE='#FFFFFF',RED='#C0392B'
const AMBER='#B7770D',AMBERBG='#FEF9E7'

function Leaf({ size = 16, color = G700 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 2C8 2 3 4.5 3 9C3 11.76 5.24 14 8 14C10.76 14 13 11.76 13 9C13 4.5 8 2 8 2Z"
        fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1" strokeLinejoin="round"/>
      <path d="M8 14V8M8 8C8 8 6 7 5 5.5M8 8C8 8 10 7 11 5.5"
        stroke={color} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}

function StatusBadge({ status }) {
  const m = {
    active:   { bg: G50,      color: G700,  label: 'Aktif' },
    upcoming: { bg: AMBERBG,  color: AMBER, label: 'Upcoming' },
    done:     { bg: '#F5F5F5',color: MUTED, label: 'Selesai' },
  }
  const s = m[status] || m.active
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px',
      borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
  )
}

export default function AdminDashboard() {
  const { profile, signOut, isSupeadmin } = useAuth()
  const [projects, setProjects] = useState([])
  const [admins, setAdmins]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState('projects')
  const [form, setForm]         = useState({
    bride_name: '', groom_name: '', wedding_date: '',
    venue: '', location: 'Surabaya', guest_count: '',
    budget_total: '', package_name: 'Full Service Premium',
    assigned_admin: '',
  })
  const [formErr, setFormErr]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState(null)

  // New PM form
  const [pmForm, setPmForm]     = useState({ full_name:'', email:'', password:'', wa_number:'' })
  const [pmErr, setPmErr]       = useState('')
  const [pmSuccess, setPmSuccess] = useState('')
  const [savingPm, setSavingPm] = useState(false)

  useEffect(() => {
    fetchProjects()
    if (isSupeadmin) fetchAdmins()
  }, [])

  async function fetchProjects() {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*, profiles!assigned_admin(full_name, wa_number)')
      .order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  async function fetchAdmins() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'superadmin'])
      .order('full_name')
    setAdmins(data || [])
  }

  async function handleCreatePM(e) {
    e.preventDefault()
    if (!pmForm.full_name.trim()) { setPmErr('Nama wajib diisi.'); return }
    if (!pmForm.email.trim()) { setPmErr('Email wajib diisi.'); return }
    if (pmForm.password.length < 8) { setPmErr('Password minimal 8 karakter.'); return }
    setSavingPm(true); setPmErr(''); setPmSuccess('')

    // Create user via Supabase admin
    const { data, error } = await supabase.auth.admin.createUser({
      email: pmForm.email.trim(),
      password: pmForm.password,
      email_confirm: true,
      user_metadata: { full_name: pmForm.full_name.trim(), role: 'admin' }
    })

    if (error) {
      // Fallback: use signUp if admin API not available
      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email: pmForm.email.trim(),
        password: pmForm.password,
        options: { data: { full_name: pmForm.full_name.trim(), role: 'admin' } }
      })
      if (signupErr) { setPmErr('Gagal buat akun: ' + signupErr.message); setSavingPm(false); return }

      // Update profile
      if (signupData.user) {
        await supabase.from('profiles').update({
          role: 'admin',
          full_name: pmForm.full_name.trim(),
          wa_number: pmForm.wa_number.trim() || null,
        }).eq('id', signupData.user.id)
      }
    } else if (data.user) {
      await supabase.from('profiles').update({
        role: 'admin',
        full_name: pmForm.full_name.trim(),
        wa_number: pmForm.wa_number.trim() || null,
      }).eq('id', data.user.id)
    }

    setPmSuccess(`Akun PM "${pmForm.full_name}" berhasil dibuat! Email: ${pmForm.email}`)
    setPmForm({ full_name:'', email:'', password:'', wa_number:'' })
    setSavingPm(false)
    fetchAdmins()
  }

  function generateSlug(bride, groom) {
    const clean = s => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return `${clean(bride)}-${clean(groom)}`
  }

  async function handleCreateProject(e) {
    e.preventDefault()
    if (!form.bride_name.trim() || !form.groom_name.trim()) {
      setFormErr('Nama pengantin wajib diisi.'); return
    }
    setSaving(true); setFormErr('')

    const slug = generateSlug(form.bride_name, form.groom_name)

    // Check slug unique
    const { data: existing } = await supabase
      .from('projects').select('id').eq('slug', slug).single()
    if (existing) {
      setFormErr(`Slug "${slug}" sudah dipakai. Coba nama yang berbeda.`)
      setSaving(false); return
    }

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        slug,
        bride_name: form.bride_name.trim(),
        groom_name: form.groom_name.trim(),
        wedding_date: form.wedding_date || null,
        venue: form.venue || null,
        location: form.location,
        guest_count: form.guest_count || null,
        budget_total: parseInt(form.budget_total.replace(/\D/g,'')) || 0,
        package_name: form.package_name,
        assigned_admin: form.assigned_admin || profile?.id,
      })
      .select()
      .single()

    if (error) { setFormErr('Gagal membuat project: ' + error.message); setSaving(false); return }

    // Seed default checklist phases
    const phases = [
      { label: '12 bulan sebelum', sort_order: 1 },
      { label: '9 bulan sebelum',  sort_order: 2 },
      { label: '6 bulan sebelum',  sort_order: 3 },
      { label: '3 bulan sebelum',  sort_order: 4 },
      { label: '1 bulan sebelum',  sort_order: 5 },
      { label: 'Hari H',           sort_order: 6 },
    ]
    const { data: phasesData } = await supabase
      .from('checklist_phases')
      .insert(phases.map(p => ({ ...p, project_id: project.id })))
      .select()

    // Seed default tasks per phase
    const defaultTasks = {
      0: [ // 12 bulan
        { text: 'Tentukan tanggal & venue pernikahan', pic: 'Pasangan', location: '—' },
        { text: 'Buat anggaran awal pernikahan', pic: 'Pasangan', location: '—' },
        { text: 'Tentukan konsep & tema pernikahan', pic: 'Pasangan + WO', location: 'Kantor WO' },
        { text: 'Buat daftar tamu kasar', pic: 'Pasangan', location: '—' },
      ],
      1: [ // 9 bulan
        { text: 'Booking Wedding Organizer', pic: 'Pasangan', location: 'Kantor WO' },
        { text: 'Booking fotografer & videografer', pic: 'WO', location: 'Studio foto' },
        { text: 'Pilih & booking katering', pic: 'WO + Pasangan', location: 'Venue' },
        { text: 'Cari inspirasi dekorasi & busana', pic: 'Pasangan', location: '—' },
      ],
      2: [ // 6 bulan
        { text: 'Fitting gaun pengantin pertama', pic: 'Pengantin wanita', location: 'Butik busana' },
        { text: 'Kirim save-the-date ke tamu', pic: 'Pasangan', location: '—' },
        { text: 'Booking hiburan & entertainment', pic: 'WO', location: '—' },
        { text: 'Tentukan tema undangan', pic: 'Pasangan + WO', location: 'Kantor WO' },
      ],
      3: [ // 3 bulan
        { text: 'Kirim undangan resmi', pic: 'Pasangan + WO', location: '—' },
        { text: 'Konfirmasi semua vendor', pic: 'WO', location: '—' },
        { text: 'Fitting gaun pengantin kedua', pic: 'Pengantin wanita', location: 'Butik busana' },
        { text: 'Buat rundown hari H detail', pic: 'WO', location: 'Kantor WO' },
      ],
      4: [ // 1 bulan
        { text: 'Final headcount tamu', pic: 'Pasangan', location: '—' },
        { text: 'Gladi bersih / rehearsal', pic: 'Semua', location: 'Venue' },
        { text: 'Persiapkan amplop & souvenir', pic: 'Pasangan', location: '—' },
        { text: 'Konfirmasi detail hari H ke semua', pic: 'WO', location: '—' },
      ],
      5: [ // Hari H
        { text: 'Briefing tim WO & vendor pagi hari', pic: 'WO', location: 'Venue' },
        { text: 'Persiapan pengantin — makeup & busana', pic: 'Pengantin wanita', location: 'Gedung rias' },
        { text: 'Akad / pemberkatan nikah', pic: 'Semua', location: 'Venue' },
        { text: 'Resepsi & penerimaan tamu', pic: 'Semua', location: 'Venue' },
      ],
    }

    if (phasesData) {
      const allTasks = phasesData.flatMap((phase, idx) =>
        (defaultTasks[idx] || []).map((t, i) => ({
          phase_id: phase.id, project_id: project.id,
          text: t.text, pic: t.pic, location: t.location,
          sort_order: i, done: false,
        }))
      )
      await supabase.from('checklist_tasks').insert(allTasks)
    }

    // Seed default budget categories
    await supabase.from('budget_categories').insert([
      { project_id: project.id, name: 'Venue & gedung',      icon: '🏛️', allocated: 0, spent: 0, sort_order: 1 },
      { project_id: project.id, name: 'Katering & konsumsi', icon: '🍽️', allocated: 0, spent: 0, sort_order: 2 },
      { project_id: project.id, name: 'Dokumentasi',         icon: '📷', allocated: 0, spent: 0, sort_order: 3 },
      { project_id: project.id, name: 'Dekorasi & bunga',    icon: '💐', allocated: 0, spent: 0, sort_order: 4 },
      { project_id: project.id, name: 'Busana pengantin',    icon: '👗', allocated: 0, spent: 0, sort_order: 5 },
      { project_id: project.id, name: 'Rias pengantin',      icon: '💄', allocated: 0, spent: 0, sort_order: 6 },
      { project_id: project.id, name: 'Hiburan & MC',        icon: '🎵', allocated: 0, spent: 0, sort_order: 7 },
      { project_id: project.id, name: 'Undangan & souvenir', icon: '💌', allocated: 0, spent: 0, sort_order: 8 },
    ])

    setSaving(false)
    setView('projects')
    fetchProjects()
    setForm({ bride_name:'',groom_name:'',wedding_date:'',venue:'',location:'Surabaya',
      guest_count:'',budget_total:'',package_name:'Full Service Premium',assigned_admin:'' })
  }

  function copyLink(slug) {
    const url = `${window.location.origin}/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const inp = (extra={}) => ({
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: `1px solid ${BORDER}`, borderRadius: 8, outline: 'none',
    color: DARK, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', ...extra
  })

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F6F4', fontFamily: 'Inter, sans-serif' }}>

      {/* Top bar */}
      <div style={{
        background: G900, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Leaf size={18} color="rgba(255,255,255,.6)"/>
          <span style={{ fontFamily: 'Dancing Script, cursive', fontSize: 20, color: WHITE }}>
            Damargaleri
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)',
            background: 'rgba(255,255,255,.1)', padding: '2px 8px', borderRadius: 20 }}>
            Admin
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
            {profile?.full_name}
          </span>
          <button onClick={signOut} style={{
            fontSize: 12, padding: '5px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,.1)', color: WHITE,
            border: '1px solid rgba(255,255,255,.2)', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}>Keluar</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>

        {/* Sub nav */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[
            { id: 'projects', label: '💍 Semua project' },
            { id: 'new',      label: '+ Buat project baru' },
            ...(isSupeadmin ? [{ id: 'admins', label: '👥 Kelola admin' }] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              background: view === t.id ? G900 : WHITE,
              color: view === t.id ? WHITE : DARK,
              border: `1px solid ${view === t.id ? G900 : BORDER}`,
              borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── PROJECT LIST ── */}
        {view === 'projects' && (
          <div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total project', val: projects.length },
                { label: 'Aktif', val: projects.filter(p => new Date(p.wedding_date) > new Date()).length },
                { label: 'Selesai', val: projects.filter(p => new Date(p.wedding_date) <= new Date()).length },
              ].map((s, i) => (
                <div key={i} style={{ background: WHITE, borderRadius: 12,
                  border: `1px solid ${BORDER}`, padding: '16px 18px' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: G900,
                    margin: '0 0 2px', fontFamily: 'Lora, serif' }}>{s.val}</p>
                  <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Project cards */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: MUTED }}>Memuat...</div>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px',
                background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 32, margin: '0 0 8px' }}>💍</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: DARK, margin: '0 0 4px' }}>
                  Belum ada project
                </p>
                <p style={{ fontSize: 13, color: MUTED, margin: '0 0 16px' }}>
                  Buat project pertama untuk klien kakak
                </p>
                <button onClick={() => setView('new')} style={{
                  padding: '9px 20px', fontSize: 13, fontWeight: 500,
                  background: G900, color: WHITE, border: 'none',
                  borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>+ Buat project baru</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projects.map(p => {
                  const weddingDate = p.wedding_date ? new Date(p.wedding_date) : null
                  const isUpcoming = weddingDate && weddingDate > new Date()
                  const status = !weddingDate ? 'active' : isUpcoming ? 'upcoming' : 'done'
                  const clientUrl = `${window.location.origin}/${p.slug}`

                  return (
                    <div key={p.id} style={{
                      background: WHITE, borderRadius: 14,
                      border: `1px solid ${BORDER}`, padding: '16px 20px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <p style={{ fontSize: 16, fontWeight: 600, color: DARK,
                              margin: 0, fontFamily: 'Lora, serif', fontStyle: 'italic' }}>
                              {p.bride_name} & {p.groom_name}
                            </p>
                            <StatusBadge status={status}/>
                          </div>
                          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                            {weddingDate
                              ? weddingDate.toLocaleDateString('id-ID', { day:'numeric',month:'long',year:'numeric' })
                              : 'Tanggal belum diset'
                            }
                            {p.location ? ` · ${p.location}` : ''}
                          </p>
                        </div>
                        <div style={{ fontSize: 11, color: MUTED, textAlign: 'right' }}>
                          <p style={{ margin: '0 0 2px' }}>{p.package_name || '—'}</p>
                          <p style={{ margin: 0 }}>PM: {p.profiles?.full_name || '—'}</p>
                        </div>
                      </div>

                      {/* Link row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                        background: G50, borderRadius: 8, padding: '8px 12px' }}>
                        <span style={{ fontSize: 11, color: G700, flex: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {clientUrl}
                        </span>
                        <button onClick={() => copyLink(p.slug)} style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 10px',
                          background: copied === p.slug ? G500 : G900,
                          color: WHITE, border: 'none', borderRadius: 6,
                          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                          flexShrink: 0, transition: 'background .2s',
                        }}>
                          {copied === p.slug ? '✓ Tersalin' : 'Salin link'}
                        </button>
                        <a href={clientUrl} target="_blank" rel="noreferrer" style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 10px',
                          background: 'none', color: G700,
                          border: `1px solid ${G100}`, borderRadius: 6,
                          cursor: 'pointer', textDecoration: 'none', flexShrink: 0,
                        }}>Buka ↗</a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── NEW PROJECT FORM ── */}
        {view === 'new' && (
          <div style={{ background: WHITE, borderRadius: 14,
            border: `1px solid ${BORDER}`, padding: '24px' }}>
            <p style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 600,
              color: DARK, margin: '0 0 20px', fontStyle: 'italic' }}>
              Buat project baru
            </p>

            <form onSubmit={handleCreateProject}>
              {/* Nama pasangan */}
              <p style={{ fontSize: 11, color: G700, fontWeight: 600,
                letterSpacing: '.04em', margin: '0 0 10px' }}>NAMA PASANGAN</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Nama pengantin wanita</p>
                  <input value={form.bride_name}
                    onChange={e => setForm(p => ({ ...p, bride_name: e.target.value }))}
                    placeholder="mis. Rania"
                    style={inp({ borderColor: formErr && !form.bride_name ? RED : BORDER })}/>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Nama pengantin pria</p>
                  <input value={form.groom_name}
                    onChange={e => setForm(p => ({ ...p, groom_name: e.target.value }))}
                    placeholder="mis. Dimas"
                    style={inp({ borderColor: formErr && !form.groom_name ? RED : BORDER })}/>
                </div>
              </div>

              {/* Slug preview */}
              {form.bride_name && form.groom_name && (
                <div style={{ background: G50, border: `1px solid ${G100}`,
                  borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: MUTED, margin: '0 0 2px' }}>URL klien akan jadi:</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: G700, margin: 0 }}>
                    {window.location.origin}/{generateSlug(form.bride_name, form.groom_name)}
                  </p>
                </div>
              )}

              {/* Detail */}
              <p style={{ fontSize: 11, color: G700, fontWeight: 600,
                letterSpacing: '.04em', margin: '0 0 10px' }}>DETAIL PERNIKAHAN</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Tanggal pernikahan</p>
                  <input type="date" value={form.wedding_date}
                    onChange={e => setForm(p => ({ ...p, wedding_date: e.target.value }))}
                    style={inp()}/>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Kota</p>
                  <input value={form.location}
                    onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="mis. Surabaya"
                    style={inp()}/>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Venue</p>
                  <input value={form.venue}
                    onChange={e => setForm(p => ({ ...p, venue: e.target.value }))}
                    placeholder="mis. Graha Indah"
                    style={inp()}/>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Estimasi tamu</p>
                  <input value={form.guest_count}
                    onChange={e => setForm(p => ({ ...p, guest_count: e.target.value }))}
                    placeholder="mis. 300 orang"
                    style={inp()}/>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Total anggaran (Rp)</p>
                  <input value={form.budget_total}
                    onChange={e => setForm(p => ({ ...p, budget_total: e.target.value }))}
                    placeholder="mis. 120000000"
                    style={inp()}/>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Paket</p>
                  <select value={form.package_name}
                    onChange={e => setForm(p => ({ ...p, package_name: e.target.value }))}
                    style={inp({ appearance: 'none' })}>
                    <option>Full Service Premium</option>
                    <option>Full Service Standard</option>
                    <option>One Day Coordinator</option>
                    <option>Essential</option>
                  </select>
                </div>
              </div>

              {/* Assign admin */}
              {isSupeadmin && admins.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: G700, fontWeight: 600,
                    letterSpacing: '.04em', margin: '0 0 10px' }}>ASSIGN PROJECT MANAGER</p>
                  <select value={form.assigned_admin}
                    onChange={e => setForm(p => ({ ...p, assigned_admin: e.target.value }))}
                    style={inp({ appearance: 'none' })}>
                    <option value="">— Pilih PM —</option>
                    {admins.map(a => (
                      <option key={a.id} value={a.id}>{a.full_name} ({a.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {formErr && (
                <p style={{ fontSize: 12, color: RED, margin: '0 0 12px' }}>{formErr}</p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving} style={{
                  flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600,
                  background: saving ? MUTED : G900, color: WHITE,
                  border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {saving ? 'Menyimpan...' : 'Buat project & generate link'}
                </button>
                <button type="button" onClick={() => setView('projects')} style={{
                  padding: '11px 18px', fontSize: 14, background: 'none',
                  border: `1px solid ${BORDER}`, borderRadius: 10,
                  cursor: 'pointer', color: MUTED, fontFamily: 'Inter, sans-serif',
                }}>Batal</button>
              </div>
            </form>
          </div>
        )}

        {/* ── ADMIN MANAGEMENT (superadmin only) ── */}
        {view === 'admins' && isSupeadmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Create PM form */}
            <div style={{ background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`, padding: '24px' }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 600,
                color: DARK, margin: '0 0 16px', fontStyle: 'italic' }}>
                Tambah Project Manager baru
              </p>
              <form onSubmit={handleCreatePM}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Nama lengkap</p>
                    <input value={pmForm.full_name}
                      onChange={e => setPmForm(p => ({ ...p, full_name: e.target.value }))}
                      placeholder="mis. Putri Damargaleri"
                      style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: `1px solid ${BORDER}`,
                        borderRadius: 8, outline: 'none', color: DARK, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}/>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Nomor WhatsApp</p>
                    <input value={pmForm.wa_number}
                      onChange={e => setPmForm(p => ({ ...p, wa_number: e.target.value }))}
                      placeholder="mis. 628123456789"
                      style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: `1px solid ${BORDER}`,
                        borderRadius: 8, outline: 'none', color: DARK, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}/>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Email</p>
                    <input type="email" value={pmForm.email}
                      onChange={e => setPmForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="email@damargaleri.com"
                      style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: `1px solid ${BORDER}`,
                        borderRadius: 8, outline: 'none', color: DARK, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}/>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: MUTED, margin: '0 0 5px' }}>Password (min. 8 karakter)</p>
                    <input type="password" value={pmForm.password}
                      onChange={e => setPmForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••"
                      style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: `1px solid ${BORDER}`,
                        borderRadius: 8, outline: 'none', color: DARK, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}/>
                  </div>
                </div>
                {pmErr && <p style={{ fontSize: 12, color: RED, margin: '0 0 10px' }}>{pmErr}</p>}
                {pmSuccess && (
                  <div style={{ background: G50, border: `1px solid ${G100}`, borderRadius: 8,
                    padding: '10px 14px', marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: G700, margin: 0 }}>✓ {pmSuccess}</p>
                  </div>
                )}
                <button type="submit" disabled={savingPm} style={{
                  padding: '10px 20px', fontSize: 13, fontWeight: 600,
                  background: savingPm ? MUTED : G900, color: WHITE,
                  border: 'none', borderRadius: 8, cursor: savingPm ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {savingPm ? 'Membuat akun...' : '+ Buat akun PM'}
                </button>
              </form>
            </div>

            {/* PM list */}
            <div style={{ background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`, padding: '24px' }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 600,
                color: DARK, margin: '0 0 16px', fontStyle: 'italic' }}>
                Tim admin aktif
              </p>
              {admins.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: DARK, margin: '0 0 2px' }}>
                      {a.full_name}
                    </p>
                    <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                      {a.wa_number || 'WA belum diset'} · {projects.filter(p => p.assigned_admin === a.id).length} project
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                    background: a.role === 'superadmin' ? '#EDE9FE' : G50,
                    color: a.role === 'superadmin' ? '#5B21B6' : G700 }}>
                    {a.role}
                  </span>
                </div>
              ))}
              {admins.length === 0 && (
                <p style={{ fontSize: 13, color: MUTED, textAlign: 'center', padding: '20px 0' }}>
                  Belum ada admin
                </p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
