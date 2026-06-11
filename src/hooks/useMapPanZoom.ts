import { useState, useRef, useEffect, useCallback } from 'react'
import type { Point } from '@/types/domain'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const CLICK_THRESHOLD_PX = 5
const LONG_PRESS_MS = 100

interface UseMapPanZoomOptions {
  viewBoxWidth?:  number
  viewBoxHeight?: number
  /** Desativa pan/zoom (modo de edição de âncoras, desenho, reposicionamento). */
  disabled?: boolean
  /**
   * Mapa estático: o arraste de um ponteiro só panora após um long-press de
   * ~100 ms. Um arraste curto não move o mapa, e um toque rápido continua
   * selecionando elementos. Espelha o comportamento da camada satélite.
   */
  longPressToPan?: boolean
  /**
   * Ao armar o long-press (100 ms), já entra em modo pan mesmo sem mover:
   * mostra o cursor grabbing e suprime o clique seguinte. Usado nos modos
   * posicionar/reposicionar, onde segurar (e soltar) não deve soltar o
   * elemento — só o toque rápido solta. No view mode fica `false`, para que um
   * hold parado ainda conte como toque (seleção).
   */
  longPressEngageOnArm?: boolean
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
  viewBoxWidth         = 1000,
  viewBoxHeight        = 700,
  disabled             = false,
  longPressToPan       = false,
  longPressEngageOnArm = false,
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

  // Long-press gating (static map → pan only after holding). lpArmedRef becomes
  // true once the hold timer fires; only then does a drag engage the pan.
  const lpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lpArmedRef = useRef(false)

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
    if (disabled) return
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return

    // Fresh interaction → reset drag flag so clicks can fire
    if (pointersRef.current.size === 0) {
      wasDraggingRef.current = false
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // NÃO capturamos o ponteiro aqui: capturar no pointerdown faz o `click`
    // ser entregue ao SVG (e não aos marcadores), engolindo o onClick. A captura
    // só acontece quando um arraste/pinça realmente começa (em handlePointerMove).

    if (pointersRef.current.size === 1) {
      isDraggingRef.current = false
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX:    pan.x,
        panY:    pan.y,
      }
      // Static map: arm the pan only after a long-press. Without longPressToPan,
      // arm immediately so behavior is unchanged for other callers.
      lpArmedRef.current = !longPressToPan
      if (lpTimerRef.current) { clearTimeout(lpTimerRef.current); lpTimerRef.current = null }
      if (longPressToPan) {
        lpTimerRef.current = setTimeout(() => {
          lpArmedRef.current = true
          // Engata o modo pan já ao armar (sem precisar mover): grabbing + clique
          // suprimido, para que segurar-e-soltar não dispare o clique-para-soltar.
          if (longPressEngageOnArm) {
            wasDraggingRef.current = true
            svgRef.current?.classList.add('map-panning')
          }
        }, LONG_PRESS_MS)
      }
    } else if (pointersRef.current.size === 2) {
      // Pinch zoom is unaffected by long-press gating.
      if (lpTimerRef.current) { clearTimeout(lpTimerRef.current); lpTimerRef.current = null }
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
    if (disabled) return
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Two-finger pinch
    if (pointersRef.current.size === 2 && pinchStateRef.current) {
      try { svgRef.current?.setPointerCapture(e.pointerId) } catch { /* ignore */ }
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
        if (lpArmedRef.current) {
          isDraggingRef.current = true
          wasDraggingRef.current = true
          // Re-baseline para o ponto atual: se o ponteiro se moveu enquanto o
          // long-press ainda não havia armado, o pan começa daqui sem salto.
          dragStartRef.current = {
            clientX: e.clientX, clientY: e.clientY,
            panX: panRef.current.x, panY: panRef.current.y,
          }
          // Cursor grabbing enquanto panora (vence o cursor inline via !important).
          svgRef.current?.classList.add('map-panning')
          // Captura só agora (arraste confirmado), para não atrapalhar o clique.
          try { svgRef.current?.setPointerCapture(e.pointerId) } catch { /* ignore */ }
        } else {
          // Long-press ainda não armado: arraste curto não panora (mapa estático),
          // mas suprime o clique para não selecionar acidentalmente num swipe.
          wasDraggingRef.current = true
        }
      }

      if (isDraggingRef.current) {
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const sx = viewBoxWidth  / rect.width
        const sy = viewBoxHeight / rect.height
        const ddx = e.clientX - dragStartRef.current.clientX
        const ddy = e.clientY - dragStartRef.current.clientY
        setPan({
          x: dragStartRef.current.panX + ddx * sx,
          y: dragStartRef.current.panY + ddy * sy,
        })
      }
    }
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled) return
    if (lpTimerRef.current) { clearTimeout(lpTimerRef.current); lpTimerRef.current = null }
    lpArmedRef.current = false
    pointersRef.current.delete(e.pointerId)
    try { svgRef.current?.releasePointerCapture(e.pointerId) } catch { /* ignore */ }

    if (pointersRef.current.size < 2) {
      pinchStateRef.current = null
    }
    if (pointersRef.current.size === 0) {
      isDraggingRef.current = false
      svgRef.current?.classList.remove('map-panning')
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
