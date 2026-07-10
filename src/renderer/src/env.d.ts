import type { NexusApi } from '../../shared/contracts'

declare global {
  interface Window {
    nexus: NexusApi
  }
}

export {}
