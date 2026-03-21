import { searchLocalFoods } from './localFoods'

// ── USDA FoodData Central ────────────────────────────────────────────────────
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1'
const USDA_KEY = 'DEMO_KEY'

// Nutrient IDs from USDA API
const NID_CALORIES = 1008
const NID_PROTEIN  = 1003
const NID_CARBS    = 1005
const NID_FAT      = 1004

function getNutrient(food, id) {
  const nutrients = food.foodNutrients || []
  const n = nutrients.find((n) => n.nutrientId === id || (n.nutrient && n.nutrient.id === id))
  return n ? (n.value !== undefined ? n.value : (n.amount || 0)) : 0
}

function parseUSDAFood(food) {
  return {
    id: 'usda_' + food.fdcId,
    name: food.description || food.lowercaseDescription || 'Unknown',
    brand: food.brandOwner || food.brandName || '',
    calories: Math.round(getNutrient(food, NID_CALORIES)),
    protein: parseFloat((getNutrient(food, NID_PROTEIN)).toFixed(1)),
    carbs: parseFloat((getNutrient(food, NID_CARBS)).toFixed(1)),
    fat: parseFloat((getNutrient(food, NID_FAT)).toFixed(1)),
    serving: food.servingSize ? `${food.servingSize}${food.servingSizeUnit || 'g'}` : '100g',
    source: 'usda',
  }
}

async function searchUSDA(query) {
  const params = new URLSearchParams({
    query,
    api_key: USDA_KEY,
    pageSize: '25',
    dataType: 'Foundation,SR Legacy,Survey (FNDDS)',
  })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${USDA_BASE}/foods/search?${params}`, { signal: controller.signal })
    if (!res.ok) return []
    const data = await res.json()
    return (data.foods || [])
      .map(parseUSDAFood)
      .filter((f) => f.calories > 0)
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

// ── Open Food Facts ──────────────────────────────────────────────────────────
const OFF_BASE = 'https://world.openfoodfacts.org'

function parseOFFProduct(product) {
  const n = product.nutriments || {}
  return {
    id: 'off_' + (product.code || product._id),
    name: product.product_name || product.product_name_en || 'Unknown',
    brand: product.brands || '',
    calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
    protein: parseFloat((n.proteins_100g || 0).toFixed(1)),
    carbs: parseFloat((n.carbohydrates_100g || 0).toFixed(1)),
    fat: parseFloat((n.fat_100g || 0).toFixed(1)),
    serving: product.serving_size || '100g',
    source: 'off',
  }
}

async function searchOFF(query) {
  const url = `${OFF_BASE}/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=code,product_name,product_name_en,brands,nutriments,serving_size&page_size=10&sort_by=unique_scans_n`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return []
    const data = await res.json()
    return (data.products || [])
      .filter((p) => p.product_name && p.nutriments?.['energy-kcal_100g'])
      .map(parseOFFProduct)
      .filter((f) => f.calories > 0)
      .slice(0, 10)
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

// ── Main search — three-layer, parallel ────────────────────────────────────
export async function searchFoods(query) {
  if (!query.trim()) return []

  // Layer 1: instant local results
  const localResults = searchLocalFoods(query).map((f) => ({ ...f, source: 'local' }))

  // Layer 2 + 3: fire USDA and OFF in parallel
  const [usdaResults, offResults] = await Promise.all([
    searchUSDA(query),
    searchOFF(query),
  ])

  // Dedupe by name (case-insensitive)
  const seenNames = new Set()

  // Prime with local food names
  for (const f of localResults) {
    seenNames.add(f.name.toLowerCase())
  }

  const dedupeUSDA = []
  for (const f of usdaResults) {
    const key = f.name.toLowerCase()
    if (!seenNames.has(key)) {
      seenNames.add(key)
      dedupeUSDA.push(f)
    }
  }

  const dedupeOFF = []
  for (const f of offResults) {
    const key = f.name.toLowerCase()
    if (!seenNames.has(key)) {
      seenNames.add(key)
      dedupeOFF.push(f)
    }
  }

  // Return: local first, then USDA, then OFF — all filtered for > 0 calories
  return [...localResults, ...dedupeUSDA, ...dedupeOFF].filter((f) => f.calories > 0)
}

// ── Barcode lookup via Open Food Facts v0 ───────────────────────────────────
export async function getByBarcode(barcode) {
  const url = `${OFF_BASE}/api/v0/product/${barcode}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Barcode lookup failed')
  const data = await res.json()
  if (data.status !== 1) throw new Error('Product not found')
  return parseOFFProduct(data.product)
}
