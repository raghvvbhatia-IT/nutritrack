import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signIn = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
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

        <h2 className="text-xl font-semibold text-white mb-6">Sign in</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••"
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-emerald-400 font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
