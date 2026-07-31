import { create } from 'zustand'
import { createAuthSlice, type AuthState } from './slices/authSlice'
import { createEdicionSlice, type EdicionState } from './slices/edicionSlice'
import { createAnuncioSlice, type AnuncioState } from './slices/anuncioSlice'

// El store combina todos los slices del dominio
type AppStore = AuthState & EdicionState & AnuncioState

export const useAppStore = create<AppStore>()((...args) => ({
  ...createAuthSlice(...args),
  ...createEdicionSlice(...args),
  ...createAnuncioSlice(...args),
}))
