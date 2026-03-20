import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from './store/useAuthStore'
import { todayStr } from './utils/date'

import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import FoodLog from './pages/client/FoodLog'
import WeightTracker from './pages/client/WeightTracker'
import ExerciseLog from './pages/client/ExerciseLog'
import Profile from './pages/client/Profile'
import CoachDashboard from './pages/coach/CoachDashboard'
import ClientDetail from './pages/coach/ClientDetail'

// ── Bottom Nav ──────────────────────────────────────────────
const CLIENT_NAV = [
  { path: '/food', label: 'Food', icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?'#10b981':'none'} stroke={a?'#10b981':'#64748b'} strokeWidth="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg> },
  { path: '/weight', label: 'Weight', icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?'#10b981':'#64748b'} strokeWidth="2"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { path: '/exercise', label: 'Exercise', icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?'#10b981':'#64748b'} strokeWidth="2"><path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 10h3v4H3z"/><path d="M18 10h3v4h-3z"/></svg> },
  { path: '/profile', label: 'Profile', icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?'#10b981':'#64748b'} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg> },
]
const COACH_NAV = [
  { path: '/clients', label: 'Clients', icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?'#10b981':'#64748b'} strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.85"/></svg> },
  { path: '/profile', label: 'Profile', icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?'#10b981':'#64748b'} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg> },
]

function BottomNav({ role }) {
  const location = useLocation()
  if (location.pathname.startsWith('/clients/')) return null
  const nav = role === 'coach' ? COACH_NAV : CLIENT_NAV
  return (
    <div className="bg-slate-800 border-t border-slate-700 flex shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {nav.map(({ path, label, icon }) => {
        const active = location.pathname === path
        return (
          <a key={path} href={`#${path}`} className="flex-1 flex flex-col items-center py-3 gap-1">
            {icon(active)}
            <span className={`text-xs font-medium ${active ? 'text-emerald-400' : 'text-slate-500'}`}>{label}</span>
          </a>
        )
      })}
    </div>
  )
}

// ── App Shell (only shown when logged in) ───────────────────
function AppShell() {
  const { profile } = useAuthStore()
  const [foodDate, setFoodDate] = useState(todayStr())

  // Default redirect based on role
  function DefaultRedirect() {
    if (profile?.role === 'coach') return <Navigate to="/clients" replace />
    return <Navigate to="/food" replace />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0f172a' }}>
      {/* iOS safe area top */}
      <div style={{ height: 'env(safe-area-inset-top)', background: '#1e293b', flexShrink: 0 }} />

      {/* Top bar */}
      <div style={{ flexShrink: 0 }} className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
        <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-sm font-bold text-white">N</div>
        <span className="font-bold text-white text-lg">NutriTrack</span>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="/food"     element={<FoodLog date={foodDate} onDateChange={setFoodDate} />} />
          <Route path="/weight"   element={<WeightTracker />} />
          <Route path="/exercise" element={<ExerciseLog />} />
          <Route path="/profile"  element={<Profile />} />
          <Route path="/clients"  element={<CoachDashboard />} />
          <Route path="/clients/:clientId" element={<ClientDetail />} />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </div>

      {/* Bottom nav */}
      <BottomNav role={profile?.role} />
    </div>
  )
}

// ── Redirect logged-in users away from /signup, preserving invite token ──
function SignupRedirect() {
  const [searchParams] = useSearchParams()
  const invite = searchParams.get('invite')
  const to = invite ? `/profile?invite=${invite}` : '/'
  return <Navigate to={to} replace />
}

// ── Root ────────────────────────────────────────────────────
export default function App() {
  const { loading, user, init } = useAuthStore()

  useEffect(() => { init() }, [])

  // Show loading screen before auth resolves
  if (loading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#64748b', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, background: '#10b981', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold', color: 'white', margin: '0 auto 16px' }}>N</div>
          NutriTrack
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        {/* Auth routes — full screen, no shell */}
        <Route path="/login"  element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={user ? <SignupRedirect /> : <Signup />} />

        {/* App routes — require login */}
        <Route path="/*" element={user ? <AppShell /> : <Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  )
}
