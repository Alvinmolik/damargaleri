import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const G900 = '#1B4332', G700 = '#2D6A4F', G100 = '#D8F3DC', G50 = '#F0FAF3'
const DARK = '#1C1C1E', MUTED = '#8A8A8E', BORDER = '#E2EDE6', WHITE = '#FFFFFF', RED = '#C0392B'

export default function LoginPage({ mode = 'admin' }) {
  const { signIn, signInWithMagicLink } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [magicSent, setMagicSent] = useState(false)

  const isAdmin = mode === 'admin'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Email tidak boleh kosong.'); return }
    setLoading(true); setError('')

    if (isAdmin) {
      const { error } = await signIn(email, password)
      if (error) setError('Email atau password salah.')
    } else {
      const { error } = await signInWithMagicLink(email)
      if (error) setError('Gagal kirim link. Coba lagi.')
      else setMagicSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: G900, padding: '20px',
    }}>
      <div style={{
        background: WHITE, borderRadius: 20, padding: '32px 28px',
        width: '100%', maxWidth: 380,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{
            fontFamily: 'Dancing Script, cursive', fontSize: 28,
            color: G900, margin: '0 0 4px',
          }}>Damargaleri</p>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            {isAdmin ? 'Admin Dashboard' : 'Wedding Planner'}
          </p>
        </div>

        {magicSent ? (
          <div style={{
            background: G50, border: `1px solid ${G100}`,
            borderRadius: 12, padding: '20px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 24, margin: '0 0 8px' }}>📧</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: G900, margin: '0 0 6px' }}>
              Cek email kamu!
            </p>
            <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.6 }}>
              Link masuk sudah dikirim ke <strong>{email}</strong>. Klik link itu untuk masuk.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: MUTED, margin: '0 0 6px' }}>Email</p>
              <input
                type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="email@example.com"
                style={{
                  width: '100%', padding: '10px 14px', fontSize: 14,
                  border: `1px solid ${error ? RED : BORDER}`, borderRadius: 10,
                  outline: 'none', color: DARK, boxSizing: 'border-box',
                }}
              />
            </div>

            {isAdmin && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: MUTED, margin: '0 0 6px' }}>Password</p>
                <input
                  type="password" value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '10px 14px', fontSize: 14,
                    border: `1px solid ${error ? RED : BORDER}`, borderRadius: 10,
                    outline: 'none', color: DARK, boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {error && (
              <p style={{ fontSize: 12, color: RED, margin: '0 0 12px' }}>{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600,
                background: loading ? MUTED : G900, color: WHITE,
                border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {loading ? 'Memproses...' : isAdmin ? 'Masuk' : 'Kirim link masuk'}
            </button>

            {!isAdmin && (
              <p style={{ fontSize: 12, color: MUTED, textAlign: 'center', margin: '14px 0 0', lineHeight: 1.6 }}>
                Tidak perlu password — kami kirim link masuk ke email kamu.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
