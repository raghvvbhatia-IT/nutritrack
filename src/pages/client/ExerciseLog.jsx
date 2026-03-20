import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/useAuthStore'
import { formatDate, offsetDate, todayStr } from '../../utils/date'

export default function ExerciseLog() {
  const { user } = useAuthStore()
  const [date, setDate] = useState(todayStr())
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ exercise_name: '', sets: '', reps: '', weight_kg: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at')
    setLogs(data || [])
    setLoading(false)
  }, [user, date])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.exercise_name.trim()) return
    setSaving(true)
    await supabase.from('exercise_logs').insert({
      user_id: user.id,
      date,
      exercise_name: form.exercise_name.trim(),
      sets: form.sets ? parseInt(form.sets) : null,
      reps: form.reps ? parseInt(form.reps) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      notes: form.notes.trim() || null,
    })
    setForm({ exercise_name: '', sets: '', reps: '', weight_kg: '', notes: '' })
    setSaving(false)
    setShowForm(false)
    fetchLogs()
  }

  async function removeLog(id) {
    await supabase.from('exercise_logs').delete().eq('id', id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  const totalVolume = logs.reduce((sum, e) => {
    return sum + ((e.sets || 0) * (e.reps || 0) * (e.weight_kg || 0))
  }, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Date nav */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <button onClick={() => setDate(offsetDate(date, -1))} className="text-slate-400 active:text-white p-2 -ml-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="font-semibold text-white">{formatDate(date)}</span>
        <button onClick={() => setDate(offsetDate(date, 1))} className="text-slate-400 active:text-white p-2 -mr-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Summary */}
        {logs.length > 0 && (
          <div className="px-4 pt-4 grid grid-cols-2 gap-3 mb-2">
            <div className="bg-slate-800 rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-400 mb-1">Exercises</div>
              <div className="text-2xl font-bold text-white">{logs.length}</div>
            </div>
            <div className="bg-slate-800 rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-400 mb-1">Total Volume</div>
              <div className="text-2xl font-bold text-white">{Math.round(totalVolume).toLocaleString()} <span className="text-sm text-slate-400">kg</span></div>
            </div>
          </div>
        )}

        {/* Exercise list */}
        <div className="px-4 pt-4 space-y-3">
          {loading ? (
            <div className="text-center text-slate-500 py-8">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🏋️</div>
              <div className="text-slate-400">No exercises logged</div>
              <div className="text-slate-500 text-sm mt-1">Tap + to add your first exercise</div>
            </div>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className="bg-slate-800 rounded-2xl px-4 py-3 flex items-start gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-white">{entry.exercise_name}</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {entry.sets && (
                      <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">{entry.sets} sets</span>
                    )}
                    {entry.reps && (
                      <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">{entry.reps} reps</span>
                    )}
                    {entry.weight_kg && (
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">{entry.weight_kg} kg</span>
                    )}
                  </div>
                  {entry.notes && <div className="text-xs text-slate-400 mt-1">{entry.notes}</div>}
                </div>
                <button onClick={() => removeLog(entry.id)} className="text-slate-600 hover:text-red-400 p-1 mt-0.5 shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add exercise FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed right-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl z-40"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >+</button>

      {/* Add exercise modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-slate-800 rounded-t-2xl mt-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold">Add Exercise</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="p-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Exercise name *</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Bench Press"
                  value={form.exercise_name}
                  onChange={(e) => setForm((f) => ({ ...f, exercise_name: e.target.value }))}
                  className="w-full bg-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'sets', label: 'Sets', placeholder: '3' },
                  { key: 'reps', label: 'Reps', placeholder: '10' },
                  { key: 'weight_kg', label: 'Weight (kg)', placeholder: '60' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-slate-400 block mb-1">{label}</label>
                    <input
                      type="number"
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full bg-slate-700 rounded-xl px-3 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                      step={key === 'weight_kg' ? '0.5' : '1'}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Close grip, paused"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={saving || !form.exercise_name.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-lg"
              >
                {saving ? 'Saving...' : 'Add Exercise'}
              </button>
            </form>
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </div>
        </div>
      )}
    </div>
  )
}
