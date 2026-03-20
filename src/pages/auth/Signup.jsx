import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'
import { supabase } from '../../lib/supabase'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(inviteToken ? 'client' : 'client')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [coachName, setCoachName] = useState('')
  const signUp = useAuthStore((s) => s.signUp)
  const navigate = useNavigate()

  // Fetch coach name from invite token
  useEffect(() => {
    if (!inviteToken) return
    supabase
      .from('invites')
      .select('coach_name, used')
      .eq('token', inviteToken)
      .single()
      .then(({ data }) => {
        if (data && !data.used) setCoachName(data.coach_name || 'your coach')
      })
  }, [inviteToken])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const { error } = await signUp(email, password, fullName, role, inviteToken)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }
  }

  return (
    <div style={{ height: '100dvh', background: '#0f172a', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto', padding: '2rem 1.5rem' }}>
      <div className="mx-auto w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-xl font-bold">N</div>
          <span className="text-2xl font-bold text-white">NutriTrack</span>
        </div>

        {/* Invite banner */}
        {inviteToken && coachName && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl px-4 py-3 mb-6 text-center">
            You've been invited by <span className="font-semibold">{coachName}</span>
          </div>
        )}

        <h2 className="text-xl font-semibold text-white mb-6">Create account</h2>

        {/* Role selector (only shown if no invite) */}
        {!inviteToken && (
          <div className="flex gap-2 mb-6">
            {['client', 'coach'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${
                  role === r ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {r === 'client' ? '🏃 Athlete' : '📋 Coach'}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Min. 6 characters"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
