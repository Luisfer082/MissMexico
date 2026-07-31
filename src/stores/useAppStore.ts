import { create } from 'zustand'
import { createAuthSlice, type AuthState } from './slices/authSlice'
import { createEdicionSlice, type EdicionState } from './slices/edicionSlice'
import { createAnuncioSlice, type AnuncioState } from './slices/anuncioSlice'
import { createDirectorSlice, type DirectorState } from './slices/directorSlice'

// El store combina todos los slices del dominio
type AppStore = AuthState & EdicionState & AnuncioState & DirectorState

export const useAppStore = create<AppStore>()((...args) => ({
  ...createAuthSlice(...args),
  ...createEdicionSlice(...args),
  ...createAnuncioSlice(...args),
  ...createDirectorSlice(...args),
}))
