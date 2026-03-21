import { useState, useCallback, useRef, useEffect } from 'react'
import { searchFoods, getByBarcode } from '../utils/foodApi'
import { getRecentFoods, getFrequentFoods, recordFood } from '../utils/recentFoods'
import BarcodeScanner from './BarcodeScanner'

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

// ── Icons ────────────────────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function BarcodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 9V6a2 2 0 012-2h2M3 15v3a2 2 0 002 2h2M15 3h2a2 2 0 012 2v3M15 21h2a2 2 0 002-2v-3" />
      <path d="M7 8v8M10 8v8M13 8v8M16 8v8" />
    </svg>
  )
}

// ── Source badge ─────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  const config = {
    local: { label: 'Local', bg: '#1A3A1A', color: '#4ADE80' },
    usda:  { label: 'USDA',  bg: '#0A2540', color: '#4B96F3' },
    off:   { label: 'OFF',   bg: '#2A2A2A', color: '#888888' },
  }
  const cfg = config[source] || config.off
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 6px',
      borderRadius: 4,
      background: cfg.bg,
      color: cfg.color,
      letterSpacing: '0.04em',
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  )
}

// ── Macro pills row ──────────────────────────────────────────────────────────
function MacroPills({ protein, carbs, fat }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      <span style={{ fontSize: 11, color: C.protein, background: '#0A1A2E', padding: '2px 6px', borderRadius: 4 }}>
        P {protein}g
      </span>
      <span style={{ fontSize: 11, color: C.carbs, background: '#2A1A00', padding: '2px 6px', borderRadius: 4 }}>
        C {carbs}g
      </span>
      <span style={{ fontSize: 11, color: C.fat, background: '#2A0A0A', padding: '2px 6px', borderRadius: 4 }}>
        F {fat}g
      </span>
    </div>
  )
}

// ── Portion picker ───────────────────────────────────────────────────────────
function PortionPicker({ food, meal, onMealChange, onAdd, onBack }) {
  const [quantity, setQuantity] = useState('100')

  const q = parseFloat(quantity) || 100
  const scale = q / 100
  const scaled = {
    calories: Math.round(food.calories * scale),
    protein: parseFloat((food.protein * scale).toFixed(1)),
    carbs: parseFloat((food.carbs * scale).toFixed(1)),
    fat: parseFloat((food.fat * scale).toFixed(1)),
  }

  function handleAdd() {
    const entry = {
      name: food.name,
      brand: food.brand || '',
      meal,
      quantity: q,
      ...scaled,
    }
    // Record in recents
    const recentId = food.id || food.name.toLowerCase().replace(/\s+/g, '-')
    recordFood({
      id: recentId,
      name: food.name,
      brand: food.brand || '',
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    })
    onAdd(entry)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
      {/* Food card with back button */}
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
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 2 }}>{food.name}</div>
          {food.brand && <div style={{ fontSize: 12, color: C.secondary }}>{food.brand}</div>}
          {food.source && <SourceBadge source={food.source} />}
        </div>
        <button
          onClick={onBack}
          style={{
            background: '#1E1E1E',
            border: 'none',
            color: C.secondary,
            width: 28,
            height: 28,
            borderRadius: '50%',
            fontSize: 18,
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 12,
          }}
        >
          ×
        </button>
      </div>

      {/* Meal selector */}
      <div style={{ marginBottom: 14, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 2 }}>
          {MEALS.map((m) => (
            <button
              key={m}
              onClick={() => onMealChange(m)}
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

      {/* Quantity input */}
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        marginBottom: 16,
      }}>
        {[
          { label: 'Calories', value: scaled.calories, unit: 'kcal', color: '#FFD166' },
          { label: 'Protein',  value: scaled.protein,  unit: 'g',    color: C.protein },
          { label: 'Carbs',    value: scaled.carbs,    unit: 'g',    color: C.carbs   },
          { label: 'Fat',      value: scaled.fat,      unit: 'g',    color: C.fat     },
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

      <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}

// ── Food row — used in Recent and Search results ─────────────────────────────
function FoodRow({ food, onSelect }) {
  return (
    <button
      onClick={() => onSelect(food)}
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
          }}>
            {food.name}
          </div>
          {food.brand && (
            <div style={{ fontSize: 12, color: C.secondary, marginBottom: 2 }}>{food.brand}</div>
          )}
          <MacroPills protein={food.protein} carbs={food.carbs} fat={food.fat} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{food.calories}</span>
          <span style={{ fontSize: 11, color: C.muted }}>kcal</span>
          {food.source && <SourceBadge source={food.source} />}
        </div>
      </div>
    </button>
  )
}

// ── Recent tab ───────────────────────────────────────────────────────────────
function RecentTab({ onSelect }) {
  const [subTab, setSubTab] = useState('recent') // 'recent' | 'frequent'
  const [recentList, setRecentList] = useState([])
  const [frequentList, setFrequentList] = useState([])

  useEffect(() => {
    setRecentList(getRecentFoods().slice(0, 20))
    setFrequentList(getFrequentFoods())
  }, [])

  const list = subTab === 'recent' ? recentList : frequentList

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px 0' }}>
        {['recent', 'frequent'].map((key) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            style={{
              padding: '6px 14px',
              borderRadius: 99,
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              background: subTab === key ? C.accent : '#1A1A1A',
              color: subTab === key ? '#fff' : C.secondary,
              transition: 'background 0.15s, color 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {key === 'recent' ? 'Recent' : 'Frequent'}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1, marginTop: 8 }}>
        {list.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: C.secondary,
            padding: '48px 20px',
            fontSize: 14,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🍽</div>
            No {subTab} foods yet
          </div>
        ) : (
          list.map((food) => (
            <FoodRow key={food.id} food={{ ...food, source: food.source || 'local' }} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Search tab ───────────────────────────────────────────────────────────────
function SearchTab({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  const runSearch = useCallback((q) => {
    clearTimeout(timerRef.current)
    if (!q.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      setError('')
      try {
        const res = await searchFoods(q)
        setResults(res)
        if (!res.length) setError('No results found')
      } catch {
        setError('Search failed. Check your connection.')
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [])

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    if (val.trim()) {
      setLoading(true)  // show loading indicator immediately, before debounce fires
    } else {
      setLoading(false)
      setResults([])
      setError('')
    }
    runSearch(val)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setError('')
    setLoading(false)
    clearTimeout(timerRef.current)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Search input */}
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
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
              onClick={clearSearch}
              style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 2 }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div style={{ textAlign: 'center', color: C.secondary, padding: '16px 0', fontSize: 13 }}>
          Searching USDA database…
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ textAlign: 'center', color: C.secondary, padding: '20px 0', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Empty hint */}
      {!loading && !error && !query && (
        <div style={{ textAlign: 'center', color: C.muted, padding: '48px 20px', fontSize: 13 }}>
          Type to search 800k+ foods
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div style={{ overflowY: 'auto', flex: 1, marginTop: 4 }}>
          {results.map((food) => (
            <FoodRow key={food.id} food={food} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Scan tab ─────────────────────────────────────────────────────────────────
function ScanTab({ meal, onAdd, onClose }) {
  const [scanState, setScanState] = useState('scanning') // 'scanning' | 'loading' | 'found' | 'error'
  const [foundFood, setFoundFood] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleBarcode(barcode) {
    setScanState('loading')
    try {
      const food = await getByBarcode(barcode)
      setFoundFood(food)
      setScanState('found')
    } catch {
      setErrorMsg(`Could not find barcode ${barcode}. Try searching manually.`)
      setScanState('error')
    }
  }

  if (scanState === 'loading') {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        padding: 32,
      }}>
        <div style={{ fontSize: 14, color: C.secondary }}>Looking up barcode…</div>
      </div>
    )
  }

  if (scanState === 'error') {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 32,
      }}>
        <div style={{ fontSize: 14, color: '#E86F6F', textAlign: 'center' }}>{errorMsg}</div>
        <button
          onClick={() => setScanState('scanning')}
          style={{
            background: C.accent,
            border: 'none',
            borderRadius: 10,
            padding: '10px 24px',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  if (scanState === 'found' && foundFood) {
    return (
      <PortionPicker
        food={foundFood}
        meal={meal}
        onMealChange={() => {}}
        onAdd={(entry) => { onAdd(entry); onClose() }}
        onBack={() => { setFoundFood(null); setScanState('scanning') }}
      />
    )
  }

  // scanning state
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <BarcodeScanner onResult={handleBarcode} onClose={onClose} />
    </div>
  )
}

// ── Main FoodSearch component ────────────────────────────────────────────────
export default function FoodSearch({ onAdd, onClose, defaultMeal = 'Breakfast' }) {
  const [tab, setTab] = useState('recent')   // 'recent' | 'search' | 'scan'
  const [meal, setMeal] = useState(defaultMeal)
  const [selected, setSelected] = useState(null)

  function handleSelect(food) {
    setSelected(food)
  }

  function handleAdd(entry) {
    onAdd(entry)
    onClose()
  }

  const tabs = [
    { key: 'recent', label: 'Recent', Icon: ClockIcon },
    { key: 'search', label: 'Search', Icon: SearchIcon },
    { key: 'scan',   label: 'Scan',   Icon: BarcodeIcon },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
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
        maxHeight: '92vh',
        height: tab === 'scan' ? '92vh' : undefined,
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
              width: 30,
              height: 30,
              borderRadius: '50%',
              fontSize: 18,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 20px 0' }}>
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setSelected(null) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
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

        {/* ── Tab content ── */}

        {/* Scan tab — no portion picker wrapper, handles its own flow */}
        {tab === 'scan' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <ScanTab meal={meal} onAdd={onAdd} onClose={onClose} />
          </div>
        )}

        {/* Recent / Search tabs */}
        {tab !== 'scan' && (
          <>
            {selected ? (
              <PortionPicker
                food={selected}
                meal={meal}
                onMealChange={setMeal}
                onAdd={handleAdd}
                onBack={() => setSelected(null)}
              />
            ) : (
              <>
                {/* Meal selector (shown only on recent/search when no food selected) */}
                {tab === 'search' && (
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
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  {tab === 'recent' && <RecentTab onSelect={handleSelect} />}
                  {tab === 'search' && <SearchTab onSelect={handleSelect} />}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
