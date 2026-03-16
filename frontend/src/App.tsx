import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import Header from './components/Header'
import TargetQueue from './components/TargetQueue'
import MapView from './components/MapView'
import DossierPanel from './components/DossierPanel'
import { useSentinelStore } from './store'
import { api } from './api'

function App() {
  const setEntities = useSentinelStore(s => s.setEntities)
  const setSimState = useSentinelStore(s => s.setSimState)

  const { data: entities } = useQuery({
    queryKey: ['entities'],
    queryFn: api.getEntities,
    refetchInterval: 2000,
  })

  const { data: simState } = useQuery({
    queryKey: ['simState'],
    queryFn: api.getSimState,
    refetchInterval: 5000,
  })

  useEffect(() => {
    if (entities) setEntities(entities)
  }, [entities, setEntities])

  useEffect(() => {
    if (simState) setSimState(simState)
  }, [simState, setSimState])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#0a0a0f',
    }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <TargetQueue />
        <MapView />
      </div>
      <DossierPanel />
    </div>
  )
}

export default App
