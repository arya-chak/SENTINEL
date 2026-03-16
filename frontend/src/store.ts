import { create } from 'zustand'
import type { Entity, SimState } from './types'

interface SentinelStore {
  entities: Entity[]
  simState: SimState | null
  selectedEntityId: string | null
  setEntities: (entities: Entity[]) => void
  setSimState: (simState: SimState) => void
  setSelected: (id: string | null) => void
}

export const useSentinelStore = create<SentinelStore>((set) => ({
  entities: [],
  simState: null,
  selectedEntityId: null,
  setEntities: (entities) => set({ entities }),
  setSimState: (simState) => set({ simState }),
  setSelected: (id) => set({ selectedEntityId: id }),
}))
