import { useState, useRef, useEffect, useCallback } from 'react'
import type { Point } from '@/types/domain'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const CLICK_THRESHOLD_PX = 5

interface UseMapPanZoomOptions {
  viewBoxWidth?:  number
  viewBoxHeight?: number
}

export interface MapPanZoomApi {
  svgRef: React.RefObject<SVGSVGElement | null>
  pan:    Point
  zoom:   number
  wasDraggingRef: React.RefObject<boolean>
  handlePointerDown: (e: React.PointerEvent<SVGSVGElement>) => void
  handlePointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  handlePointerUp:   (e: React.PointerEvent<SVGSVGElement>) => void
  zoomIn:  () => void
  zoomOut: () => void
  reset:   () => void
}

export function useMapPanZoom({
  viewBoxWidth  = 1000,
  viewBoxHeight = 700,
}: UseMapPanZoomOptions = {}): MapPanZoomApi {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [pan, setPan]   = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)

  // Latest refs so wheel listener doesn't need to be re-bound on every change
  const panRef  = useRef(pan)
  const zoomRef = useRef(zoom)
  useEffect(() => { panRef.current = pan },   [pan])
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  const isDraggingRef  = useRef(false)
  const wasDraggingRef = useRef(false)
  const dragStartRef   = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 })

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchStateRef = useRef<{
    initialDist: number
    initialZoom: number
    centerSVG:   Point
    initialPan:  Point
  } | null>(null)

  const clientToSVG = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width)  * viewBoxWidth,
      y: ((clientY - rect.top)  / rect.height) * viewBoxHeight,
    }
  }, [viewBoxWidth, viewBoxHeight])

  // Native wheel listener (passive: false to allow preventDefault)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const oldZoom = zoomRef.current
      const oldPan  = panRef.current
      const factor  = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor))
      if (newZoom === oldZoom) return

      const { x: mx, y: my } = clientToSVG(e.clientX, e.clientY)
      setZoom(newZoom)
      setPan({
        x: mx - (newZoom / oldZoom) * (mx - oldPan.x),
        y: my - (newZoom / oldZoom) * (my - oldPan.y),
      })
    }

    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [clientToSVG])

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return

    // Fresh interaction → reset drag flag so clicks can fire
    if (pointersRef.current.size === 0) {
      wasDraggingRef.current = false
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    try { svgRef.current?.setPointerCapture(e.pointerId) } catch { /* ignore */ }

    if (pointersRef.current.size === 1) {
      isDraggingRef.current = false
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX:    pan.x,
        panY:    pan.y,
      }
    } else if (pointersRef.current.size === 2) {
      const ptrs = Array.from(pointersRef.current.values())
      const dist = Math.hypot(ptrs[0].x - ptrs[1].x, ptrs[0].y - ptrs[1].y)
      const centerClient = {
        x: (ptrs[0].x + ptrs[1].x) / 2,
        y: (ptrs[0].y + ptrs[1].y) / 2,
      }
      pinchStateRef.current = {
        initialDist: dist,
        initialZoom: zoomRef.current,
        centerSVG:   clientToSVG(centerClient.x, centerClient.y),
        initialPan:  { ...panRef.current },
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Two-finger pinch
    if (pointersRef.current.size === 2 && pinchStateRef.current) {
      const ptrs = Array.from(pointersRef.current.values())
      const dist = Math.hypot(ptrs[0].x - ptrs[1].x, ptrs[0].y - ptrs[1].y)
      const { initialDist, initialZoom, centerSVG, initialPan } = pinchStateRef.current
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialZoom * (dist / initialDist)))
      setZoom(newZoom)
      setPan({
        x: centerSVG.x - (newZoom / initialZoom) * (centerSVG.x - initialPan.x),
        y: centerSVG.y - (newZoom / initialZoom) * (centerSVG.y - initialPan.y),
      })
      wasDraggingRef.current = true
      return
    }

    // Single pointer drag
    if (pointersRef.current.size === 1) {
      const dx = e.clientX - dragStartRef.current.clientX
      const dy = e.clientY - dragStartRef.current.clientY

      if (!isDraggingRef.current && Math.hypot(dx, dy) > CLICK_THRESHOLD_PX) {
        isDraggingRef.current = true
        wasDraggingRef.current = true
      }

      if (isDraggingRef.current) {
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const sx = viewBoxWidth  / rect.width
        const sy = viewBoxHeight / rect.height
        setPan({
          x: dragStartRef.current.panX + dx * sx,
          y: dragStartRef.current.panY + dy * sy,
        })
      }
    }
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    pointersRef.current.delete(e.pointerId)
    try { svgRef.current?.releasePointerCapture(e.pointerId) } catch { /* ignore */ }

    if (pointersRef.current.size < 2) {
      pinchStateRef.current = null
    }
    if (pointersRef.current.size === 0) {
      isDraggingRef.current = false
      // wasDraggingRef stays true until next pointerdown — suppresses synthetic click
    }
  }

  const zoomIn  = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25)), [])
  const reset   = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) },        [])

  return {
    svgRef,
    pan,
    zoom,
    wasDraggingRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    zoomIn,
    zoomOut,
    reset,
  }
}
