export const ACTIVITY_LEVELS = [
  {
    label: 'Sedentário',
    detail: 'Pouco ou nenhum exercício físico',
    frequency: '0x por semana',
    factor: 1.2001177163
  },
  {
    label: 'Levemente ativo',
    detail: 'Exercícios leves de 1 a 3 vezes',
    frequency: '1–3x por semana',
    factor: 1.37492642731
  },
  {
    label: 'Moderadamente ativo',
    detail: 'Exercícios regulares de 4 a 5 vezes',
    frequency: '4–5x por semana',
    factor: 1.46497939965
  },
  {
    label: 'Muito ativo',
    detail: 'Exercícios diários ou intensos de 3 a 4 vezes',
    frequency: 'Quase todos os dias',
    factor: 1.54973513832
  },
  {
    label: 'Intensamente ativo',
    detail: 'Exercícios intensos de 6 a 7 vezes',
    frequency: '6–7x por semana',
    factor: 1.72454384932
  },
  {
    label: 'Extremamente ativo',
    detail: 'Exercícios muito intensos diariamente',
    frequency: 'Treino intenso diário',
    factor: 1.89994114185
  }
]

export const TARGET_BMIS = [18.5, 20.1, 21.7, 23.3, 24.9]

export function calculateBmr({ sex, weight, height, age }) {
  const base = 10 * weight + 6.25 * height - 5 * age
  return sex === 'M' ? base + 5 : base - 161
}

export function getTargetWeights(height) {
  const heightInMeters = height / 100
  return TARGET_BMIS.map((bmi) => ({
    bmi,
    weight: bmi * heightInMeters ** 2
  }))
}

export function calculateResults(data) {
  const bmr = calculateBmr(data)
  const maintenance = bmr * ACTIVITY_LEVELS[data.activity].factor
  const calories = maintenance - data.deficit
  const target = getTargetWeights(data.height)[data.targetWeight]
  const protein = target.weight * (data.sex === 'M' ? 2 : 1.6)
  const fat = target.weight
  const proteinCalories = protein * 4
  const fatCalories = fat * 9
  const carbCalories = calories - proteinCalories - fatCalories
  const carbs = carbCalories / 4

  return {
    bmr,
    maintenance,
    calories,
    targetWeight: target.weight,
    targetBmi: target.bmi,
    macros: [
      {
        name: 'Carboidratos',
        shortName: 'Carbo',
        grams: carbs,
        calories: carbCalories,
        percentage: (carbCalories / calories) * 100,
        color: '#e8a23a'
      },
      {
        name: 'Proteínas',
        shortName: 'Proteína',
        grams: protein,
        calories: proteinCalories,
        percentage: (proteinCalories / calories) * 100,
        color: '#ef765c'
      },
      {
        name: 'Gorduras',
        shortName: 'Gordura',
        grams: fat,
        calories: fatCalories,
        percentage: (fatCalories / calories) * 100,
        color: '#2f7d68'
      }
    ]
  }
}
