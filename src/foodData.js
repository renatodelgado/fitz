import tacoMainCsv from './taco-db-nutrientes.csv?raw'
import tacoMicrosCsv from './taco-db-nutrientes-2.csv?raw'

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && quoted && next === '"') {
      value += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(value.trim())
      value = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(value.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }

  if (value || row.length) {
    row.push(value.trim())
    rows.push(row)
  }

  return rows
}

function numberOrZero(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

const microRows = new Map(
  parseCsv(tacoMicrosCsv)
    .slice(1)
    .map((row) => [row[0], row])
)

export const TACO_FOODS = parseCsv(tacoMainCsv)
  .slice(1)
  .filter((row) => row[0] && row[1])
  .map((row) => {
    const micros = microRows.get(row[0]) ?? []
    return {
      id: `taco-${row[0]}`,
      source: 'TACO',
      name: row[1],
      servingGrams: 100,
      calories: numberOrZero(row[3]),
      protein: numberOrZero(row[5]),
      fat: numberOrZero(row[6]),
      carbs: numberOrZero(row[8]),
      fiber: numberOrZero(row[9]),
      sodium: numberOrZero(micros[4]),
      potassium: numberOrZero(micros[5]),
      searchName: normalizeSearch(row[1])
    }
  })

export function searchTaco(query, limit = 20) {
  const normalized = normalizeSearch(query)
  if (normalized.length < 2) return []

  return TACO_FOODS
    .filter((food) => food.searchName.includes(normalized))
    .sort((left, right) => {
      const leftStarts = left.searchName.startsWith(normalized) ? 0 : 1
      const rightStarts = right.searchName.startsWith(normalized) ? 0 : 1
      return leftStarts - rightStarts || left.name.localeCompare(right.name, 'pt-BR')
    })
    .slice(0, limit)
}

function nutrientValue(nutrients, nutrientNumber) {
  const item = nutrients?.find((nutrient) => String(nutrient.nutrientNumber) === nutrientNumber)
  return numberOrZero(item?.value)
}

export async function searchUsda(query, apiKey = 'DEMO_KEY') {
  const params = new URLSearchParams({
    api_key: apiKey || 'DEMO_KEY',
    query,
    pageSize: '12',
    dataType: 'Foundation,SR Legacy,Survey (FNDDS)'
  })
  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`)
  if (!response.ok) throw new Error('Não foi possível consultar o USDA.')
  const payload = await response.json()

  return (payload.foods ?? []).map((food) => ({
    id: `usda-${food.fdcId}`,
    source: 'USDA',
    name: food.description,
    servingGrams: 100,
    calories: nutrientValue(food.foodNutrients, '208'),
    protein: nutrientValue(food.foodNutrients, '203'),
    fat: nutrientValue(food.foodNutrients, '204'),
    carbs: nutrientValue(food.foodNutrients, '205')
  }))
}

export async function getOpenFoodFactsProduct(barcode) {
  const fields = [
    'code',
    'product_name',
    'product_name_pt',
    'brands',
    'serving_size',
    'nutriments',
    'image_front_small_url'
  ].join(',')
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v3.6/product/${encodeURIComponent(barcode)}.json?fields=${fields}`
  )
  if (!response.ok) throw new Error('Produto não encontrado no Open Food Facts.')
  const payload = await response.json()
  const product = payload.product
  if (!product) throw new Error('Produto não encontrado no Open Food Facts.')
  const nutrients = product.nutriments ?? {}

  return {
    id: `off-${product.code ?? barcode}`,
    source: 'Open Food Facts',
    barcode: product.code ?? barcode,
    name: product.product_name_pt || product.product_name || `Produto ${barcode}`,
    brand: product.brands ?? '',
    servingGrams: 100,
    calories: numberOrZero(nutrients['energy-kcal_100g']),
    protein: numberOrZero(nutrients.proteins_100g),
    fat: numberOrZero(nutrients.fat_100g),
    carbs: numberOrZero(nutrients.carbohydrates_100g),
    fiber: numberOrZero(nutrients.fiber_100g),
    sodium: numberOrZero(nutrients.sodium_100g) * 1000,
    image: product.image_front_small_url ?? ''
  }
}

export function scaleFood(food, grams) {
  const factor = Number(grams) / (food.servingGrams || 100)
  return {
    calories: food.calories * factor,
    protein: food.protein * factor,
    fat: food.fat * factor,
    carbs: food.carbs * factor
  }
}
