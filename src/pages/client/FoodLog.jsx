import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/useAuthStore'
import FoodSearch from '../../components/FoodSearch'
import { formatDate, offsetDate } from '../../utils/date'

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
const MEAL_ICONS = { Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙', Snacks: '🍎' }

const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65 }

export default function FoodLog({ date, onDateChange }) {
  const { user } = useAuthStore()
  const [showSearch, setShowSearch] = useState(false)
  const [logs, setLogs] = useState([])
  const [goals, setGoals] = useState(DEFAULT_GOALS)
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at')
    setLogs(data || [])
    setLoading(false)
  }, [user, date])

  // Fetch coach-set macro targets (most recent)
  useEffect(() => {
    if (!user) return
    supabase
      .from('macro_targets')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setGoals({ calories: data.calories, protein: data.protein, carbs: data.carbs, fat: data.fat })
      })
  }, [user])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function addFood(entry) {
    await supabase.from('food_logs').insert({ ...entry, user_id: user.id, date })
    fetchLogs()
  }

  async function removeFood(id) {
    await supabase.from('food_logs').delete().eq('id', id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  const totals = logs.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const macros = [
    { label: 'Calories', value: totals.calories, goal: goals.calories, unit: 'kcal', color: '#f59e0b', bg: 'bg-yellow-500' },
    { label: 'Protein', value: totals.protein, goal: goals.protein, unit: 'g', color: '#3b82f6', bg: 'bg-blue-500' },
    { label: 'Carbs', value: totals.carbs, goal: goals.carbs, unit: 'g', color: '#f97316', bg: 'bg-orange-500' },
    { label: 'Fat', value: totals.fat, goal: goals.fat, unit: 'g', color: '#ec4899', bg: 'bg-pink-500' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Date nav */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <button onClick={() => onDateChange(offsetDate(date, -1))} className="text-slate-400 active:text-white p-2 -ml-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="font-semibold text-white">{formatDate(date)}</span>
        <button onClick={() => onDateChange(offsetDate(date, 1))} className="text-slate-400 active:text-white p-2 -mr-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Macro summary */}
        <div className="p-4 space-y-3">
          {macros.map(({ label, value, goal, unit, color, bg }) => {
            const pct = Math.min((value / goal) * 100, 100)
            return (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{label}</span>
                  <span className="text-slate-400">
                    <span style={{ color }} className="font-semibold">{Math.round(value)}</span>
                    <span className="text-slate-500"> / {goal}{unit}</span>
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${bg} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-8">Loading...</div>
        ) : (
          MEALS.map((mealName) => {
            const mealLogs = logs.filter((e) => e.meal === mealName)
            const mealCals = mealLogs.reduce((s, e) => s + (e.calories || 0), 0)
            return (
              <div key={mealName} className="mx-4 mb-4 bg-slate-800 rounded-2xl overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700">
                  <span className="font-semibold text-white">{MEAL_ICONS[mealName]} {mealName}</span>
                  <span className="text-sm text-slate-400">{mealCals} kcal</span>
                </div>
                {mealLogs.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500">Nothing logged</div>
                ) : (
                  mealLogs.map((entry) => (
                    <div key={entry.id} className="flex items-center px-4 py-3 border-b border-slate-700 last:border-0 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{entry.name}</div>
                        <div className="text-xs text-slate-400">
                          {entry.quantity}g · {entry.calories} kcal · P{entry.protein}g · C{entry.carbs}g · F{entry.fat}g
                        </div>
                      </div>
                      <button onClick={() => removeFood(entry.id)} className="text-slate-600 hover:text-red-400 p-1 shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add FAB */}
      <button
        onClick={() => setShowSearch(true)}
        className="fixed right-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl z-40"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >+</button>

      {showSearch && <FoodSearch onAdd={addFood} onClose={() => setShowSearch(false)} />}
    </div>
  )
}
