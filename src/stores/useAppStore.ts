import { create } from 'zustand'
import { createAuthSlice, type AuthState } from './slices/authSlice'

// El store combina todos los slices del dominio
type AppStore = AuthState

export const useAppStore = create<AppStore>()((...args) => ({
  ...createAuthSlice(...args),
}))
