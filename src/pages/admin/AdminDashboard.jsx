import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const AdminProject360 = lazy(() => import('./AdminProject360'))
const LeadDetail = lazy(() => import('./LeadDetail'))
const AdminCalendar = lazy(() => import('./AdminCalendar'))

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
  const [leads, setLeads]       = useState([])
  const [overviewTasks, setOverviewTasks] = useState([])
  const [overviewEvents, setOverviewEvents] = useState([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')
  const [loading, setLoading]   = useState(true)
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [view, setView]         = useState('overview')
  const [form, setForm]         = useState({
    bride_name: '', groom_name: '', wedding_date: '',
    venue: '', location: 'Surabaya', guest_count: '',
    budget_total: '', package_name: 'Full Service Premium',
    assigned_admin: '', client_name: '', client_email: '',
  })
  const [formErr, setFormErr]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState(null)
  const [inviteDrafts, setInviteDrafts] = useState({})
  const [inviteBusy, setInviteBusy] = useState(null)
  const [inviteMessage, setInviteMessage] = useState({})
  const [deleteBusy, setDeleteBusy] = useState(null)
  const [templateBusy, setTemplateBusy] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState('')

  // New PM form
  const [pmForm, setPmForm]     = useState({ full_name:'', email:'', wa_number:'' })
  const [pmErr, setPmErr]       = useState('')
  const [pmSuccess, setPmSuccess] = useState('')
  const [savingPm, setSavingPm] = useState(false)
  const [leadForm, setLeadForm] = useState({
    contact_name:'', bride_name:'', groom_name:'', phone:'', email:'',
    event_date:'', location:'Surabaya', source:'manual', source_detail:'',
    interested_package:'', estimated_budget:'', owner_admin:'', notes:'',
  })
  const [leadErr, setLeadErr] = useState('')
  const [savingLead, setSavingLead] = useState(false)
  const [convertBusy, setConvertBusy] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)

  useEffect(() => {
    document.body.classList.add('admin-shell')
    fetchProjects()
    fetchLeads()
    fetchOverview()
    if (isSupeadmin) fetchAdmins()
    return () => document.body.classList.remove('admin-shell')
  }, [])

  async function fetchProjects() {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*, profiles!assigned_admin(full_name, wa_number), project_invitations(*)')
      .neq('slug', 'demo')
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

  async function fetchLeads() {
    setLeadsLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*, profiles!owner_admin(full_name)')
      .order('created_at', { ascending: false })
    if (!error) setLeads(data || [])
    setLeadsLoading(false)
  }

  async function fetchOverview() {
    setOverviewLoading(true)
    setOverviewError('')
    const [tasksResult, eventsResult] = await Promise.all([
      supabase
        .from('checklist_tasks')
        .select('id, project_id, text, done, due_date, status, projects!inner(id, slug, bride_name, groom_name, assigned_admin, project_status)')
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('project_events')
        .select('id, project_id, title, event_type, starts_at, ends_at, location, status, projects!inner(id, slug, bride_name, groom_name, assigned_admin, project_status)')
        .eq('status', 'scheduled')
        .order('starts_at', { ascending: true }),
    ])

    if (tasksResult.error || eventsResult.error) {
      setOverviewError(tasksResult.error?.message || eventsResult.error?.message || 'Data ringkasan gagal dimuat.')
    } else {
      setOverviewTasks(tasksResult.data || [])
      setOverviewEvents(eventsResult.data || [])
    }
    setOverviewLoading(false)
  }

  async function handleCreateLead(e) {
    e.preventDefault()
    if (!leadForm.contact_name.trim()) return setLeadErr('Nama kontak wajib diisi.')
    if (!leadForm.phone.trim() && !leadForm.email.trim()) {
      return setLeadErr('Isi minimal nomor WhatsApp atau email.')
    }
    setSavingLead(true); setLeadErr('')
    const { error } = await supabase.from('leads').insert({
      contact_name: leadForm.contact_name.trim(),
      bride_name: leadForm.bride_name.trim() || null,
      groom_name: leadForm.groom_name.trim() || null,
      phone: leadForm.phone.trim() || null,
      email: leadForm.email.trim().toLowerCase() || null,
      event_date: leadForm.event_date || null,
      location: leadForm.location.trim() || null,
      source: leadForm.source,
      source_detail: leadForm.source_detail.trim() || null,
      interested_package: leadForm.interested_package.trim() || null,
      estimated_budget: parseInt(String(leadForm.estimated_budget).replace(/\D/g,'')) || 0,
      owner_admin: leadForm.owner_admin || profile?.id,
      notes: leadForm.notes.trim() || null,
    })
    if (error) {
      setLeadErr('Gagal menyimpan calon client: ' + error.message)
    } else {
      setLeadForm({ contact_name:'',bride_name:'',groom_name:'',phone:'',email:'',
        event_date:'',location:'Surabaya',source:'manual',source_detail:'',
        interested_package:'',estimated_budget:'',owner_admin:'',notes:'' })
      await fetchLeads()
    }
    setSavingLead(false)
  }

  async function updateLeadStatus(lead, status) {
    if (status === 'booked' && !lead.converted_project_id) {
      window.alert('Ubah menjadi project melalui tombol “Jadikan project” agar status booking dan data project tetap sinkron.')
      return
    }
    const { error } = await supabase.from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
    if (error) window.alert('Gagal mengubah status: ' + error.message)
    else {
      const { error: historyError } = await supabase.from('lead_activities').insert({
        lead_id:lead.id, activity_type:'status_change',
        description:`Status diubah dari ${lead.status} menjadi ${status}`,
      })
      if (historyError) window.alert('Status tersimpan, tetapi riwayat perubahan gagal dicatat: ' + historyError.message)
      fetchLeads()
    }
  }

  async function handleConvertLead(lead) {
    if (!lead.bride_name?.trim() || !lead.groom_name?.trim()) {
      window.alert('Lengkapi nama kedua calon pengantin sebelum membuat project.')
      return
    }
    const confirmed = window.confirm(
      `Jadikan ${lead.bride_name} & ${lead.groom_name} sebagai project aktif?\n\nChecklist standar dan kategori budget akan dibuat otomatis.`
    )
    if (!confirmed) return
    setConvertBusy(lead.id)
    try {
      await invokeAccess({ action:'convert_lead', lead_id:lead.id })
      await Promise.all([fetchLeads(), fetchProjects()])
      setView('projects')
    } catch (err) {
      window.alert('Gagal membuat project: ' + err.message)
    } finally {
      setConvertBusy(null)
    }
  }

  async function invokeAccess(body) {
    const { data, error } = await supabase.functions.invoke('manage-access', { body })
    if (error) {
      let message = error.message || 'Fungsi akses gagal.'
      try {
        const detail = await error.context?.json()
        if (detail?.error) message = detail.error
      } catch {}
      throw new Error(message)
    }
    if (data?.error) throw new Error(data.error)
    return data
  }

  async function handleCreatePM(e) {
    e.preventDefault()
    if (!pmForm.full_name.trim()) { setPmErr('Nama wajib diisi.'); return }
    if (!pmForm.email.trim()) { setPmErr('Email wajib diisi.'); return }
    setSavingPm(true); setPmErr(''); setPmSuccess('')

    try {
      await invokeAccess({
        action: 'create_pm',
        full_name: pmForm.full_name.trim(),
        email: pmForm.email.trim(),
        wa_number: pmForm.wa_number.trim(),
      })
      setPmSuccess(`Undangan PM dikirim ke ${pmForm.email}.`)
      setPmForm({ full_name:'', email:'', wa_number:'' })
      await fetchAdmins()
    } catch (err) {
      setPmErr('Gagal mengirim undangan PM: ' + err.message)
    } finally {
      setSavingPm(false)
    }
  }

  async function handleSendInvitation(project, invitation) {
    const key = invitation.id || project.id
    setInviteBusy(key)
    setInviteMessage(p => ({ ...p, [project.id]: '' }))
    try {
      await invokeAccess({
        action: 'invite_client',
        project_id: project.id,
        email: invitation.email,
        client_name: invitation.client_name || '',
      })
      setInviteMessage(p => ({ ...p, [project.id]: `Undangan dikirim ke ${invitation.email}.` }))
      await fetchProjects()
    } catch (err) {
      setInviteMessage(p => ({ ...p, [project.id]: 'Gagal: ' + err.message }))
    } finally {
      setInviteBusy(null)
    }
  }

  async function handleNewInvitation(project) {
    const draft = inviteDrafts[project.id] || {}
    if (!draft.email?.trim()) {
      setInviteMessage(p => ({ ...p, [project.id]: 'Email client wajib diisi.' }))
      return
    }
    await handleSendInvitation(project, {
      email: draft.email.trim(),
      client_name: draft.name?.trim() || '',
    })
    setInviteDrafts(p => ({ ...p, [project.id]: { name:'', email:'' } }))
  }

  async function handleDeleteProject(project) {
    const projectName = `${project.bride_name} & ${project.groom_name}`
    const confirmed = window.confirm(
      `Hapus project ${projectName}?\n\nSemua checklist, budget, invoice, dokumen, vendor, akses client, dan file cover project ini akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.`
    )
    if (!confirmed) return

    setDeleteBusy(project.id)
    try {
      await invokeAccess({ action: 'delete_project', project_id: project.id })
      await fetchProjects()
    } catch (err) {
      window.alert('Gagal menghapus project: ' + err.message)
    } finally {
      setDeleteBusy(null)
    }
  }

  function startEditProject(project) {
    setEditingProject(project)
    setEditErr('')
    setEditForm({
      bride_name: project.bride_name || '', groom_name: project.groom_name || '',
      wedding_date: project.wedding_date || '', venue: project.venue || '',
      location: project.location || '', guest_count: project.guest_count || '',
      budget_total: String(project.budget_total || ''), package_name: project.package_name || '',
      assigned_admin: project.assigned_admin || '',
    })
  }

  function openProject360(project) {
    setSelectedProject(project)
    setView('project360')
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  function editFromProject360(project) {
    setView('projects')
    startEditProject(project)
  }

  async function handleUpdateProject(e) {
    e.preventDefault()
    if (!editForm.bride_name.trim() || !editForm.groom_name.trim()) return setEditErr('Nama pasangan wajib diisi.')
    setEditBusy(true); setEditErr('')
    try {
      await invokeAccess({
        action: 'update_project', project_id: editingProject.id,
        ...editForm,
        budget_total: parseInt(String(editForm.budget_total).replace(/\D/g, '')) || 0,
      })
      setEditingProject(null); setEditForm(null)
      await fetchProjects()
    } catch (err) {
      setEditErr('Gagal menyimpan perubahan: ' + err.message)
    } finally { setEditBusy(false) }
  }

  function generateSlug(bride, groom) {
    const clean = s => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return `${clean(bride)}-${clean(groom)}`
  }

  async function applyStandardChecklist(project, replaceExisting = false) {
    const { error } = await supabase.rpc('apply_checklist_template', {
      target_project_id: project.id,
      target_template_slug: 'damargaleri-standard-v1',
      replace_existing: replaceExisting,
    })
    if (error) throw error
  }

  async function handleApplyTemplate(project) {
    const confirmed = window.confirm(
      `Terapkan Checklist Standar Damargaleri ke ${project.bride_name} & ${project.groom_name}?\n\nChecklist lama project ini akan diganti. Data budget, vendor, invoice, dokumen, dan akses client tidak ikut berubah.`
    )
    if (!confirmed) return
    setTemplateBusy(project.id)
    try {
      await applyStandardChecklist(project, true)
      await fetchProjects()
    } catch (err) {
      window.alert('Gagal menerapkan template: ' + err.message)
    } finally {
      setTemplateBusy(null)
    }
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

    if (form.client_email.trim()) {
      const { error: inviteError } = await supabase.from('project_invitations').insert({
        project_id: project.id,
        email: form.client_email.trim().toLowerCase(),
        client_name: form.client_name.trim() || null,
        status: 'pending',
      })
      if (inviteError) {
        setFormErr('Project dibuat, tetapi email client gagal disimpan: ' + inviteError.message)
      }
    }

    try {
      await applyStandardChecklist(project)
    } catch (checklistError) {
      setFormErr('Project dibuat, tetapi template checklist gagal diterapkan: ' + checklistError.message)
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
      guest_count:'',budget_total:'',package_name:'Full Service Premium',assigned_admin:'',
      client_name:'',client_email:'' })
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

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const sevenDaysAhead = new Date(startOfToday)
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7)
  const activeProjects = projects.filter(p => p.project_status === 'active')
  const openTasks = overviewTasks.filter(t => !t.done)
  const overdueTasks = openTasks.filter(t => t.due_date && new Date(`${t.due_date}T00:00:00`) < startOfToday)
  const urgentTasks = openTasks
    .filter(t => t.due_date && new Date(`${t.due_date}T00:00:00`) <= sevenDaysAhead)
    .slice(0, 6)
  const completedTasks = overviewTasks.filter(t => t.done).length
  const checklistProgress = overviewTasks.length
    ? Math.round((completedTasks / overviewTasks.length) * 100)
    : 0
  const upcomingEvents = overviewEvents
    .filter(e => new Date(e.starts_at) >= startOfToday)
    .slice(0, 6)
  const formatDate = (value, withTime=false) => value
    ? new Date(value).toLocaleDateString('id-ID', {
        day:'numeric', month:'short', year:'numeric',
        ...(withTime ? { hour:'2-digit', minute:'2-digit' } : {}),
      })
    : 'Belum dijadwalkan'
  const eventLabels = {
    wedding:'Pernikahan', prewedding:'Prewedding', akad:'Akad', reception:'Resepsi',
    engagement:'Lamaran', meeting:'Meeting', fitting:'Fitting', food_tasting:'Food tasting',
    technical_meeting:'Technical meeting', other:'Lainnya',
  }

  return (
    <div className="admin-dashboard-root" style={{ minHeight: '100dvh', background: '#F5F6F4', fontFamily: 'Inter, sans-serif' }}>

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

      <div className="admin-dashboard-layout" style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 28px' }}>

        {/* Sub nav */}
        <div className="admin-sidebar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {[
            { id: 'overview', label: '⌂ Ringkasan' },
            { id: 'projects', label: '💍 Semua project' },
            { id: 'leads',    label: '◎ Calon client' },
            { id: 'calendar', label: '▦ Kalender' },
            { id: 'new',      label: '+ Buat project baru' },
            ...(isSupeadmin ? [{ id: 'admins', label: '👥 Kelola admin' }] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 500,
              background: view === t.id ? G900 : WHITE,
              color: view === t.id ? WHITE : DARK,
              border: `1px solid ${view === t.id ? G900 : BORDER}`,
              borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>{t.label}</button>
          ))}
        </div>

        {view === 'project360' && selectedProject && (
          <Suspense fallback={<div style={{padding:40,textAlign:'center',color:MUTED}}>Memuat Project 360…</div>}>
            <AdminProject360
              project={selectedProject}
              onBack={() => { setSelectedProject(null); setView('projects') }}
              onEdit={editFromProject360}
            />
          </Suspense>
        )}

        {view === 'calendar' && (
          <Suspense fallback={<div style={{padding:40,textAlign:'center',color:MUTED}}>Memuat kalender…</div>}>
            <AdminCalendar
              projects={projects}
              admins={admins}
              isSuperadmin={isSupeadmin}
              onOpenProject={project => { setSelectedProject(project); setView('project360') }}
              onChanged={fetchOverview}
            />
          </Suspense>
        )}

        {/* ── OPERATIONAL OVERVIEW ── */}
        {view === 'overview' && (
          <div>
            <div className="overview-heading">
              <div>
                <p className="overview-eyebrow">DASHBOARD OPERASIONAL</p>
                <h1>Selamat datang, {profile?.full_name || 'Admin'}</h1>
                <p>Pantau hal yang perlu ditangani hari ini tanpa membuka project satu per satu.</p>
              </div>
              <button onClick={() => Promise.all([fetchProjects(), fetchLeads(), fetchOverview()])}>
                ↻ Perbarui data
              </button>
            </div>

            {overviewError && <div className="overview-error">Ringkasan belum lengkap: {overviewError}</div>}

            <div className="overview-kpi-grid">
              {[
                { label:'Project aktif', value:activeProjects.length, note:`${projects.length} total project`, tone:'green' },
                { label:'Lead baru', value:leads.filter(l => l.status === 'new').length, note:`${leads.filter(l => !['booked','lost'].includes(l.status)).length} masih diproses`, tone:'blue' },
                { label:'Tugas terlambat', value:overdueTasks.length, note:overdueTasks.length ? 'Perlu ditindaklanjuti' : 'Tidak ada keterlambatan', tone:overdueTasks.length ? 'red' : 'green' },
                { label:'Progress checklist', value:`${checklistProgress}%`, note:`${completedTasks} dari ${overviewTasks.length} tugas selesai`, tone:'amber' },
              ].map(card => (
                <div className={`overview-kpi overview-kpi--${card.tone}`} key={card.label}>
                  <span>{card.label}</span>
                  <strong>{overviewLoading ? '—' : card.value}</strong>
                  <small>{card.note}</small>
                </div>
              ))}
            </div>

            <div className="overview-main-grid">
              <section className="overview-panel">
                <div className="overview-panel-title">
                  <div><span>JADWAL TERDEKAT</span><h2>Agenda semua project</h2></div>
                  <button onClick={() => setView('projects')}>Lihat project</button>
                </div>
                {overviewLoading ? <p className="overview-empty">Memuat agenda…</p> : upcomingEvents.length === 0 ? (
                  <p className="overview-empty">Belum ada agenda mendatang. Event bisa ditambahkan dari Project 360 pada tahap berikutnya.</p>
                ) : upcomingEvents.map(event => (
                  <div className="overview-row" key={event.id}>
                    <div className="overview-date-box">
                      <strong>{new Date(event.starts_at).toLocaleDateString('id-ID',{day:'2-digit'})}</strong>
                      <span>{new Date(event.starts_at).toLocaleDateString('id-ID',{month:'short'})}</span>
                    </div>
                    <div className="overview-row-copy">
                      <strong>{event.title}</strong>
                      <span>{eventLabels[event.event_type] || 'Agenda'} · {event.projects?.bride_name} & {event.projects?.groom_name}</span>
                      <small>{formatDate(event.starts_at, true)}{event.location ? ` · ${event.location}` : ''}</small>
                    </div>
                    <a href={`/${event.projects?.slug}`} target="_blank" rel="noreferrer">Buka ↗</a>
                  </div>
                ))}
              </section>

              <section className="overview-panel">
                <div className="overview-panel-title">
                  <div><span>PRIORITAS 7 HARI</span><h2>Checklist mendesak</h2></div>
                  <strong className={overdueTasks.length ? 'danger-count' : ''}>{overdueTasks.length} terlambat</strong>
                </div>
                {overviewLoading ? <p className="overview-empty">Memuat checklist…</p> : urgentTasks.length === 0 ? (
                  <p className="overview-empty">Tidak ada checklist yang jatuh tempo dalam tujuh hari ke depan.</p>
                ) : urgentTasks.map(task => {
                  const overdue = new Date(`${task.due_date}T00:00:00`) < startOfToday
                  return <div className="overview-task" key={task.id}>
                    <span className={overdue ? 'task-dot task-dot--late' : 'task-dot'} />
                    <div>
                      <strong>{task.text}</strong>
                      <span>{task.projects?.bride_name} & {task.projects?.groom_name}</span>
                    </div>
                    <small className={overdue ? 'late-text' : ''}>{overdue ? 'Terlambat · ' : ''}{formatDate(task.due_date)}</small>
                  </div>
                })}
              </section>
            </div>

            {isSupeadmin && (
              <section className="overview-panel overview-workload">
                <div className="overview-panel-title">
                  <div><span>BEBAN PROJECT MANAGER</span><h2>Distribusi project aktif</h2></div>
                  <button onClick={() => setView('admins')}>Kelola PM</button>
                </div>
                <div className="workload-grid">
                  {admins.map(admin => {
                    const assigned = activeProjects.filter(p => p.assigned_admin === admin.id).length
                    const maxAssigned = Math.max(1, ...admins.map(a => activeProjects.filter(p => p.assigned_admin === a.id).length))
                    return <div className="workload-card" key={admin.id}>
                      <div><strong>{admin.full_name}</strong><span>{admin.role === 'superadmin' ? 'Super Admin' : 'Project Manager'}</span></div>
                      <b>{assigned} project</b>
                      <div className="workload-track"><i style={{width:`${Math.max(assigned ? 12 : 0, (assigned/maxAssigned)*100)}%`}} /></div>
                    </div>
                  })}
                  {admins.length === 0 && <p className="overview-empty">Belum ada Project Manager aktif.</p>}
                </div>
              </section>
            )}
          </div>
        )}

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
                  const invitations = p.project_invitations || []
                  const draft = inviteDrafts[p.id] || { name:'', email:'' }

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
                        <button onClick={() => openProject360(p)} style={{
                          fontSize:11, fontWeight:650, padding:'4px 10px',
                          background:G700, color:WHITE, border:'none', borderRadius:6,
                          cursor:'pointer', flexShrink:0,
                        }}>Kelola 360</button>
                        {isSupeadmin && (
                          <button onClick={() => startEditProject(p)} style={{ fontSize:11, fontWeight:600, padding:'4px 10px', background:WHITE, color:G700, border:`1px solid ${G100}`, borderRadius:6, cursor:'pointer', flexShrink:0 }}>Edit</button>
                        )}
                        {isSupeadmin && (
                          <button onClick={() => handleDeleteProject(p)}
                            disabled={deleteBusy === p.id}
                            style={{ fontSize:11, fontWeight:600, padding:'4px 10px',
                              background:'#FFF5F4', color:RED, border:`1px solid #F2C7C2`,
                              borderRadius:6, cursor:deleteBusy === p.id ? 'not-allowed' : 'pointer',
                              flexShrink:0 }}>
                            {deleteBusy === p.id ? 'Menghapus...' : 'Hapus'}
                          </button>
                        )}
                      </div>

                      {!p.checklist_template_slug && (
                        <button onClick={() => handleApplyTemplate(p)}
                          disabled={templateBusy === p.id}
                          style={{ width:'100%', marginTop:8, padding:'7px 10px',
                            fontSize:11, fontWeight:600, color:G700, background:WHITE,
                            border:`1px dashed ${G500}`, borderRadius:7,
                            cursor:templateBusy === p.id ? 'not-allowed' : 'pointer' }}>
                          {templateBusy === p.id ? 'Menerapkan template...' : '＋ Terapkan Checklist Standar'}
                        </button>
                      )}

                      {p.slug !== 'demo' && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: G700, margin: '0 0 8px',
                            letterSpacing: '.04em' }}>AKSES CLIENT</p>
                          {invitations.map(inv => (
                            <div key={inv.id} style={{ display:'flex', alignItems:'center', gap:8,
                              marginBottom:7, padding:'7px 9px', background:'#FAFAFA', borderRadius:8 }}>
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ fontSize:12, color:DARK, margin:'0 0 2px',
                                  overflow:'hidden', textOverflow:'ellipsis' }}>
                                  {inv.client_name || 'Client'} · {inv.email}
                                </p>
                                <p style={{ fontSize:10, color:MUTED, margin:0 }}>
                                  Status: {inv.status === 'accepted' ? 'Sudah aktif' :
                                    inv.status === 'sent' ? 'Undangan terkirim' :
                                    inv.status === 'error' ? 'Gagal dikirim' : 'Belum dikirim'}
                                </p>
                              </div>
                              <button onClick={() => handleSendInvitation(p, inv)}
                                disabled={inviteBusy === inv.id}
                                style={{ fontSize:11, fontWeight:600, padding:'5px 9px',
                                  background:G900, color:WHITE, border:'none', borderRadius:6,
                                  cursor: inviteBusy === inv.id ? 'not-allowed' : 'pointer' }}>
                                {inviteBusy === inv.id ? 'Mengirim...' :
                                  inv.status === 'pending' ? 'Kirim undangan' : 'Kirim ulang'}
                              </button>
                            </div>
                          ))}
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr auto', gap:6 }}>
                            <input value={draft.name || ''}
                              onChange={e => setInviteDrafts(s => ({ ...s,
                                [p.id]: { ...draft, name:e.target.value } }))}
                              placeholder="Nama client" style={inp({ padding:'7px 9px', fontSize:11 })}/>
                            <input type="email" value={draft.email || ''}
                              onChange={e => setInviteDrafts(s => ({ ...s,
                                [p.id]: { ...draft, email:e.target.value } }))}
                              placeholder="email@client.com" style={inp({ padding:'7px 9px', fontSize:11 })}/>
                            <button onClick={() => handleNewInvitation(p)}
                              disabled={inviteBusy === p.id}
                              style={{ fontSize:11, fontWeight:600, padding:'6px 10px',
                                background:G50, color:G700, border:`1px solid ${G100}`,
                                borderRadius:6, cursor:'pointer' }}>+ Tambah</button>
                          </div>
                          {inviteMessage[p.id] && (
                            <p style={{ fontSize:11,
                              color: inviteMessage[p.id].startsWith('Gagal') ? RED : G700,
                              margin:'7px 0 0' }}>{inviteMessage[p.id]}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {isSupeadmin && editingProject && editForm && (
              <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={() => !editBusy && setEditingProject(null)}>
                <div style={{ width:'100%', maxWidth:620, maxHeight:'90dvh', overflowY:'auto', background:WHITE, borderRadius:16, padding:22 }} onClick={e => e.stopPropagation()}>
                  <p style={{ fontFamily:'Lora, serif', fontSize:19, fontWeight:600, margin:'0 0 4px' }}>Edit project</p>
                  <p style={{ fontSize:11, color:MUTED, margin:'0 0 18px' }}>URL /{editingProject.slug} tetap dipertahankan agar link client tidak berubah.</p>
                  <form onSubmit={handleUpdateProject}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      {[['bride_name','Nama pengantin wanita'],['groom_name','Nama pengantin pria'],['wedding_date','Tanggal pernikahan','date'],['location','Kota'],['venue','Venue'],['guest_count','Estimasi tamu'],['budget_total','Total anggaran'],['package_name','Nama paket']].map(([key,label,type]) => (
                        <div key={key}><p style={{ fontSize:12,color:MUTED,margin:'0 0 5px' }}>{label}</p><input type={type||'text'} value={editForm[key]} onChange={e => setEditForm(s => ({...s,[key]:e.target.value}))} style={inp()} /></div>
                      ))}
                    </div>
                    <div style={{ marginTop:12 }}><p style={{ fontSize:12,color:MUTED,margin:'0 0 5px' }}>Project Manager</p>
                      <select value={editForm.assigned_admin} onChange={e => setEditForm(s => ({...s,assigned_admin:e.target.value}))} style={inp({appearance:'none'})}>
                        <option value="">— Belum ditugaskan —</option>
                        {admins.filter(a => a.role === 'admin' || a.role === 'superadmin').map(a => <option key={a.id} value={a.id}>{a.full_name} ({a.role})</option>)}
                      </select>
                    </div>
                    {editErr && <p style={{fontSize:12,color:RED,margin:'10px 0 0'}}>{editErr}</p>}
                    <div style={{display:'flex',gap:8,marginTop:16}}><button disabled={editBusy} style={{flex:1,padding:10,border:0,borderRadius:9,background:editBusy?MUTED:G900,color:WHITE,fontWeight:600}}>{editBusy?'Menyimpan…':'Simpan perubahan'}</button><button type="button" onClick={() => setEditingProject(null)} disabled={editBusy} style={{padding:'10px 16px',border:`1px solid ${BORDER}`,borderRadius:9,background:WHITE,color:MUTED}}>Batal</button></div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LEADS / CALON CLIENT ── */}
        {view === 'leads' && (
          <div className="admin-leads-grid" style={{ display:'grid', gridTemplateColumns:'minmax(280px,.85fr) minmax(360px,1.4fr)', gap:16, alignItems:'start' }}>
            <div style={{ background:WHITE, borderRadius:14, border:`1px solid ${BORDER}`, padding:20 }}>
              <p style={{ fontFamily:'Lora, serif', fontSize:18, fontWeight:600, margin:'0 0 4px', fontStyle:'italic' }}>Tambah calon client</p>
              <p style={{ fontSize:11, color:MUTED, lineHeight:1.5, margin:'0 0 16px' }}>Untuk inquiry, prospek, atau customer yang belum resmi booking.</p>
              <form onSubmit={handleCreateLead}>
                {[
                  ['contact_name','Nama kontak *','text','mis. Rania'],
                  ['phone','Nomor WhatsApp','tel','mis. 628123456789'],
                  ['email','Email','email','nama@email.com'],
                  ['bride_name','Nama pengantin wanita','text','opsional'],
                  ['groom_name','Nama pengantin pria','text','opsional'],
                  ['event_date','Perkiraan tanggal acara','date',''],
                  ['location','Kota','text','mis. Surabaya'],
                  ['estimated_budget','Perkiraan budget','text','mis. 150000000'],
                  ['interested_package','Paket yang diminati','text','opsional'],
                ].map(([key,label,type,placeholder]) => (
                  <div key={key} style={{ marginBottom:10 }}>
                    <p style={{ fontSize:11,color:MUTED,margin:'0 0 4px' }}>{label}</p>
                    <input type={type} value={leadForm[key]} placeholder={placeholder}
                      onChange={e => setLeadForm(s => ({...s,[key]:e.target.value}))} style={inp()} />
                  </div>
                ))}
                <div style={{ marginBottom:10 }}>
                  <p style={{fontSize:11,color:MUTED,margin:'0 0 4px'}}>Sumber informasi</p>
                  <select value={leadForm.source} onChange={e => setLeadForm(s=>({...s,source:e.target.value}))} style={inp({appearance:'none'})}>
                    <option value="manual">Input manual</option><option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option><option value="google">Google</option>
                    <option value="whatsapp">WhatsApp</option><option value="referral">Referral</option>
                    <option value="event">Event/pameran</option><option value="other">Lainnya</option>
                  </select>
                </div>
                <div style={{marginBottom:10}}><p style={{fontSize:11,color:MUTED,margin:'0 0 4px'}}>Detail sumber</p><input value={leadForm.source_detail} onChange={e=>setLeadForm(s=>({...s,source_detail:e.target.value}))} placeholder="mis. Referral Ibu Sinta" style={inp()}/></div>
                {isSupeadmin && <div style={{marginBottom:10}}><p style={{fontSize:11,color:MUTED,margin:'0 0 4px'}}>Ditangani oleh</p><select value={leadForm.owner_admin} onChange={e=>setLeadForm(s=>({...s,owner_admin:e.target.value}))} style={inp({appearance:'none'})}><option value="">Super Admin</option>{admins.map(a=><option key={a.id} value={a.id}>{a.full_name}</option>)}</select></div>}
                <div style={{marginBottom:12}}><p style={{fontSize:11,color:MUTED,margin:'0 0 4px'}}>Catatan awal</p><textarea value={leadForm.notes} onChange={e=>setLeadForm(s=>({...s,notes:e.target.value}))} rows={3} style={inp({resize:'vertical'})}/></div>
                {leadErr && <p style={{fontSize:11,color:RED,margin:'0 0 10px'}}>{leadErr}</p>}
                <button disabled={savingLead} style={{width:'100%',padding:10,border:0,borderRadius:9,background:savingLead?MUTED:G900,color:WHITE,fontWeight:600}}>{savingLead?'Menyimpan…':'Simpan calon client'}</button>
              </form>
            </div>

            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
                {[['Total lead',leads.length],['Perlu dihubungi',leads.filter(l=>l.status==='new').length],['Sudah booking',leads.filter(l=>l.status==='booked').length]].map(([label,val])=><div key={label} style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:12,padding:'13px 15px'}}><p style={{fontSize:22,fontFamily:'Lora, serif',fontWeight:700,color:G900,margin:0}}>{val}</p><p style={{fontSize:10,color:MUTED,margin:'2px 0 0'}}>{label}</p></div>)}
              </div>
              {leadsLoading ? <div style={{textAlign:'center',padding:32,color:MUTED}}>Memuat calon client…</div> :
              leads.length === 0 ? <div style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:14,padding:32,textAlign:'center',color:MUTED,fontSize:12}}>Belum ada calon client.</div> :
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {leads.map(l => <div key={l.id} style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:13,padding:'14px 16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:12}}>
                    <div><p style={{fontSize:14,fontWeight:600,margin:'0 0 3px',color:DARK}}>{l.contact_name}</p><p style={{fontSize:11,color:MUTED,margin:0}}>{[l.bride_name&&l.groom_name?`${l.bride_name} & ${l.groom_name}`:l.bride_name||l.groom_name,l.phone,l.location].filter(Boolean).join(' · ')}</p></div>
                    <select value={l.status} onChange={e=>updateLeadStatus(l,e.target.value)} style={inp({width:'auto',minWidth:118,padding:'6px 8px',fontSize:11,appearance:'none'})}>
                      <option value="new">Baru</option><option value="contacted">Dihubungi</option><option value="meeting">Meeting</option><option value="proposal">Penawaran</option><option value="follow_up">Follow-up</option><option value="booked" disabled={!l.converted_project_id}>Booking</option><option value="lost">Batal</option>
                    </select>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
                    <span style={{fontSize:10,padding:'3px 7px',borderRadius:20,background:G50,color:G700}}>{l.source || 'manual'}</span>
                    {l.event_date&&<span style={{fontSize:10,padding:'3px 7px',borderRadius:20,background:'#F5F5F5',color:MID}}>Acara {new Date(l.event_date).toLocaleDateString('id-ID')}</span>}
                    <span style={{fontSize:10,padding:'3px 7px',borderRadius:20,background:'#F5F5F5',color:MID}}>PM: {l.profiles?.full_name||'Belum ditugaskan'}</span>
                    {l.next_follow_up_at && <span style={{fontSize:10,padding:'3px 7px',borderRadius:20,background:new Date(l.next_follow_up_at)<new Date()?'#FFF1EE':AMBERBG,color:new Date(l.next_follow_up_at)<new Date()?RED:AMBER}}>Follow-up: {new Date(l.next_follow_up_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})}</span>}
                  </div>
                  <div style={{display:'flex',justifyContent:'flex-end',gap:7,marginTop:10}}>
                    <button onClick={() => setSelectedLead(l)} style={{fontSize:11,padding:'6px 10px',border:`1px solid ${G100}`,borderRadius:7,background:WHITE,color:G700,fontWeight:600,cursor:'pointer'}}>Detail & follow-up</button>
                    {l.converted_project_id ? (
                      <button onClick={()=>setView('projects')} style={{fontSize:11,padding:'6px 10px',border:`1px solid ${G100}`,borderRadius:7,background:G50,color:G700,fontWeight:600,cursor:'pointer'}}>Lihat project</button>
                    ) : (
                      <button onClick={()=>handleConvertLead(l)} disabled={convertBusy===l.id}
                        style={{fontSize:11,padding:'6px 10px',border:0,borderRadius:7,background:convertBusy===l.id?MUTED:G900,color:WHITE,fontWeight:600,cursor:convertBusy===l.id?'not-allowed':'pointer'}}>
                        {convertBusy===l.id?'Membuat project…':'Jadikan project'}
                      </button>
                    )}
                  </div>
                </div>)}
              </div>}
            </div>
          </div>
        )}

        {selectedLead && (
          <Suspense fallback={null}>
            <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)}
              onChanged={updated => { setSelectedLead(updated); fetchLeads() }}/>
          </Suspense>
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

              <p style={{ fontSize: 11, color: G700, fontWeight: 600,
                letterSpacing: '.04em', margin: '0 0 10px' }}>AKSES CLIENT UTAMA</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                <div>
                  <p style={{ fontSize:12, color:MUTED, margin:'0 0 5px' }}>Nama client</p>
                  <input value={form.client_name}
                    onChange={e => setForm(p => ({ ...p, client_name:e.target.value }))}
                    placeholder="mis. Rania" style={inp()}/>
                </div>
                <div>
                  <p style={{ fontSize:12, color:MUTED, margin:'0 0 5px' }}>Email client</p>
                  <input type="email" value={form.client_email}
                    onChange={e => setForm(p => ({ ...p, client_email:e.target.value }))}
                    placeholder="email@client.com" style={inp()}/>
                </div>
              </div>

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
                  <div style={{ display:'flex', alignItems:'end' }}>
                    <p style={{ fontSize:12, color:MUTED, margin:'0 0 9px', lineHeight:1.5 }}>
                      PM akan menerima email undangan untuk mengaktifkan akses dashboard.
                    </p>
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
                  {savingPm ? 'Mengirim undangan...' : 'Kirim undangan PM'}
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
