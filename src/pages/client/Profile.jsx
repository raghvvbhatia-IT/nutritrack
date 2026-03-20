import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/useAuthStore'

export default function Profile() {
  const { user, profile, dbReady, signOut, loadProfile } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [coachName, setCoachName] = useState('')
  const [invites, setInvites] = useState([])
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteStatus, setInviteStatus] = useState(null) // { type: 'error'|'success', msg }
  const [redeeming, setRedeeming] = useState(false)

  // For clients: fetch coach name
  useEffect(() => {
    if (!profile || profile.role !== 'client' || !profile.coach_id) return
    supabase.from('profiles').select('full_name').eq('id', profile.coach_id).single()
      .then(({ data }) => { if (data) setCoachName(data.full_name) })
  }, [profile])

  // For coaches: fetch invites
  useEffect(() => {
    if (!profile || profile.role !== 'coach') return
    fetchInvites()
  }, [profile])

  // Auto-redeem invite token from URL (e.g. logged-in user opens invite link)
  useEffect(() => {
    const token = searchParams.get('invite')
    if (!token || !profile || profile.role !== 'client' || profile.coach_id) return
    setSearchParams({}, { replace: true }) // remove ?invite from URL
    setInviteCode(token)
    // Trigger redemption automatically
    redeemWithToken(token)
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  function fetchInvites() {
    supabase.from('invites')
      .select('*')
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setInvites(data || []))
  }

  async function generateInvite() {
    if (!profile) return
    setGenerating(true)
    const { data } = await supabase
      .from('invites')
      .insert({ coach_id: profile.id, coach_name: profile.full_name })
      .select()
      .single()
    if (data) setInvites((prev) => [data, ...prev])
    setGenerating(false)
  }

  function getInviteUrl(token) {
    const base = window.location.href.split('#')[0]
    return `${base}#/signup?invite=${token}`
  }

  async function shareLink(token) {
    const url = getInviteUrl(token)
    const text = `${profile?.full_name || 'Your coach'} has invited you to NutriTrack. Sign up here to connect:`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NutriTrack Invite', text, url })
        return
      } catch (e) {
        if (e.name === 'AbortError') return // user cancelled
      }
    }
    // Fallback: copy to clipboard
    copyLink(token)
  }

  function copyLink(token) {
    const url = getInviteUrl(token)
    navigator.clipboard.writeText(url).catch(() => {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
    setCopied(token)
    setTimeout(() => setCopied(''), 2500)
  }

  async function deleteInvite(id) {
    await supabase.from('invites').delete().eq('id', id)
    setInvites((prev) => prev.filter((i) => i.id !== id))
  }

  async function redeemWithToken(code) {
    setRedeeming(true)
    setInviteStatus(null)

    const { data: invite, error: lookupErr } = await supabase
      .from('invites')
      .select('id, coach_id, coach_name, used')
      .eq('token', code)
      .single()

    if (lookupErr || !invite) {
      setInviteStatus({ type: 'error', msg: 'Invite code not found. Check the code and try again.' })
      setRedeeming(false)
      return
    }
    if (invite.used) {
      setInviteStatus({ type: 'error', msg: 'This invite code has already been used.' })
      setRedeeming(false)
      return
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ coach_id: invite.coach_id })
      .eq('id', profile.id)

    if (profileErr) {
      setInviteStatus({ type: 'error', msg: 'Failed to connect. Please try again.' })
      setRedeeming(false)
      return
    }

    await supabase
      .from('invites')
      .update({ used: true, used_by: profile.id })
      .eq('id', invite.id)

    setInviteStatus({ type: 'success', msg: `Connected to ${invite.coach_name || 'your coach'}!` })
    setInviteCode('')
    setRedeeming(false)
    loadProfile(user)
  }

  async function redeemInvite(e) {
    e.preventDefault()
    const code = inviteCode.trim()
    if (!code) return
    redeemWithToken(code)
  }

  // ── DB not set up yet ──────────────────────────────────────
  if (!dbReady || !profile) {
    return (
      <div className="flex flex-col h-full overflow-y-auto pb-24">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
        </div>
        <div className="mx-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-4">
          <div className="text-amber-400 font-semibold mb-2">⚠️ Database not set up</div>
          <p className="text-slate-300 text-sm mb-4">
            You need to run the database schema in Supabase before using the app.
          </p>
          <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside mb-4">
            <li>Open <span className="text-emerald-400">supabase.com/dashboard</span></li>
            <li>Go to your project → SQL Editor → New query</li>
            <li>Paste the contents of <span className="font-mono text-slate-300">schema.sql</span></li>
            <li>Click Run</li>
          </ol>
          <button
            onClick={() => user && loadProfile(user)}
            className="w-full bg-emerald-500 text-white font-semibold py-3 rounded-xl"
          >
            Retry after running schema
          </button>
        </div>
        <div className="mx-4">
          <button onClick={signOut} className="w-full bg-slate-800 text-red-400 font-semibold py-3.5 rounded-2xl border border-slate-700">
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  const isCoach = profile.role === 'coach'

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
      </div>

      {/* User info card */}
      <div className="mx-4 bg-slate-800 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {profile.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-semibold text-white text-lg">{profile.full_name}</div>
            <div className="text-slate-400 text-sm">{user?.email}</div>
            <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block font-medium ${
              isCoach ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isCoach ? '📋 Coach' : '🏃 Athlete'}
            </div>
          </div>
        </div>
      </div>

      {/* ── ATHLETE: coach info ── */}
      {!isCoach && (
        <div className="mx-4 bg-slate-800 rounded-2xl p-4 mb-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Your Coach</div>
          {profile.coach_id ? (
            <div className="font-semibold text-white">{coachName || 'Loading...'}</div>
          ) : (
            <div>
              <div className="text-slate-400 text-sm mb-4">
                No coach connected yet. Enter your invite code below to connect.
              </div>
              <form onSubmit={redeemInvite} className="space-y-3">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value); setInviteStatus(null) }}
                  placeholder="Paste invite code here"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
                />
                {inviteStatus && (
                  <div className={`text-sm rounded-xl px-4 py-3 ${
                    inviteStatus.type === 'error'
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  }`}>
                    {inviteStatus.msg}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={redeeming || !inviteCode.trim()}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {redeeming ? 'Connecting...' : 'Connect to Coach'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── COACH: invite management ── */}
      {isCoach && (
        <div className="mx-4 mb-4">
          {/* Section header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-white">Client Invite Links</h2>
              <p className="text-xs text-slate-400 mt-0.5">Share a link with your client to connect them to your account</p>
            </div>
          </div>

          {/* Generate button — prominent */}
          <button
            onClick={generateInvite}
            disabled={generating}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl mb-4 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-xl leading-none">+</span>
            {generating ? 'Generating...' : 'Generate New Invite Link'}
          </button>

          {/* Invite list */}
          {invites.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-5 text-center">
              <div className="text-3xl mb-2">🔗</div>
              <div className="text-slate-400 text-sm">No invite links yet.<br/>Generate one above to share with your client.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${inv.used ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {inv.used ? 'Used' : 'Active'}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-slate-500 truncate">{inv.token}</div>
                  </div>
                  {!inv.used && (
                    <div className="flex gap-1.5 shrink-0">
                      {/* Share — opens native share sheet on iOS/Android */}
                      <button
                        onClick={() => shareLink(inv.token)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
                        Send
                      </button>
                      {/* Copy fallback */}
                      <button
                        onClick={() => copyLink(inv.token)}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                          copied === inv.token ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {copied === inv.token ? '✓' : '⎘'}
                      </button>
                    </div>
                  )}
                  <button onClick={() => deleteInvite(inv.id)} className="text-slate-600 hover:text-red-400 p-1 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sign out */}
      <div className="mx-4">
        <button
          onClick={signOut}
          className="w-full bg-slate-800 hover:bg-slate-700 active:bg-red-500/20 text-red-400 font-semibold py-3.5 rounded-2xl border border-slate-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
