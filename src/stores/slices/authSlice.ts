import type { User } from '@supabase/supabase-js'
import type { StateCreator } from 'zustand'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database'

export interface AuthState {
  user: User | null
  profile: Tables<'profiles'> | null
  loading: boolean
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const createAuthSlice: StateCreator<AuthState> = (set, get) => {
  // Carga el perfil del usuario y publica user+profile en el store.
  // Compartido por initialize, signIn y el listener de auth.
  const cargarPerfil = async (user: User) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      set({ user, profile: error ? null : profile, loading: false })
    } catch {
      set({ user, profile: null, loading: false })
    }
  }

  return {
    user: null,
    profile: null,
    loading: true,

    initialize: async () => {
      set({ loading: true })

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          await cargarPerfil(session.user)
        } else {
          set({ user: null, profile: null, loading: false })
        }
      } catch {
        set({ user: null, profile: null, loading: false })
      }

      // Suscribirse a cambios de auth para mantener el estado sincronizado.
      // PROHIBIDO hacer `await` de funciones de Supabase dentro de este
      // callback: el cliente de auth sostiene un lock interno mientras
      // notifica y toda query espera ese mismo lock → deadlock (todas las
      // queries de la app se congelan hasta recargar la página). La carga
      // del perfil se difiere con setTimeout para salir del lock.
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { user, profile } = get()
          // SIGNED_IN se re-emite al recuperar el foco de la pestaña; si ya
          // tenemos el perfil de este mismo usuario no hay nada que recargar.
          if (user?.id === session.user.id && profile !== null) return

          const usuario = session.user
          setTimeout(() => {
            void cargarPerfil(usuario)
          }, 0)
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null })
        }
      })
    },

    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // Cargar el perfil aquí mismo (fuera del listener) para que al resolver
      // signIn el rol ya esté en el store, sin esperas arbitrarias ni carreras.
      if (data.user) await cargarPerfil(data.user)
    },

    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      set({ user: null, profile: null })
    },
  }
}
