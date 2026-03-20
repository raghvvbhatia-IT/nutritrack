import { useState, useCallback, useRef } from 'react'
import { searchFoods } from '../utils/foodApi'

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

export default function FoodSearch({ onAdd, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [quantity, setQuantity] = useState('100')
  const [meal, setMeal] = useState('Breakfast')
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  const search = useCallback((q) => {
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
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
    }, 500)
  }, [])

  function handleInput(e) {
    setQuery(e.target.value)
    setSelected(null)
    search(e.target.value)
  }

  function handleSelect(food) {
    setSelected(food)
    setResults([])
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

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-slate-800 rounded-t-2xl mt-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">Add Food</h2>
          <button onClick={onClose} className="text-slate-400 text-2xl leading-none">&times;</button>
        </div>

        {/* Search input */}
        <div className="p-4">
          <input
            autoFocus
            type="text"
            placeholder="Search food..."
            value={query}
            onChange={handleInput}
            className="w-full bg-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center text-slate-400 py-4">Searching...</div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center text-slate-400 py-4">{error}</div>
        )}

        {/* Results list */}
        {!selected && results.length > 0 && (
          <div className="overflow-y-auto flex-1">
            {results.map((food) => (
              <button
                key={food.id}
                onClick={() => handleSelect(food)}
                className="w-full text-left px-4 py-3 border-b border-slate-700 hover:bg-slate-700 active:bg-slate-600"
              >
                <div className="font-medium text-white truncate">{food.name}</div>
                {food.brand && <div className="text-xs text-slate-400">{food.brand}</div>}
                <div className="text-xs text-emerald-400 mt-1">
                  {food.calories} kcal · P {food.protein}g · C {food.carbs}g · F {food.fat}g <span className="text-slate-500">per 100g</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected food - portion picker */}
        {selected && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-slate-700 rounded-xl p-4">
              <div className="font-semibold text-white">{selected.name}</div>
              {selected.brand && <div className="text-xs text-slate-400">{selected.brand}</div>}
            </div>

            {/* Meal selector */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Meal</label>
              <div className="grid grid-cols-4 gap-2">
                {MEALS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMeal(m)}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      meal === m ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Quantity (grams)</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                min="1"
              />
            </div>

            {/* Calculated macros */}
            {(() => {
              const q = parseFloat(quantity) || 100
              const scale = q / 100
              return (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Calories', value: Math.round(selected.calories * scale), unit: 'kcal', color: 'text-yellow-400' },
                    { label: 'Protein', value: (selected.protein * scale).toFixed(1), unit: 'g', color: 'text-blue-400' },
                    { label: 'Carbs', value: (selected.carbs * scale).toFixed(1), unit: 'g', color: 'text-orange-400' },
                    { label: 'Fat', value: (selected.fat * scale).toFixed(1), unit: 'g', color: 'text-pink-400' },
                  ].map(({ label, value, unit, color }) => (
                    <div key={label} className="bg-slate-700 rounded-xl p-3">
                      <div className={`text-lg font-bold ${color}`}>{value}</div>
                      <div className="text-xs text-slate-400">{unit}</div>
                      <div className="text-xs text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
              )
            })()}

            <button
              onClick={handleAdd}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
            >
              Add to Log
            </button>
          </div>
        )}

        {/* Bottom safe area */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </div>
    </div>
  )
}
