import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/useAuthStore'
import { todayStr, formatShortDate } from '../../utils/date'

function computeEMA(logs, alpha = 0.1) {
  if (!logs.length) return []
  const sorted = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date))
  let ema = sorted[0].weight
  return sorted.map((log) => {
    ema = alpha * log.weight + (1 - alpha) * ema
    return { date: log.date, raw: log.weight, trend: parseFloat(ema.toFixed(2)) }
  })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 text-sm">
      <div className="text-slate-400 mb-1">{formatShortDate(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: <span className="font-semibold">{p.value} kg</span></div>
      ))}
    </div>
  )
}

export default function WeightTracker() {
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [date, setDate] = useState(todayStr())
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date')
    setLogs(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function handleLog() {
    const w = parseFloat(input)
    if (!w || w < 20 || w > 500) return
    await supabase.from('weight_logs').upsert({ user_id: user.id, date, weight: w }, { onConflict: 'user_id,date' })
    setInput('')
    fetchLogs()
  }

  async function removeLog(id) {
    await supabase.from('weight_logs').delete().eq('id', id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  const trend = computeEMA(logs)
  const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date))
  const chartData = trend.slice(-60).map((t) => ({ date: t.date, Raw: t.raw, Trend: t.trend }))
  const latestTrend = trend[trend.length - 1]?.trend
  const weekAgoTrend = trend.length >= 8 ? trend[trend.length - 8]?.trend : trend[0]?.trend
  const weekChange = latestTrend && weekAgoTrend ? parseFloat((latestTrend - weekAgoTrend).toFixed(2)) : null

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-white">Weight</h1>
        <p className="text-sm text-slate-400">EMA trend smoothing (α = 0.1)</p>
      </div>

      {/* Stats */}
      {trend.length > 0 && (
        <div className="px-4 grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Current', value: `${latestTrend} kg`, color: 'text-white' },
            { label: '7d Change', value: weekChange === null ? '—' : `${weekChange > 0 ? '+' : ''}${weekChange} kg`, color: weekChange === null ? 'text-slate-400' : weekChange < 0 ? 'text-emerald-400' : weekChange > 0 ? 'text-red-400' : 'text-slate-300' },
            { label: 'Entries', value: logs.length, color: 'text-white' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800 rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-400 mb-1">{label}</div>
              <div className={`text-lg font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="mx-4 bg-slate-800 rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Weight Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Line type="monotone" dataKey="Raw" stroke="#64748b" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="Trend" stroke="#10b981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mx-4 bg-slate-800 rounded-2xl p-8 mb-4 text-center">
          <div className="text-4xl mb-2">⚖️</div>
          <div className="text-slate-400 text-sm">Log at least 2 weights to see your trend chart</div>
        </div>
      )}

      {/* Log form */}
      <div className="mx-4 bg-slate-800 rounded-2xl p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Log Weight</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Weight (kg)</label>
            <div className="flex gap-2">
              <input type="number" placeholder="e.g. 75.5" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLog()}
                className="flex-1 bg-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
                step="0.1" min="20" max="500" />
              <button onClick={handleLog} className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-semibold px-5 rounded-xl">Log</button>
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
            const te = trend.find((t) => t.date === log.date)
            return (
              <div key={log.id} className="flex items-center px-4 py-3 border-b border-slate-700 last:border-0">
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{formatShortDate(log.date)}</div>
                  {te && <div className="text-xs text-slate-400">Trend: <span className="text-emerald-400">{te.trend} kg</span></div>}
                </div>
                <div className="text-white font-semibold mr-4">{log.weight} kg</div>
                <button onClick={() => removeLog(log.id)} className="text-slate-600 hover:text-red-400 p-1">
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
