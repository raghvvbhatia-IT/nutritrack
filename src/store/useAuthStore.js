import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  dbReady: true, // false if profiles table doesn't exist

  init: async () => {
    try {
      const { data } = await supabase.auth.getSession()
      if (data?.session?.user) {
        await get().loadProfile(data.session.user)
      }
    } catch (e) {
      console.error('Auth init error:', e)
    } finally {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await get().loadProfile(session.user)
      } else {
        set({ user: null, profile: null })
      }
    })
  },

  loadProfile: async (user) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        set({ user, profile: data, dbReady: true })
        return
      }

      // Profile row missing (user signed up before schema was run)
      // Try to create it from auth metadata
      if (error?.code === 'PGRST116' || !data) {
        const meta = user.user_metadata || {}
        const { data: created, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: meta.full_name || user.email?.split('@')[0] || 'User',
            role: meta.role || 'client',
          })
          .select()
          .single()

        if (created) {
          set({ user, profile: created, dbReady: true })
          return
        }
        console.warn('Could not create profile:', insertError)
      }

      // Table likely doesn't exist yet
      set({ user, profile: null, dbReady: false })
    } catch (e) {
      console.error('loadProfile error:', e)
      set({ user, profile: null, dbReady: false })
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },

  signUp: async (email, password, fullName, role, inviteToken) => {
    const meta = { full_name: fullName, role }
    if (inviteToken) meta.invite_token = inviteToken
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    })
    return { data, error }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))

export default useAuthStore
