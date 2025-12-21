import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useZoomPan } from '@/frontends/shared/hooks/useZoomPan'

describe('useZoomPan', () => {
  it('should initialize with default zoom and scroll', () => {
    const { result } = renderHook(() => useZoomPan())

    expect(result.current.zoom).toBe(1)
    expect(result.current.scroll).toEqual({ left: 0, top: 0 })
  })

  it('should zoom in when zoomIn is called', () => {
    const { result } = renderHook(() => useZoomPan())

    act(() => {
      result.current.zoomIn()
    })

    expect(result.current.zoom).toBe(1.2)
  })

  it('should zoom out when zoomOut is called', () => {
    const { result } = renderHook(() => useZoomPan())

    act(() => {
      result.current.zoomOut()
    })

    expect(result.current.zoom).toBe(0.8)
  })

  it('should reset zoom when resetZoom is called', () => {
    const { result } = renderHook(() => useZoomPan())

    act(() => {
      result.current.zoomIn()
      result.current.zoomIn()
    })
    expect(result.current.zoom).not.toBe(1)

    act(() => {
      result.current.resetZoom()
    })

    expect(result.current.zoom).toBe(1)
  })

  it('should not zoom below 0.2', () => {
    const { result } = renderHook(() => useZoomPan())

    act(() => {
      result.current.setZoom(0.2)
      result.current.zoomOut()
    })

    expect(result.current.zoom).toBe(0.2)
  })

  it('should not zoom above 3', () => {
    const { result } = renderHook(() => useZoomPan())

    act(() => {
      result.current.setZoom(3)
      result.current.zoomIn()
    })

    expect(result.current.zoom).toBe(3)
  })

  it('should update scroll state', () => {
    const { result } = renderHook(() => useZoomPan())

    act(() => {
      result.current.setScroll({ left: 100, top: 200 })
    })

    expect(result.current.scroll).toEqual({ left: 100, top: 200 })
  })

  it('should provide mouse event handlers', () => {
    const { result } = renderHook(() => useZoomPan())

    expect(result.current.onMouseDown).toBeInstanceOf(Function)
    expect(result.current.onMouseMove).toBeInstanceOf(Function)
    expect(result.current.onMouseUp).toBeInstanceOf(Function)
    expect(result.current.onMouseLeave).toBeInstanceOf(Function)
  })

  it('should provide attachWheelZoom callback', () => {
    const { result } = renderHook(() => useZoomPan())

    expect(result.current.attachWheelZoom).toBeInstanceOf(Function)
  })
})
