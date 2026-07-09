import { create } from 'zustand'
import { createAuthSlice, type AuthState } from './slices/authSlice'
import { createEdicionSlice, type EdicionState } from './slices/edicionSlice'

// El store combina todos los slices del dominio
type AppStore = AuthState & EdicionState

export const useAppStore = create<AppStore>()((...args) => ({
  ...createAuthSlice(...args),
  ...createEdicionSlice(...args),
}))
