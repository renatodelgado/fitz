const DAY_MS = 24 * 60 * 60 * 1000

function linearRegression(points) {
  const count = points.length
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / count
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / count
  const numerator = points.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.y - meanY),
    0
  )
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0)
  return denominator ? numerator / denominator : 0
}

export function getWeightProjection(profile, targetWeight) {
  const records = [...(profile.records ?? [])]
    .filter((record) => Number.isFinite(record.weight) && record.recordedAt)
    .sort((left, right) => new Date(left.recordedAt) - new Date(right.recordedAt))

  if (records.length < 2) {
    return { status: 'insufficient', message: 'Registre o peso em pelo menos dois dias diferentes.' }
  }

  const firstDate = new Date(records[0].recordedAt).getTime()
  const points = records.map((record) => ({
    x: (new Date(record.recordedAt).getTime() - firstDate) / DAY_MS,
    y: Number(record.weight)
  }))
  const dailyRate = linearRegression(points)
  const currentWeight = records.at(-1).weight
  const remaining = Number(targetWeight) - currentWeight

  if (Math.abs(dailyRate) < 0.005) {
    return { status: 'stable', currentWeight, dailyRate, message: 'A tendência atual está estável demais para estimar uma data.' }
  }
  if (remaining !== 0 && Math.sign(remaining) !== Math.sign(dailyRate)) {
    return { status: 'away', currentWeight, dailyRate, message: 'A tendência histórica está se afastando desse peso.' }
  }

  const days = Math.max(0, remaining / dailyRate)
  const projectedDate = new Date(new Date(records.at(-1).recordedAt).getTime() + days * DAY_MS)
  return {
    status: 'projected',
    currentWeight,
    dailyRate,
    weeklyRate: dailyRate * 7,
    days,
    projectedDate
  }
}

export function getDiaryAverage(profile, days = 14) {
  const diary = profile.foodDiary ?? {}
  const dates = Object.keys(diary).sort().slice(-days)
  const totals = dates.map((date) => Object.values(diary[date] ?? {})
    .flat()
    .reduce((sum, entry) => sum + Number(entry.calories || 0), 0))
    .filter((total) => total > 0)

  if (!totals.length) return null
  return totals.reduce((sum, total) => sum + total, 0) / totals.length
}
