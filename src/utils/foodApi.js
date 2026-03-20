// Open Food Facts API - free, no key needed
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

export async function searchFoods(query) {
  if (!query.trim()) return []
  const url = `${BASE}/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=code,product_name,product_name_en,brands,nutriments,serving_size&page_size=20&sort_by=unique_scans_n`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Search failed')
  const data = await res.json()
  return (data.products || [])
    .filter((p) => p.product_name && p.nutriments?.['energy-kcal_100g'])
    .map(parseProduct)
}

export async function getByBarcode(barcode) {
  const url = `${BASE}/api/v0/product/${barcode}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Barcode lookup failed')
  const data = await res.json()
  if (data.status !== 1) throw new Error('Product not found')
  return parseProduct(data.product)
}
