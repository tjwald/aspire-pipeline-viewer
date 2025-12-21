/**
 * Service factory for web frontend
 * Detects Electron environment and creates appropriate service container
 */
import type { ServiceContainer } from '@/core'
import { createElectronServiceContainer } from './electronAdapter'
import { createMockServiceContainer } from './mockAdapter'

export function createWebServiceContainer(): ServiceContainer {
  // Check if running in Electron (has electronAPI in window)
  // @ts-expect-error
  if (typeof window !== 'undefined' && window.electronAPI) {
    return createElectronServiceContainer()
  }
  // Default to mock for pure browser/web context
  return createMockServiceContainer()
}

export { createElectronServiceContainer, createMockServiceContainer }
export type { ServiceContainer }
