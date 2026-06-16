export const INITIAL_DATA = {
  sex: '',
  weight: '',
  height: '',
  age: '',
  activity: null,
  deficit: 300,
  targetWeight: 2
}

const STORAGE_KEY = 'fitz-data'
const LEGACY_KEY = 'fitz-state'

function createId() {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createProfile(name, data = INITIAL_DATA) {
  return {
    id: createId(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    data: { ...INITIAL_DATA, ...data },
    records: [],
    foodDiary: {},
    customFoods: [],
    settings: { usdaApiKey: '' }
  }
}

export function readStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.version >= 2 && Array.isArray(saved.profiles)) {
      return {
        ...saved,
        version: 3,
        profiles: saved.profiles.map((profile) => ({
          ...profile,
          foodDiary: profile.foodDiary ?? {},
          customFoods: profile.customFoods ?? [],
          settings: { usdaApiKey: '', ...profile.settings }
        }))
      }
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY))
    if (legacy?.data) {
      const profile = createProfile('Meu perfil', legacy.data)
      return {
        version: 3,
        activeProfileId: profile.id,
        profiles: [profile]
      }
    }
  } catch {
    // A malformed local value should not prevent the app from opening.
  }

  return {
    version: 3,
    activeProfileId: null,
    profiles: []
  }
}

export function createFoodEntry(food, grams, period) {
  const factor = Number(grams) / (food.servingGrams || 100)
  return {
    id: createId(),
    foodId: food.id,
    name: food.name,
    source: food.source,
    period,
    grams: Number(grams),
    calories: Number(food.calories || 0) * factor,
    protein: Number(food.protein || 0) * factor,
    carbs: Number(food.carbs || 0) * factor,
    fat: Number(food.fat || 0) * factor,
    addedAt: new Date().toISOString()
  }
}

export function createCustomFood(values) {
  return {
    id: createId(),
    source: 'Local',
    name: values.name.trim(),
    servingGrams: Number(values.servingGrams) || 100,
    calories: Number(values.calories) || 0,
    protein: Number(values.protein) || 0,
    carbs: Number(values.carbs) || 0,
    fat: Number(values.fat) || 0,
    barcode: values.barcode?.trim() ?? '',
    createdAt: new Date().toISOString()
  }
}

export function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  localStorage.removeItem(LEGACY_KEY)
}

export function createRecord(data, results) {
  const heightInMeters = Number(data.height) / 100

  return {
    id: createId(),
    recordedAt: new Date().toISOString(),
    weight: Number(data.weight),
    bmi: Number(data.weight) / heightInMeters ** 2,
    bmr: results.bmr,
    maintenance: results.maintenance,
    calories: results.calories,
    targetWeight: results.targetWeight,
    macros: {
      carbs: results.macros[0].grams,
      protein: results.macros[1].grams,
      fat: results.macros[2].grams
    }
  }
}
