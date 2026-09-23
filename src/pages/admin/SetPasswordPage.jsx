import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const G900='#1B4332', G100='#D8F3DC', G50='#F0FAF3'
const DARK='#1C1C1E', MUTED='#8A8A8E', BORDER='#E2EDE6', WHITE='#FFFFFF', RED='#C0392B'

export default function SetPasswordPage() {
  const { user, profile } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) return setError('Password minimal 8 karakter.')
    if (password !== confirm) return setError('Konfirmasi password belum sama.')
    setBusy(true); setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setBusy(false)
      return
    }
    setDone(true)
    setTimeout(() => window.location.replace('/admin'), 900)
  }

  const allowed = profile?.role === 'admin' || profile?.role === 'superadmin'
  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:G900, padding:20 }}>
      <div style={{ width:'100%', maxWidth:390, background:WHITE, borderRadius:20, padding:'30px 26px' }}>
        <p style={{ fontFamily:'Dancing Script, cursive', fontSize:28, color:G900, textAlign:'center', margin:'0 0 4px' }}>Damargaleri</p>
        <p style={{ fontSize:13, color:MUTED, textAlign:'center', margin:'0 0 24px' }}>Aktivasi akun Project Manager</p>
        {!user || !allowed ? (
          <div style={{ background:'#FFF5F4', border:'1px solid #F2C7C2', borderRadius:10, padding:14 }}>
            <p style={{ fontSize:13, color:RED, margin:'0 0 10px', lineHeight:1.5 }}>Link aktivasi tidak valid, sudah kedaluwarsa, atau akun ini bukan akun PM.</p>
            <a href="/admin" style={{ fontSize:13, color:G900 }}>Kembali ke login admin</a>
          </div>
        ) : done ? (
          <div style={{ background:G50, border:`1px solid ${G100}`, borderRadius:10, padding:16, textAlign:'center' }}>
            <p style={{ color:G900, fontSize:14, margin:0 }}>✓ Password berhasil dibuat. Membuka dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize:13, color:DARK, margin:'0 0 16px', lineHeight:1.55 }}>Halo <strong>{profile?.full_name || user.email}</strong>. Buat password untuk login PM berikutnya.</p>
            <label style={{ fontSize:12, color:MUTED }}>Password baru</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" style={input} placeholder="Minimal 8 karakter" />
            <label style={{ fontSize:12, color:MUTED }}>Ulangi password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" style={input} placeholder="Ulangi password" />
            {error && <p style={{ fontSize:12, color:RED, margin:'0 0 12px' }}>{error}</p>}
            <button disabled={busy} style={{ width:'100%', padding:12, border:0, borderRadius:10, background:busy ? MUTED : G900, color:WHITE, fontWeight:600, cursor:busy?'not-allowed':'pointer' }}>{busy ? 'Menyimpan…' : 'Simpan password & masuk'}</button>
          </form>
        )}
      </div>
    </div>
  )
}

const input = { width:'100%', boxSizing:'border-box', padding:'10px 12px', margin:'6px 0 14px', border:`1px solid ${BORDER}`, borderRadius:9, fontSize:14, outline:'none' }
