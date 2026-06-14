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
    records: []
  }
}

export function readStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.version === 2 && Array.isArray(saved.profiles)) {
      return saved
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY))
    if (legacy?.data) {
      const profile = createProfile('Meu perfil', legacy.data)
      return {
        version: 2,
        activeProfileId: profile.id,
        profiles: [profile]
      }
    }
  } catch {
    // A malformed local value should not prevent the app from opening.
  }

  return {
    version: 2,
    activeProfileId: null,
    profiles: []
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
    macros: {
      carbs: results.macros[0].grams,
      protein: results.macros[1].grams,
      fat: results.macros[2].grams
    }
  }
}
