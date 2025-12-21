import { useCallback, useRef, useState } from 'react'

export function useZoomPan() {
  const [zoom, setZoom] = useState(1)
  const [scroll, setScroll] = useState({ left: 0, top: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const scrollStart = useRef({ left: 0, top: 0 })

  const attachWheelZoom = useCallback((el: HTMLElement | null) => {
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom((z) => Math.max(0.2, Math.min(3, z + delta)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.currentTarget
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    scrollStart.current = { left: target.scrollLeft, top: target.scrollTop }
    target.style.cursor = 'grabbing'
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    const target = e.currentTarget
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    target.scrollLeft = scrollStart.current.left - dx
    target.scrollTop = scrollStart.current.top - dy
    setScroll({ left: target.scrollLeft, top: target.scrollTop })
  }, [])

  const onMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    isDragging.current = false
    e.currentTarget.style.cursor = 'default'
  }, [])

  const onMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    isDragging.current = false
    e.currentTarget.style.cursor = 'default'
  }, [])

  const zoomIn = () => setZoom((z) => Math.min(3, z + 0.2))
  const zoomOut = () => setZoom((z) => Math.max(0.2, z - 0.2))
  const resetZoom = () => setZoom(1)

  return {
    zoom,
    scroll,
    zoomIn,
    zoomOut,
    resetZoom,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    attachWheelZoom,
    setZoom,
    setScroll,
  }
}
