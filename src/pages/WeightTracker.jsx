import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import useStore from '../store/useStore'
import { todayStr, formatShortDate } from '../utils/date'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 text-sm">
      <div className="text-slate-400 mb-1">{formatShortDate(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value} kg</span>
        </div>
      ))}
    </div>
  )
}

export default function WeightTracker() {
  const [input, setInput] = useState('')
  const [date, setDate] = useState(todayStr())
  const addWeightLog = useStore((s) => s.addWeightLog)
  const removeWeightLog = useStore((s) => s.removeWeightLog)
  const weightLogs = useStore((s) => s.weightLogs)
  const getWeightTrend = useStore((s) => s.getWeightTrend)

  const trend = getWeightTrend()
  const sorted = [...weightLogs].sort((a, b) => new Date(b.date) - new Date(a.date))

  // Chart data — last 60 entries
  const chartData = trend.slice(-60).map((t) => ({
    date: t.date,
    Raw: t.raw,
    Trend: t.trend,
  }))

  // Stats
  const latestTrend = trend[trend.length - 1]?.trend
  const earliestTrend = trend.length >= 7 ? trend[trend.length - 8]?.trend : trend[0]?.trend
  const weekChange = latestTrend && earliestTrend
    ? parseFloat((latestTrend - earliestTrend).toFixed(2))
    : null

  function handleLog() {
    const w = parseFloat(input)
    if (!w || w < 20 || w > 500) return
    addWeightLog(date, w)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-white">Weight Tracker</h1>
        <p className="text-sm text-slate-400">EMA trend smoothing (α = 0.1)</p>
      </div>

      {/* Stats row */}
      {trend.length > 0 && (
        <div className="px-4 grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-800 rounded-2xl p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">Current</div>
            <div className="text-lg font-bold text-white">{latestTrend} <span className="text-sm text-slate-400">kg</span></div>
          </div>
          <div className="bg-slate-800 rounded-2xl p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">7d Change</div>
            <div className={`text-lg font-bold ${weekChange === null ? 'text-slate-400' : weekChange < 0 ? 'text-emerald-400' : weekChange > 0 ? 'text-red-400' : 'text-slate-300'}`}>
              {weekChange === null ? '—' : (weekChange > 0 ? '+' : '') + weekChange} <span className="text-sm">kg</span>
            </div>
          </div>
          <div className="bg-slate-800 rounded-2xl p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">Entries</div>
            <div className="text-lg font-bold text-white">{weightLogs.length}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="mx-4 bg-slate-800 rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Weight Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Line
                type="monotone"
                dataKey="Raw"
                stroke="#64748b"
                strokeWidth={1}
                dot={false}
                name="Raw"
              />
              <Line
                type="monotone"
                dataKey="Trend"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                name="Trend"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Green line = EMA smoothed trend · removes daily noise
          </p>
        </div>
      ) : (
        <div className="mx-4 bg-slate-800 rounded-2xl p-8 mb-4 text-center">
          <div className="text-4xl mb-2">⚖️</div>
          <div className="text-slate-400 text-sm">Log at least 2 weights to see your trend chart</div>
        </div>
      )}

      {/* Log weight form */}
      <div className="mx-4 bg-slate-800 rounded-2xl p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Log Weight</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Weight (kg)</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="e.g. 75.5"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLog()}
                className="flex-1 bg-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
                step="0.1"
                min="20"
                max="500"
              />
              <button
                onClick={handleLog}
                className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-semibold px-5 rounded-xl transition-colors"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      {sorted.length > 0 && (
        <div className="mx-4 bg-slate-800 rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300">History</h3>
          </div>
          {sorted.slice(0, 30).map((log) => {
            const trendEntry = trend.find((t) => t.date === log.date)
            return (
              <div key={log.date} className="flex items-center px-4 py-3 border-b border-slate-700 last:border-0">
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{formatShortDate(log.date)}</div>
                  {trendEntry && (
                    <div className="text-xs text-slate-400">
                      Trend: <span className="text-emerald-400">{trendEntry.trend} kg</span>
                    </div>
                  )}
                </div>
                <div className="text-white font-semibold mr-4">{log.weight} kg</div>
                <button
                  onClick={() => removeWeightLog(log.date)}
                  className="text-slate-600 hover:text-red-400 active:text-red-500 p-1"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
