import { searchLocalFoods } from './localFoods'

// Open Food Facts API - free, open source, no key needed
const BASE = 'https://world.openfoodfacts.org'

function parseProduct(product) {
  const n = product.nutriments || {}
  return {
    id: product.code || product._id,
    name: product.product_name || product.product_name_en || 'Unknown',
    brand: product.brands || '',
    calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
    protein: parseFloat((n.proteins_100g || 0).toFixed(1)),
    carbs: parseFloat((n.carbohydrates_100g || 0).toFixed(1)),
    fat: parseFloat((n.fat_100g || 0).toFixed(1)),
    serving: product.serving_size || '100g',
  }
}

async function searchRemote(query) {
  const url = `${BASE}/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=code,product_name,product_name_en,brands,nutriments,serving_size&page_size=15&sort_by=unique_scans_n`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return []
    const data = await res.json()
    return (data.products || [])
      .filter((p) => p.product_name && p.nutriments?.['energy-kcal_100g'])
      .map(parseProduct)
      .slice(0, 10)
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

export async function searchFoods(query) {
  if (!query.trim()) return []

  // 1. Instant local results
  const local = searchLocalFoods(query)

  // 2. Remote results (fire in parallel, don't block)
  const remote = await searchRemote(query)

  // Merge: local first, then remote items not already in local
  const localIds = new Set(local.map((f) => f.id))
  const merged = [...local, ...remote.filter((f) => !localIds.has(f.id))]
  return merged.slice(0, 20)
}

export async function getByBarcode(barcode) {
  const url = `${BASE}/api/v0/product/${barcode}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Barcode lookup failed')
  const data = await res.json()
  if (data.status !== 1) throw new Error('Product not found')
  return parseProduct(data.product)
}
