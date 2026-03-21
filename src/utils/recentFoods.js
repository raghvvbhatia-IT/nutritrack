// localStorage utility for recent and frequent foods
// Each entry shape: { id, name, brand, calories, protein, carbs, fat, lastUsed: timestamp, count: number }

const KEY = 'nt_recent'
const MAX = 25

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function save(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // storage full or unavailable — silently ignore
  }
}

/**
 * Returns all recent foods sorted by lastUsed descending (most recent first).
 */
export function getRecentFoods() {
  const entries = load()
  return entries.slice().sort((a, b) => b.lastUsed - a.lastUsed)
}

/**
 * Returns top 15 foods sorted by use count descending (most frequent first).
 */
export function getFrequentFoods() {
  const entries = load()
  return entries
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
}

/**
 * Adds or updates a food entry.
 * Increments count and updates lastUsed timestamp.
 * Trims list to MAX entries (oldest last-used are removed).
 */
export function recordFood(foodEntry) {
  const entries = load()
  const idx = entries.findIndex((e) => e.id === foodEntry.id)
  const now = Date.now()

  if (idx >= 0) {
    // Update existing
    entries[idx] = {
      ...entries[idx],
      name: foodEntry.name,
      brand: foodEntry.brand || '',
      calories: foodEntry.calories,
      protein: foodEntry.protein,
      carbs: foodEntry.carbs,
      fat: foodEntry.fat,
      lastUsed: now,
      count: (entries[idx].count || 1) + 1,
    }
  } else {
    // Add new entry
    entries.push({
      id: foodEntry.id,
      name: foodEntry.name,
      brand: foodEntry.brand || '',
      calories: foodEntry.calories,
      protein: foodEntry.protein,
      carbs: foodEntry.carbs,
      fat: foodEntry.fat,
      lastUsed: now,
      count: 1,
    })
  }

  // Trim to MAX entries — remove oldest by lastUsed
  if (entries.length > MAX) {
    entries.sort((a, b) => b.lastUsed - a.lastUsed)
    entries.splice(MAX)
  }

  save(entries)
}

/**
 * Clears all recent food history.
 */
export function clearRecentFoods() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
