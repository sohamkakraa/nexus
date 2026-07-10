import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '../../src/renderer/src/App'
import '../../src/renderer/src/styles.css'
import { createMockNexus } from './mockNexus'
import { PERSONAS, type PersonaId } from './personas'

const parameters = new URLSearchParams(window.location.search)
const requested = parameters.get('persona') as PersonaId | null
const basePersona = requested && requested in PERSONAS ? PERSONAS[requested] : PERSONAS.researcher
const persona = {
  ...basePersona,
  snapshot: structuredClone(basePersona.snapshot),
  behavior: {
    ...basePersona.behavior,
    ...(parameters.get('delay') ? { snapshotDelayMs: Number(parameters.get('delay')) } : {}),
    ...(parameters.get('snapshotError') ? { snapshotError: parameters.get('snapshotError') ?? undefined } : {})
  }
}
const mock = createMockNexus(persona)

if (persona.behavior?.offline) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false })
}

Object.assign(window, {
  __nexusMockCalls: mock.calls,
  __nexusMockSnapshot: mock.snapshot
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App api={mock.api} />
  </React.StrictMode>
)
