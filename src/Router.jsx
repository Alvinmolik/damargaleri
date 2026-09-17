import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import App from './App.jsx'

export default function Router() {
  const { user, profile, loading } = useAuth()
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  if (loading) return <LoadingScreen />

  const isAdminRoute = path === '/admin' || path.startsWith('/admin/')
  const slug = path.replace(/^\//, '').split('/')[0]
  const isClientRoute = slug && slug !== 'admin' && slug !== ''

  // Admin route — default deny. Only explicit admin roles may enter.
  if (isAdminRoute) {
    if (!user) return <LoginPage mode="admin" />
    const hasAdminAccess = profile?.role === 'admin' || profile?.role === 'superadmin'
    if (!hasAdminAccess) return <div style={err}>Akses admin ditolak.</div>
    return <AdminDashboard />
  }

  // Client route — /slug
  if (isClientRoute) {
    if (!user) return <LoginPage mode="client" />
    return <App slug={slug} />
  }

  // Root — redirect to admin
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#1B4332', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontFamily: 'Dancing Script, cursive', fontSize: 32, color: '#fff' }}>
        Damargaleri
      </span>
      <a href="/admin" style={{ fontSize: 14, color: 'rgba(255,255,255,.7)',
        textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,.3)' }}>
        Admin login →
      </a>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#1B4332' }}>
      <span style={{ fontFamily: 'Dancing Script, cursive', fontSize: 28, color: '#fff' }}>
        Damargaleri
      </span>
    </div>
  )
}

const err = {
  minHeight: '100dvh', display: 'flex', alignItems: 'center',
  justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: '#888'
}
