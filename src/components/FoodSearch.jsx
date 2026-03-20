import { useState, useCallback, useRef } from 'react'
import { searchFoods } from '../utils/foodApi'
import CameraCapture from './CameraCapture'

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

// MacroFactor palette
const C = {
  bg: '#0A0A0A',
  surface: '#111111',
  card: '#161616',
  border: '#1E1E1E',
  text: '#FFFFFF',
  secondary: '#888888',
  muted: '#555555',
  protein: '#4B96F3',
  carbs: '#F4A242',
  fat: '#E86F6F',
  accent: '#0170B9',
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

export default function FoodSearch({ onAdd, onClose, defaultMeal = 'Breakfast' }) {
  const [tab, setTab] = useState('search') // 'search' | 'scan'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [quantity, setQuantity] = useState('100')
  const [meal, setMeal] = useState(defaultMeal)
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  const search = useCallback((q) => {
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); setLoading(false); return }
    timerRef.current = setTimeout(async () => {
      setError('')
      try {
        const res = await searchFoods(q)
        setResults(res)
        if (!res.length) setError('No results found')
      } catch {
        setError('Search failed. Check connection.')
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    setSelected(null)
    if (val.trim()) setLoading(true)
    search(val)
  }

  function handleSelect(food) {
    setSelected(food)
    setResults([])
    setError('')
  }

  function handleAdd() {
    if (!selected) return
    const q = parseFloat(quantity) || 100
    const scale = q / 100
    onAdd({
      name: selected.name,
      brand: selected.brand,
      meal,
      quantity: q,
      calories: Math.round(selected.calories * scale),
      protein: parseFloat((selected.protein * scale).toFixed(1)),
      carbs: parseFloat((selected.carbs * scale).toFixed(1)),
      fat: parseFloat((selected.fat * scale).toFixed(1)),
    })
    onClose()
  }

  function handleScanAdd(entry) {
    onAdd({ ...entry, meal })
    onClose()
  }

  const q = parseFloat(quantity) || 100
  const scale = q / 100
  const scaledMacros = selected
    ? {
        calories: Math.round(selected.calories * scale),
        protein: parseFloat((selected.protein * scale).toFixed(1)),
        carbs: parseFloat((selected.carbs * scale).toFixed(1)),
        fat: parseFloat((selected.fat * scale).toFixed(1)),
      }
    : null

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        marginTop: 'auto',
        height: tab === 'scan' ? '92vh' : undefined,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, background: '#2A2A2A', borderRadius: 99 }} />
        </div>

        {/* Header row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px 0',
        }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Add Food</span>
          <button
            onClick={onClose}
            style={{
              background: '#1E1E1E',
              border: 'none',
              color: C.secondary,
              width: 30, height: 30,
              borderRadius: '50%',
              fontSize: 18, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '14px 20px 0',
        }}>
          {[
            { key: 'search', label: 'Search', Icon: SearchIcon },
            { key: 'scan', label: 'Scan Photo', Icon: CameraIcon },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px',
                borderRadius: 99,
                border: 'none',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                background: tab === key ? C.accent : '#1A1A1A',
                color: tab === key ? '#fff' : C.secondary,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'scan' ? (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <CameraCapture
              onAdd={handleScanAdd}
              onClose={onClose}
              defaultMeal={meal}
            />
          </div>
        ) : (
          <>
            {/* Search input */}
            <div style={{ padding: '14px 20px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: '#161616',
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                padding: '0 14px',
                gap: 10,
              }}>
                <span style={{ color: C.muted, flexShrink: 0 }}><SearchIcon /></span>
                <input
                  autoFocus
                  type="text"
                  placeholder="Search food…"
                  value={query}
                  onChange={handleInput}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: C.text,
                    fontSize: 15,
                    padding: '13px 0',
                    fontFamily: 'inherit',
                  }}
                />
                {query.length > 0 && (
                  <button
                    onClick={() => { setQuery(''); setResults([]); setSelected(null); setError('') }}
                    style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 2 }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Meal selector */}
            <div style={{ padding: '12px 20px 0', overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, paddingBottom: 2 }}>
                {MEALS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMeal(m)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 99,
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      background: meal === m ? C.accent : '#1A1A1A',
                      color: meal === m ? '#fff' : C.secondary,
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: 'center', color: C.secondary, padding: '20px 0', fontSize: 14 }}>
                Searching…
              </div>
            )}

            {/* Error */}
            {error && !loading && !selected && (
              <div style={{ textAlign: 'center', color: C.secondary, padding: '20px 0', fontSize: 14 }}>
                {error}
              </div>
            )}

            {/* Results list */}
            {!selected && results.length > 0 && (
              <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
                {results.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => handleSelect(food)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 20px',
                      borderBottom: `1px solid ${C.border}`,
                      background: 'none',
                      border: 'none',
                      borderBottom: `1px solid ${C.border}`,
                      cursor: 'pointer',
                      color: C.text,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                      {food.name}
                    </div>
                    {food.brand && (
                      <div style={{ fontSize: 12, color: C.secondary, marginBottom: 5 }}>{food.brand}</div>
                    )}
                    <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                      <span style={{ color: C.secondary }}>{food.calories} kcal</span>
                      <span style={{ color: C.protein }}>P {food.protein}g</span>
                      <span style={{ color: C.carbs }}>C {food.carbs}g</span>
                      <span style={{ color: C.fat }}>F {food.fat}g</span>
                      <span style={{ color: '#444' }}>per 100g</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected food detail */}
            {selected && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
                {/* Food card */}
                <div style={{
                  background: C.surface,
                  borderRadius: 14,
                  border: `1px solid ${C.border}`,
                  padding: '14px 16px',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 2 }}>{selected.name}</div>
                    {selected.brand && <div style={{ fontSize: 12, color: C.secondary }}>{selected.brand}</div>}
                  </div>
                  <button
                    onClick={() => { setSelected(null); setQuery(''); setResults([]) }}
                    style={{
                      background: '#1E1E1E', border: 'none', color: C.secondary,
                      width: 26, height: 26, borderRadius: '50%',
                      fontSize: 16, cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12,
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Quantity */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: C.secondary, display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    Quantity (grams)
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                    style={{
                      width: '100%',
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: '12px 16px',
                      color: C.text,
                      fontSize: 16,
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Macro preview grid */}
                {scaledMacros && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 8,
                    marginBottom: 16,
                  }}>
                    {[
                      { label: 'Calories', value: scaledMacros.calories, unit: 'kcal', color: '#FFD166' },
                      { label: 'Protein', value: scaledMacros.protein, unit: 'g', color: C.protein },
                      { label: 'Carbs', value: scaledMacros.carbs, unit: 'g', color: C.carbs },
                      { label: 'Fat', value: scaledMacros.fat, unit: 'g', color: C.fat },
                    ].map(({ label, value, unit, color }) => (
                      <div key={label} style={{
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 12,
                        padding: '12px 8px',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{unit}</div>
                        <div style={{ fontSize: 11, color: '#3A3A3A', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add button */}
                <button
                  onClick={handleAdd}
                  style={{
                    width: '100%',
                    background: C.accent,
                    border: 'none',
                    borderRadius: 14,
                    padding: '15px',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Add to Log
                </button>
              </div>
            )}

            {/* Bottom safe area */}
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </>
        )}
      </div>
    </div>
  )
}
