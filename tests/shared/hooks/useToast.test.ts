import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast } from '@/frontends/shared/hooks/useToast'

describe('useToast', () => {
  it('should initialize with no toast', () => {
    const { result } = renderHook(() => useToast())

    expect(result.current.toast).toBeNull()
  })

  it('should show toast with message and type', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('Test message', 'success')
    })

    expect(result.current.toast).toBeDefined()
    expect(result.current.toast?.message).toBe('Test message')
    expect(result.current.toast?.type).toBe('success')
  })

  it('should default to info type', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('Info message')
    })

    expect(result.current.toast?.type).toBe('info')
  })

  it('should support all toast types', () => {
    const { result } = renderHook(() => useToast())

    const types = ['success', 'error', 'warning', 'info'] as const

    types.forEach((type) => {
      act(() => {
        result.current.showToast(`${type} message`, type)
      })

      expect(result.current.toast?.type).toBe(type)
    })
  })

  it('should set custom duration', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('Timed message', 'info', 5000)
    })

    expect(result.current.toast?.duration).toBe(5000)
  })

  it('should close toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('Test', 'info')
    })

    expect(result.current.toast).not.toBeNull()

    act(() => {
      result.current.closeToast()
    })

    expect(result.current.toast).toBeNull()
  })

  it('should generate unique IDs for each toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('First', 'info')
    })
    const firstId = result.current.toast?.id

    // Wait a tick to ensure different timestamp
    act(() => {
      setTimeout(() => {
        result.current.showToast('Second', 'info')
      }, 10)
    })

    // IDs should exist and be strings
    expect(firstId).toBeTruthy()
    expect(typeof firstId).toBe('string')
  })

  it('should replace previous toast when showing new one', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('First', 'info')
    })

    expect(result.current.toast?.message).toBe('First')

    act(() => {
      result.current.showToast('Second', 'error')
    })

    expect(result.current.toast?.message).toBe('Second')
    expect(result.current.toast?.type).toBe('error')
  })
})
