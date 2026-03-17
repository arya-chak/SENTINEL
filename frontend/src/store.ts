import { create } from 'zustand'
import type { Entity, SimState } from './types'

const TRAIL_MAX = 15  // 15 ticks × 2s = 30 seconds of history

interface SentinelStore {
  entities: Entity[]
  simState: SimState | null
  selectedEntityId: string | null
  positionHistory: Record<string, Array<{ lat: number; lon: number }>>
  setEntities: (entities: Entity[]) => void
  setSimState: (simState: SimState) => void
  setSelected: (id: string | null) => void
}

export const useSentinelStore = create<SentinelStore>((set) => ({
  entities: [],
  simState: null,
  selectedEntityId: null,
  positionHistory: {},
  setEntities: (entities) =>
    set((state) => {
      const next: Record<string, Array<{ lat: number; lon: number }>> = {
        ...state.positionHistory,
      }
      for (const e of entities) {
        const prev = next[e.id] ?? []
        const tail = prev.slice(-(TRAIL_MAX - 1))
        next[e.id] = [...tail, { lat: e.lat, lon: e.lon }]
      }
      // Drop history for entities that no longer exist
      const ids = new Set(entities.map((e) => e.id))
      for (const id of Object.keys(next)) {
        if (!ids.has(id)) delete next[id]
      }
      return { entities, positionHistory: next }
    }),
  setSimState: (simState) => set({ simState }),
  setSelected: (id) => set({ selectedEntityId: id }),
}))