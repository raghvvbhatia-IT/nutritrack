import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/useAuthStore'
import { todayStr, formatDate, formatShortDate, offsetDate } from '../../utils/date'

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
const MEAL_ICONS = { Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙', Snacks: '🍎' }
const TABS = ['Food', 'Weight', 'Exercise', 'Notes']

function computeEMA(logs, alpha = 0.1) {
  if (!logs.length) return []
  const sorted = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date))
  let ema = sorted[0].weight
  return sorted.map((log) => {
    ema = alpha * log.weight + (1 - alpha) * ema
    return { date: log.date, Raw: log.weight, Trend: parseFloat(ema.toFixed(2)) }
  })
}

export default function ClientDetail() {
  const { clientId } = useParams()
  const { profile: coachProfile } = useAuthStore()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [tab, setTab] = useState('Food')
  const [date, setDate] = useState(todayStr())

  // Food
  const [foodLogs, setFoodLogs] = useState([])
  // Weight
  const [weightLogs, setWeightLogs] = useState([])
  // Exercise
  const [exerciseLogs, setExerciseLogs] = useState([])
  // Notes
  const [notes, setNotes] = useState([])
  const [noteInput, setNoteInput] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  // Macro targets
  const [targets, setTargets] = useState(null)
  const [targetForm, setTargetForm] = useState({ calories: 2000, protein: 150, carbs: 200, fat: 65 })
  const [editingTargets, setEditingTargets] = useState(false)
  const [savingTargets, setSavingTargets] = useState(false)

  // Load client profile
  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', clientId).single()
      .then(({ data }) => setClient(data))
  }, [clientId])

  // Load food logs for date
  const fetchFood = useCallback(async () => {
    const { data } = await supabase.from('food_logs').select('*')
      .eq('user_id', clientId).eq('date', date).order('created_at')
    setFoodLogs(data || [])
  }, [clientId, date])

  // Load weight logs
  const fetchWeight = useCallback(async () => {
    const { data } = await supabase.from('weight_logs').select('*')
      .eq('user_id', clientId).order('date')
    setWeightLogs(data || [])
  }, [clientId])

  // Load exercise logs for date
  const fetchExercise = useCallback(async () => {
    const { data } = await supabase.from('exercise_logs').select('*')
      .eq('user_id', clientId).eq('date', date).order('created_at')
    setExerciseLogs(data || [])
  }, [clientId, date])

  // Load notes + targets
  const fetchNotes = useCallback(async () => {
    const [{ data: n }, { data: t }] = await Promise.all([
      supabase.from('coach_notes').select('*').eq('client_id', clientId).eq('coach_id', coachProfile.id).order('created_at', { ascending: false }),
      supabase.from('macro_targets').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).single(),
    ])
    setNotes(n || [])
    if (t) {
      setTargets(t)
      setTargetForm({ calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat })
    }
  }, [clientId, coachProfile])

  useEffect(() => { fetchFood() }, [fetchFood])
  useEffect(() => { fetchWeight() }, [fetchWeight])
  useEffect(() => { fetchExercise() }, [fetchExercise])
  useEffect(() => { fetchNotes() }, [fetchNotes])

  async function addNote() {
    if (!noteInput.trim()) return
    setSavingNote(true)
    await supabase.from('coach_notes').insert({ coach_id: coachProfile.id, client_id: clientId, content: noteInput.trim() })
    setNoteInput('')
    setSavingNote(false)
    fetchNotes()
  }

  async function deleteNote(id) {
    await supabase.from('coach_notes').delete().eq('id', id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  async function saveTargets() {
    setSavingTargets(true)
    await supabase.from('macro_targets').insert({ coach_id: coachProfile.id, client_id: clientId, ...targetForm })
    setSavingTargets(false)
    setEditingTargets(false)
    fetchNotes()
  }

  const trend = computeEMA(weightLogs)
  const chartData = trend.slice(-60)

  const foodTotals = foodLogs.reduce((a, e) => ({
    calories: a.calories + (e.calories || 0), protein: a.protein + (e.protein || 0),
    carbs: a.carbs + (e.carbs || 0), fat: a.fat + (e.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  if (!client) return <div className="flex items-center justify-center h-full text-slate-400">Loading...</div>

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/clients')} className="text-slate-400 p-1 -ml-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="w-9 h-9 bg-emerald-500/20 rounded-full flex items-center justify-center font-bold text-emerald-400 shrink-0">
          {client.full_name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">{client.full_name}</div>
          <div className="text-xs text-slate-400 truncate">{client.email}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-800 border-b border-slate-700 shrink-0">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-8">

        {/* ---- FOOD TAB ---- */}
        {tab === 'Food' && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <button onClick={() => setDate(offsetDate(date, -1))} className="text-slate-400 p-2 -ml-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="font-semibold text-white">{formatDate(date)}</span>
              <button onClick={() => setDate(offsetDate(date, 1))} className="text-slate-400 p-2 -mr-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
            {/* Macro totals */}
            <div className="grid grid-cols-4 gap-2 px-4 py-3">
              {[
                { label: 'Cal', value: Math.round(foodTotals.calories), color: 'text-yellow-400' },
                { label: 'P', value: `${foodTotals.protein.toFixed(0)}g`, color: 'text-blue-400' },
                { label: 'C', value: `${foodTotals.carbs.toFixed(0)}g`, color: 'text-orange-400' },
                { label: 'F', value: `${foodTotals.fat.toFixed(0)}g`, color: 'text-pink-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800 rounded-xl p-2 text-center">
                  <div className={`font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
            {/* Targets set by coach */}
            {targets && (
              <div className="mx-4 mb-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-xs text-emerald-400">
                Your targets: {targets.calories} kcal · P{targets.protein}g · C{targets.carbs}g · F{targets.fat}g
              </div>
            )}
            {/* Meals */}
            {MEALS.map((mealName) => {
              const ml = foodLogs.filter((e) => e.meal === mealName)
              const mc = ml.reduce((s, e) => s + (e.calories || 0), 0)
              return (
                <div key={mealName} className="mx-4 mb-3 bg-slate-800 rounded-2xl overflow-hidden">
                  <div className="flex justify-between px-4 py-2.5 border-b border-slate-700">
                    <span className="font-medium text-white text-sm">{MEAL_ICONS[mealName]} {mealName}</span>
                    <span className="text-xs text-slate-400">{mc} kcal</span>
                  </div>
                  {ml.length === 0 ? (
                    <div className="px-4 py-2.5 text-xs text-slate-500">Nothing logged</div>
                  ) : (
                    ml.map((e) => (
                      <div key={e.id} className="px-4 py-2.5 border-b border-slate-700 last:border-0">
                        <div className="text-sm text-white">{e.name}</div>
                        <div className="text-xs text-slate-400">{e.quantity}g · {e.calories} kcal · P{e.protein}g · C{e.carbs}g · F{e.fat}g</div>
                      </div>
                    ))
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ---- WEIGHT TAB ---- */}
        {tab === 'Weight' && (
          <div className="p-4 space-y-4">
            {chartData.length >= 2 ? (
              <div className="bg-slate-800 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Weight Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Raw" stroke="#64748b" strokeWidth={1} dot={false} />
                    <Line type="monotone" dataKey="Trend" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">Not enough data for chart</div>
            )}
            <div className="bg-slate-800 rounded-2xl overflow-hidden">
              {weightLogs.slice().reverse().slice(0, 20).map((log) => (
                <div key={log.id} className="flex justify-between px-4 py-3 border-b border-slate-700 last:border-0">
                  <span className="text-slate-300 text-sm">{formatShortDate(log.date)}</span>
                  <span className="text-white font-semibold">{log.weight} kg</span>
                </div>
              ))}
              {weightLogs.length === 0 && <div className="px-4 py-6 text-center text-slate-500 text-sm">No weight entries yet</div>}
            </div>
          </div>
        )}

        {/* ---- EXERCISE TAB ---- */}
        {tab === 'Exercise' && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <button onClick={() => setDate(offsetDate(date, -1))} className="text-slate-400 p-2 -ml-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="font-semibold text-white">{formatDate(date)}</span>
              <button onClick={() => setDate(offsetDate(date, 1))} className="text-slate-400 p-2 -mr-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              {exerciseLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No exercises logged this day</div>
              ) : (
                exerciseLogs.map((e) => (
                  <div key={e.id} className="bg-slate-800 rounded-2xl px-4 py-3">
                    <div className="font-semibold text-white">{e.exercise_name}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {e.sets && <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">{e.sets} sets</span>}
                      {e.reps && <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">{e.reps} reps</span>}
                      {e.weight_kg && <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">{e.weight_kg} kg</span>}
                    </div>
                    {e.notes && <div className="text-xs text-slate-400 mt-1">{e.notes}</div>}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ---- NOTES TAB ---- */}
        {tab === 'Notes' && (
          <div className="p-4 space-y-4">
            {/* Macro targets */}
            <div className="bg-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Macro Targets</h3>
                <button onClick={() => setEditingTargets((v) => !v)} className="text-xs text-emerald-400 font-medium">
                  {editingTargets ? 'Cancel' : targets ? 'Edit' : 'Set Targets'}
                </button>
              </div>
              {targets && !editingTargets && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Cal', value: targets.calories, color: 'text-yellow-400' },
                    { label: 'Protein', value: `${targets.protein}g`, color: 'text-blue-400' },
                    { label: 'Carbs', value: `${targets.carbs}g`, color: 'text-orange-400' },
                    { label: 'Fat', value: `${targets.fat}g`, color: 'text-pink-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-slate-700 rounded-xl p-2">
                      <div className={`font-bold ${color}`}>{value}</div>
                      <div className="text-xs text-slate-400">{label}</div>
                    </div>
                  ))}
                </div>
              )}
              {!targets && !editingTargets && (
                <div className="text-slate-500 text-sm">No targets set yet.</div>
              )}
              {editingTargets && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'calories', label: 'Calories (kcal)' },
                      { key: 'protein', label: 'Protein (g)' },
                      { key: 'carbs', label: 'Carbs (g)' },
                      { key: 'fat', label: 'Fat (g)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs text-slate-400 block mb-1">{label}</label>
                        <input type="number" value={targetForm[key]}
                          onChange={(e) => setTargetForm((f) => ({ ...f, [key]: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                      </div>
                    ))}
                  </div>
                  <button onClick={saveTargets} disabled={savingTargets}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
                    {savingTargets ? 'Saving...' : 'Save Targets'}
                  </button>
                </div>
              )}
            </div>

            {/* Add note */}
            <div className="bg-slate-800 rounded-2xl p-4">
              <h3 className="font-semibold text-white mb-3">Add Note</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Leave feedback for your client..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  className="flex-1 bg-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <button onClick={addNote} disabled={savingNote || !noteInput.trim()}
                  className="bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 rounded-xl text-sm">
                  Post
                </button>
              </div>
            </div>

            {/* Notes list */}
            <div className="space-y-2">
              {notes.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-4">No notes yet</div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-slate-800 rounded-2xl px-4 py-3 flex items-start gap-3">
                    <div className="flex-1">
                      <div className="text-white text-sm">{note.content}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button onClick={() => deleteNote(note.id)} className="text-slate-600 hover:text-red-400 p-1 shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
