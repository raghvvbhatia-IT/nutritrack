import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/useAuthStore'

export default function CoachDashboard() {
  const { profile } = useAuthStore()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile) return
    supabase
      .from('profiles')
      .select('*')
      .eq('coach_id', profile.id)
      .order('created_at')
      .then(({ data }) => {
        setClients(data || [])
        setLoading(false)
      })
  }, [profile])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">Loading clients...</div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-white">My Clients</h1>
        <p className="text-sm text-slate-400">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
      </div>

      {clients.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="text-6xl mb-4">👥</div>
          <div className="text-white font-semibold text-lg mb-2">No clients yet</div>
          <div className="text-slate-400 text-sm mb-6">
            Go to your Profile tab to generate an invite link and share it with your clients.
          </div>
        </div>
      ) : (
        <div className="px-4 pt-2 space-y-3">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-2xl px-4 py-4 flex items-center gap-4 text-left transition-colors"
            >
              <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center text-xl font-bold text-emerald-400 shrink-0">
                {client.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white">{client.full_name || 'Unnamed'}</div>
                <div className="text-xs text-slate-400 truncate">{client.email}</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
