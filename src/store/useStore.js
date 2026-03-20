import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Exponential Moving Average for weight trend smoothing
function computeEMA(logs, alpha = 0.1) {
  if (!logs.length) return []
  const sorted = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date))
  const result = []
  let ema = sorted[0].weight
  for (const log of sorted) {
    ema = alpha * log.weight + (1 - alpha) * ema
    result.push({ date: log.date, raw: log.weight, trend: parseFloat(ema.toFixed(2)) })
  }
  return result
}

const useStore = create(
  persist(
    (set, get) => ({
      // --- FOOD LOGS ---
      // { [dateStr]: [{ id, name, brand, calories, protein, carbs, fat, quantity, meal }] }
      foodLogs: {},

      addFoodLog(dateStr, entry) {
        const logs = get().foodLogs
        const dayLogs = logs[dateStr] || []
        set({
          foodLogs: {
            ...logs,
            [dateStr]: [...dayLogs, { ...entry, id: Date.now() }],
          },
        })
      },

      removeFoodLog(dateStr, id) {
        const logs = get().foodLogs
        set({
          foodLogs: {
            ...logs,
            [dateStr]: (logs[dateStr] || []).filter((e) => e.id !== id),
          },
        })
      },

      getDayLogs(dateStr) {
        return get().foodLogs[dateStr] || []
      },

      getDayTotals(dateStr) {
        const logs = get().getDayLogs(dateStr)
        return logs.reduce(
          (acc, e) => ({
            calories: acc.calories + (e.calories || 0),
            protein: acc.protein + (e.protein || 0),
            carbs: acc.carbs + (e.carbs || 0),
            fat: acc.fat + (e.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )
      },

      // --- WEIGHT LOGS ---
      // [{ date: 'YYYY-MM-DD', weight: number }]
      weightLogs: [],

      addWeightLog(date, weight) {
        const logs = get().weightLogs.filter((l) => l.date !== date)
        set({ weightLogs: [...logs, { date, weight: parseFloat(weight) }] })
      },

      removeWeightLog(date) {
        set({ weightLogs: get().weightLogs.filter((l) => l.date !== date) })
      },

      getWeightTrend() {
        return computeEMA(get().weightLogs)
      },

      // --- GOALS ---
      goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
      setGoals(goals) {
        set({ goals })
      },
    }),
    { name: 'nutritrack-storage' }
  )
)

export default useStore
