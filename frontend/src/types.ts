export interface SensorEvent {
  signal_type: string
  value: number
  timestamp: number
}

export interface Entity {
  id: string
  entity_type: 'hostile' | 'friendly' | 'civilian' | 'ambiguous'
  lat: number
  lon: number
  speed: number
  heading: number
  distance_to_hostile_zone: number
  pattern_of_life_deviation: number
  status: string
  unit_name: string | null
  command: string | null
  assigned_target_id: string | null
  sensor_events: SensorEvent[]
  intel_report: string
  time_alive: number
  decision: string | null
}

export interface SimState {
  sim_time: number
  running: boolean
  entity_count: number
  hostile_count: number
  friendly_count: number
  civilian_count: number
  ambiguous_count: number
  decisions_made: number
}
