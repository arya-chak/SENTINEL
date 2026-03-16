import Map, { Source, Layer, type MapLayerMouseEvent } from 'react-map-gl/maplibre'
import type { LayerSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useSentinelStore } from '../store'
import type { Entity } from '../types'

const TYPE_COLOR: Record<string, string> = {
  hostile:   '#E24B4A',
  ambiguous: '#EF9F27',
  friendly:  '#378ADD',
  civilian:  '#888780',
}

function entitiesToGeoJSON(entities: Entity[], selectedId: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: entities.map(e => ({
      type: 'Feature' as const,
      id: e.id,
      geometry: { type: 'Point' as const, coordinates: [e.lon, e.lat] },
      properties: {
        id: e.id,
        entity_type: e.entity_type,
        color: TYPE_COLOR[e.entity_type] ?? '#888780',
        selected: e.id === selectedId ? 1 : 0,
        radius: e.id === selectedId ? 10 : 7,
        unit_name: e.unit_name ?? '',
        status: e.status,
        heading: e.heading,
      }
    }))
  }
}

function friendlyArrowsGeoJSON(entities: Entity[]) {
  const friendlies = entities.filter(e => e.entity_type === 'friendly')
  return {
    type: 'FeatureCollection' as const,
    features: friendlies.map(e => {
      const rad = (e.heading * Math.PI) / 180
      const len = 0.008
      const endLon = e.lon + Math.sin(rad) * len
      const endLat = e.lat + Math.cos(rad) * len
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [[e.lon, e.lat], [endLon, endLat]]
        },
        properties: {}
      }
    })
  }
}

const circleLayer: LayerSpecification = {
  id: 'entities-circle',
  type: 'circle',
  source: 'entities',
  paint: {
    'circle-radius': ['get', 'radius'],
    'circle-color': ['get', 'color'],
    'circle-opacity': 0.9,
    'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 2.5, 1],
    'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], '#ffffff', '#00000044'],
  }
}

const arrowLayer: LayerSpecification = {
  id: 'friendly-arrows',
  type: 'line',
  source: 'friendly-arrows',
  paint: {
    'line-color': '#378ADD',
    'line-width': 1.5,
    'line-opacity': 0.7,
  }
}

export default function MapView() {
  const entities = useSentinelStore(s => s.entities)
  const selectedId = useSentinelStore(s => s.selectedEntityId)
  const setSelected = useSentinelStore(s => s.setSelected)

  const geojson = entitiesToGeoJSON(entities, selectedId)
  const arrowsGeojson = friendlyArrowsGeoJSON(entities)

  function handleClick(e: MapLayerMouseEvent) {
    const features = e.features
    if (features && features.length > 0) {
      const id = features[0].properties?.id
      if (id) setSelected(id)
    } else {
      setSelected(null)
    }
  }

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <Map
        initialViewState={{
          longitude: 43.75,
          latitude: 33.75,
          zoom: 9,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json"
        onClick={handleClick}
        interactiveLayerIds={['entities-circle']}
      >
        <Source id="friendly-arrows" type="geojson" data={arrowsGeojson}>
          <Layer {...arrowLayer} />
        </Source>

        <Source id="entities" type="geojson" data={geojson}>
          <Layer {...circleLayer} />
        </Source>
      </Map>
    </div>
  )
}
