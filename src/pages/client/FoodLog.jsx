import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/useAuthStore'
import FoodSearch from '../../components/FoodSearch'
import { formatDate, offsetDate } from '../../utils/date'
import { recordFood } from '../../utils/recentFoods'

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
const MEAL_ICONS = { Breakfast: '☀️', Lunch: '🌤', Dinner: '🌙', Snacks: '🍎' }
const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65 }

// Color palette
const C = {
  bg: '#0A0A0A',
  surface: '#111111',
  border: '#1A1A1A',
  text: '#FFFFFF',
  secondary: '#888888',
  protein: '#4B96F3',
  carbs: '#F4A242',
  fat: '#E86F6F',
  ring: '#0170B9',
  add: '#0170B9',
}

// SVG donut ring that animates from 0 to the target dash offset
function CalorieRing({ consumed, goal }) {
  const radius = 64
  const stroke = 12
  const size = 160
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(consumed / (goal || 1), 1)
  const targetOffset = circumference * (1 - pct)

  const animRef = useRef(null)
  const [offset, setOffset] = useState(circumference)

  useEffect(() => {
    let start = null
    const duration = 700
    const startOffset = circumference
    const endOffset = targetOffset

    if (animRef.current) cancelAnimationFrame(animRef.current)

    function step(ts) {
      if (!start) start = ts
      const elapsed = ts - start
      const progress = Math.min(elapsed / duration, 1)
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setOffset(startOffset + (endOffset - startOffset) * eased)
      if (progress < 1) {
        animRef.current = requestAnimationFrame(step)
      }
    }

    animRef.current = requestAnimationFrame(step)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [targetOffset, circumference])

  const remaining = Math.max(goal - consumed, 0)
  const overBy = consumed > goal ? consumed - goal : 0

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1A1A1A"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={consumed > goal ? '#E86F6F' : C.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {/* Center text */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: C.text, lineHeight: 1 }}>
          {Math.round(consumed)}
        </span>
        <span style={{ fontSize: 11, color: C.secondary, letterSpacing: '0.03em' }}>kcal</span>
        {overBy > 0 ? (
          <span style={{ fontSize: 10, color: '#E86F6F', marginTop: 2 }}>+{Math.round(overBy)} over</span>
        ) : (
          <span style={{ fontSize: 10, color: C.secondary, marginTop: 2 }}>{Math.round(remaining)} left</span>
        )}
      </div>
    </div>
  )
}

function MacroBar({ label, value, goal, color }) {
  const pct = Math.min((value / (goal || 1)) * 100, 100)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: C.secondary, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12 }}>
          <span style={{ color, fontWeight: 600 }}>{Math.round(value)}</span>
          <span style={{ color: '#555' }}>/{goal}g</span>
        </span>
      </div>
      <div style={{ height: 4, background: '#1E1E1E', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 99,
          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}

export default function FoodLog({ date, onDateChange }) {
  const { user } = useAuthStore()
  const [addingTo, setAddingTo] = useState(null) // meal name or null
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
    // Persist to recent foods
    recordFood({
      id: entry.name.toLowerCase().replace(/\s+/g, '-'),
      name: entry.name,
      brand: entry.brand || '',
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
    })
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>

      {/* Date navigation header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 8px',
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button
          onClick={() => onDateChange(offsetDate(date, -1))}
          style={{
            background: 'none', border: 'none', color: C.secondary,
            padding: '8px 12px', cursor: 'pointer', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span style={{ fontWeight: 600, color: C.text, fontSize: 15, letterSpacing: '-0.01em' }}>
          {formatDate(date)}
        </span>
        <button
          onClick={() => onDateChange(offsetDate(date, 1))}
          style={{
            background: 'none', border: 'none', color: C.secondary,
            padding: '8px 12px', cursor: 'pointer', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 32 }}>

        {/* Summary card */}
        <div style={{
          margin: '12px 12px 8px',
          background: C.surface,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}>
          {/* Donut ring */}
          <CalorieRing consumed={totals.calories} goal={goals.calories} />

          {/* Right side: label + macro bars */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: C.secondary }}>Consumed </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                {Math.round(totals.calories)}
              </span>
              <span style={{ fontSize: 13, color: C.secondary }}> / {goals.calories} kcal</span>
            </div>
            <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color={C.protein} />
            <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color={C.carbs} />
            <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color={C.fat} />
          </div>
        </div>

        {/* Meal sections */}
        {loading ? (
          <div style={{ textAlign: 'center', color: C.secondary, padding: '32px 0', fontSize: 14 }}>
            Loading…
          </div>
        ) : (
          MEALS.map((mealName) => {
            const mealLogs = logs.filter((e) => e.meal === mealName)
            const mealCals = mealLogs.reduce((s, e) => s + (e.calories || 0), 0)
            return (
              <div key={mealName} style={{
                margin: '8px 12px',
                background: C.surface,
                borderRadius: 16,
                border: `1px solid ${C.border}`,
                overflow: 'hidden',
              }}>
                {/* Meal header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: mealLogs.length > 0 ? `1px solid ${C.border}` : 'none',
                }}>
                  <span style={{ fontWeight: 600, color: C.text, fontSize: 15 }}>
                    {MEAL_ICONS[mealName]} {mealName}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {mealCals > 0 && (
                      <span style={{ fontSize: 13, color: C.secondary }}>{Math.round(mealCals)} kcal</span>
                    )}
                    {/* Add button */}
                    <button
                      onClick={() => setAddingTo(mealName)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: C.add,
                        border: 'none',
                        color: '#fff',
                        fontSize: 18,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        fontWeight: 300,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Food items */}
                {mealLogs.map((entry, idx) => (
                  <div key={entry.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: idx < mealLogs.length - 1 ? `1px solid ${C.border}` : 'none',
                    gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: C.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: 4,
                      }}>
                        {entry.name}
                      </div>
                      {/* Macro row */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: C.secondary }}>{entry.quantity}g</span>
                        <span style={{ fontSize: 12, color: C.secondary }}>·</span>
                        <span style={{ fontSize: 12, color: C.secondary }}>{entry.calories} kcal</span>
                        <span style={{ fontSize: 12, color: C.secondary }}>·</span>
                        <span style={{ fontSize: 12, color: C.protein }}>P {entry.protein}g</span>
                        <span style={{ fontSize: 12, color: C.carbs }}>C {entry.carbs}g</span>
                        <span style={{ fontSize: 12, color: C.fat }}>F {entry.fat}g</span>
                      </div>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={() => removeFood(entry.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#444',
                        cursor: 'pointer',
                        padding: 4,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 6,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>

      {/* Food search sheet */}
      {addingTo && (
        <FoodSearch
          onAdd={addFood}
          onClose={() => setAddingTo(null)}
          defaultMeal={addingTo}
        />
      )}
    </div>
  )
}
