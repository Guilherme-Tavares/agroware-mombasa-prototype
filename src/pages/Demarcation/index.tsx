import { useState, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Undo2, Check, Info, Ruler, MapPin, Palette, Satellite,
} from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useToast } from '@/hooks/useToast'
import type { Point } from '@/types/domain'
import {
  polygonToPoints, shoelaceArea, polygonPerimeter, distance,
} from '@/utils/geometry'
import { formatArea } from '@/utils/format'
import Button from '@/components/ui/Button.tsx'
import Modal from '@/components/ui/Modal.tsx'
import Input from '@/components/ui/Input.tsx'
import GeoDemarcation from '@/components/map/GeoDemarcation.tsx'

type DemarcationMode = 'ilustrada' | 'real'

// ─── Canvas dimensions ────────────────────────────────────────────────────────

const VW = 1000
const VH = 700
const SNAP_DIST = 18   // SVG units — close polygon when cursor is within this radius

// ─── Scale derivation ─────────────────────────────────────────────────────────
// Converts SVG unit measurements to real-world ha / m using the existing
// farm polygon as a reference (if available).

function deriveScale(farm: { polygon: Point[]; totalArea: number } | null) {
  if (farm && farm.polygon.length >= 3) {
    const svgArea = shoelaceArea(farm.polygon)
    if (svgArea > 0) {
      const haPerSvg = farm.totalArea / svgArea
      return { haPerSvg, mPerSvg: Math.sqrt(haPerSvg * 10_000) }
    }
  }
  // Fallback: 1000×700 SVG ≈ 200 ha total canvas area
  const haPerSvg = 200 / (VW * VH)
  return { haPerSvg, mPerSvg: Math.sqrt(haPerSvg * 10_000) }
}

// ─── SVG coordinate conversion ────────────────────────────────────────────────

function clientToSVG(
  e: React.MouseEvent<SVGSVGElement>,
  el: SVGSVGElement,
): Point | null {
  const pt = el.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const ctm = el.getScreenCTM()
  if (!ctm) return null
  const { x, y } = pt.matrixTransform(ctm.inverse())
  return { x, y }
}

// ─── Instruction step badge ───────────────────────────────────────────────────

function StepBadge({
  n, label, done, active,
}: { n: number; label: string; done?: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 transition-opacity duration-300 ${active || done ? 'opacity-100' : 'opacity-35'}`}>
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
          done    ? 'bg-ok text-white'
          : active ? 'bg-primary text-white'
          :          'bg-gray-200 text-gray-500'
        }`}
      >
        {done ? <Check size={10} strokeWidth={3} /> : n}
      </span>
      <span className={`text-caption ${active || done ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function IllustratedDemarcation({
  mode, onModeChange,
}: { mode: DemarcationMode; onModeChange: (m: DemarcationMode) => void }) {
  const navigate   = useNavigate()
  const farm       = useFarmStore((s) => s.farm)
  const updateFarm = useFarmStore((s) => s.updateFarm)

  const svgRef = useRef<SVGSVGElement | null>(null)

  // ── Drawing state ──
  const [points, setPoints]     = useState<Point[]>([])
  const [hover, setHover]       = useState<Point | null>(null)
  const [isClosed, setIsClosed] = useState(false)

  // ── Modal state ──
  const [showModal, setShowModal]   = useState(false)
  const [farmName, setFarmName]     = useState(farm?.name ?? 'Sítio Santa Fé')
  const [city, setCity]             = useState(farm?.city ?? '')
  const [uf, setUf]                 = useState(farm?.state ?? '')
  const [saving, setSaving]         = useState(false)

  // ── Scale factors ──
  const scale = useMemo(() => deriveScale(farm), [farm])

  // ── Derived geometry ──
  const areaHa = useMemo(
    () => shoelaceArea(points) * scale.haPerSvg,
    [points, scale],
  )
  const perimeterM = useMemo(
    () => polygonPerimeter(points) * scale.mPerSvg,
    [points, scale],
  )

  const lastPt      = points[points.length - 1]
  const canConclude = points.length >= 3

  const isSnapping = !isClosed
    && points.length >= 3
    && hover !== null
    && distance(hover, points[0]) < SNAP_DIST

  // Active step for instruction card
  const step = isClosed ? 4 : points.length === 0 ? 1 : points.length < 3 ? 2 : 3

  // ── Event handlers ──

  const handleSVGClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isClosed || !svgRef.current) return
      const pt = clientToSVG(e, svgRef.current)
      if (!pt) return

      if (isSnapping) {
        setIsClosed(true)
        setShowModal(true)
        return
      }

      setPoints((prev) => [
        ...prev,
        { x: Math.round(pt.x), y: Math.round(pt.y) },
      ])
    },
    [isClosed, isSnapping],
  )

  const handleSVGMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isClosed || !svgRef.current) return
      const pt = clientToSVG(e, svgRef.current)
      if (pt) setHover(pt)
    },
    [isClosed],
  )

  function handleUndo() {
    if (isClosed) {
      setIsClosed(false)
      return
    }
    setPoints((prev) => prev.slice(0, -1))
  }

  function handleConclude() {
    if (!canConclude) return
    setIsClosed(true)
    setShowModal(true)
  }

  function handleModalClose() {
    setShowModal(false)
    setIsClosed(false)
  }

  function handleSave() {
    setSaving(true)
    setTimeout(() => {
      updateFarm({
        polygon:   points,
        totalArea: parseFloat(areaHa.toFixed(1)),
        perimeter: parseFloat(perimeterM.toFixed(0)),
        name:      farmName.trim() || 'Sítio Santa Fé',
        city:      city.trim(),
        state:     uf.trim().toUpperCase(),
      })
      setSaving(false)
      navigate('/map')
    }, 600)
  }

  // ── Rendered SVG data ──
  const pointsStr = polygonToPoints(points)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Instruction card ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-primary-bg border border-primary/20"
      >
        <Info size={15} className="text-primary mt-0.5 shrink-0" />
        <div className="flex flex-wrap gap-x-6 gap-y-2.5">
          <StepBadge n={1} label="Clique para marcar pontos"     done={step > 1} active={step === 1} />
          <StepBadge n={2} label="Adicione pelo menos 3 pontos"  done={step > 2} active={step === 2} />
          <StepBadge n={3} label="Feche clicando no 1º ponto"    done={step > 3} active={step === 3} />
        </div>
      </motion.div>

      {/* ── Canvas ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="relative w-full overflow-hidden rounded-2xl border border-gray-200 shadow-card"
        style={{ height: 'calc(100svh - 300px)', minHeight: '360px' }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full bg-[#EDF1E2]"
          style={{
            cursor:      isClosed ? 'default' : 'crosshair',
            touchAction: 'none',
            userSelect:  'none',
          }}
          onClick={handleSVGClick}
          onMouseMove={handleSVGMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* ── Defs ───────────────────────────────────────────────── */}
          <defs>
            <pattern id="dc-terrain" patternUnits="userSpaceOnUse" width="16" height="16">
              <rect width="16" height="16" fill="#EDF1E2" />
              <circle cx="4"  cy="4"  r="0.6" fill="#8B9E7B" opacity="0.35" />
              <circle cx="12" cy="11" r="0.5" fill="#8B9E7B" opacity="0.25" />
              <circle cx="8"  cy="14" r="0.4" fill="#8B9E7B" opacity="0.3"  />
            </pattern>

            {/* Radial glow for snap indicator */}
            <radialGradient id="snap-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#1B5E20" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1B5E20" stopOpacity="0"    />
            </radialGradient>
          </defs>

          {/* ── Background ─────────────────────────────────────────── */}
          <rect x="0" y="0" width={VW} height={VH} fill="url(#dc-terrain)" />

          {/* Decorative terrain features */}
          <path
            d="M 60,420 Q 160,370 220,395 Q 340,435 440,390 Q 540,348 660,378 Q 760,408 860,365 Q 940,330 970,350"
            fill="none" stroke="#A5C4D8" strokeWidth="2.5"
            opacity="0.3" strokeLinecap="round"
          />
          <ellipse cx="160" cy="170" rx="45" ry="28" fill="#B8D4B0" opacity="0.28" />
          <ellipse cx="160" cy="170" rx="30" ry="18" fill="#B8D4B0" opacity="0.15" />
          <ellipse cx="760" cy="510" rx="55" ry="32" fill="#B8D4B0" opacity="0.22" />
          <ellipse cx="760" cy="510" rx="38" ry="22" fill="#B8D4B0" opacity="0.12" />
          <ellipse cx="490" cy="115" rx="38" ry="22" fill="#B8D4B0" opacity="0.2"  />
          <ellipse cx="860" cy="270" rx="32" ry="20" fill="#B8D4B0" opacity="0.18" />
          <ellipse cx="300" cy="580" rx="42" ry="24" fill="#B8D4B0" opacity="0.15" />

          {/* ── Polygon fill (3+ points) ───────────────────────────── */}
          <AnimatePresence>
            {points.length >= 3 && (
              <motion.polygon
                key="poly-fill"
                points={pointsStr}
                fill="#2E7D32"
                stroke="none"
                initial={{ fillOpacity: 0 }}
                animate={{ fillOpacity: isClosed ? 0.13 : 0.07 }}
                exit={{ fillOpacity: 0 }}
                transition={{ duration: 0.35 }}
              />
            )}
          </AnimatePresence>

          {/* ── Marching ants — open edges ─────────────────────────── */}
          {points.length >= 2 && (
            <motion.polyline
              key="ants-open"
              points={pointsStr}
              fill="none"
              stroke="#2E7D32"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="10 5"
              animate={{ strokeDashoffset: [0, -15] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: 'linear' }}
            />
          )}

          {/* ── Marching ants — closing edge (last → first) ────────── */}
          {isClosed && points.length >= 3 && (
            <motion.path
              key="ants-close"
              d={`M ${lastPt.x},${lastPt.y} L ${points[0].x},${points[0].y}`}
              fill="none"
              stroke="#2E7D32"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="10 5"
              animate={{ strokeDashoffset: [0, -15] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: 'linear' }}
            />
          )}

          {/* ── Closing animation — line draws in when polygon closes ─ */}
          {isClosed && points.length >= 3 && (
            <motion.path
              key="close-anim"
              d={`M ${lastPt.x},${lastPt.y} L ${points[0].x},${points[0].y}`}
              fill="none"
              stroke="#1B5E20"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: 1, opacity: 0 }}
              transition={{
                pathLength: { duration: 0.45, ease: 'easeOut' },
                opacity:    { delay: 0.35, duration: 0.2 },
              }}
            />
          )}

          {/* ── Preview line (cursor → last point) ─────────────────── */}
          {!isClosed && lastPt && hover && (
            <line
              x1={lastPt.x} y1={lastPt.y}
              x2={isSnapping ? points[0].x : hover.x}
              y2={isSnapping ? points[0].y : hover.y}
              stroke={isSnapping ? '#1B5E20' : '#2E7D32'}
              strokeWidth={isSnapping ? 2.5 : 1.5}
              strokeDasharray="7 4"
              strokeLinecap="round"
              opacity="0.55"
            />
          )}

          {/* ── Snap indicator (glow + pulse ring on first pin) ─────── */}
          {isSnapping && points.length > 0 && (
            <>
              <circle
                cx={points[0].x} cy={points[0].y}
                r="28"
                fill="url(#snap-glow)"
                pointerEvents="none"
              />
              <motion.circle
                cx={points[0].x} cy={points[0].y}
                r="16"
                fill="none"
                stroke="#1B5E20"
                strokeWidth="2"
                opacity="0.7"
                animate={{ r: [14, 20, 14], opacity: [0.7, 0.3, 0.7] }}
                transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}
              />
            </>
          )}

          {/* ── Pins ────────────────────────────────────────────────── */}
          {points.map((p, i) => {
            const isFirst   = i === 0
            const fillColor = isFirst ? '#1B5E20' : 'white'
            const textColor = isFirst ? 'white'   : '#2E7D32'
            const stroke    = isFirst ? '#1B5E20'  : '#2E7D32'
            return (
              <g key={i} transform={`translate(${p.x},${p.y})`}>
                {/* Drop shadow */}
                <circle r="11" cy="1.5" fill="rgba(0,0,0,0.15)" />
                {/* Pop animation wraps children centered at (0,0) = pin position */}
                <motion.g
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.25, 1] }}
                  transition={{ duration: 0.35, times: [0, 0.55, 1], ease: 'easeOut' }}
                >
                  <circle r="10" fill={fillColor} stroke={stroke} strokeWidth="2" />
                  <text
                    y="4"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="Roboto, sans-serif"
                    fill={textColor}
                    style={{ pointerEvents: 'none' }}
                  >
                    {i + 1}
                  </text>
                </motion.g>
              </g>
            )
          })}

          {/* ── Empty state hint ────────────────────────────────────── */}
          {points.length === 0 && (
            <g opacity="0.4" pointerEvents="none">
              <text
                x={VW / 2} y={VH / 2 - 14}
                textAnchor="middle"
                fontSize="17"
                fontFamily="Roboto, sans-serif"
                fill="#3A5C34"
              >
                Clique para marcar o primeiro ponto
              </text>
              <text
                x={VW / 2} y={VH / 2 + 18}
                textAnchor="middle"
                fontSize="13"
                fontFamily="Roboto, sans-serif"
                fill="#3A5C34"
              >
                Percorra os cantos da propriedade em sentido horário
              </text>
              {/* Simple cursor icon */}
              <g transform={`translate(${VW / 2 - 6}, ${VH / 2 + 38})`}>
                <path
                  d="M 0,0 L 0,16 L 4,12 L 7,18 L 9,17 L 6,11 L 11,11 Z"
                  fill="#3A5C34"
                />
              </g>
            </g>
          )}
        </svg>

        {/* ── Floating area / perimeter card ─────────────────────────── */}
        <AnimatePresence>
          {points.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: -6 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
              className="absolute top-3 right-3 bg-white/96 backdrop-blur-sm rounded-xl border border-gray-200 shadow-floating px-4 py-3"
            >
              <div className="flex items-center gap-1.5 text-caption text-gray-400 mb-2">
                <Ruler size={12} />
                <span className="uppercase tracking-wide font-medium text-[10px]">Área estimada</span>
              </div>
              <p className="font-data text-h2 text-primary tabular-nums leading-tight">
                {formatArea(areaHa)}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-caption text-gray-400 tabular-nums">
                  {perimeterM >= 1000
                    ? `${(perimeterM / 1000).toFixed(2).replace('.', ',')} km`
                    : `${Math.round(perimeterM)} m`}
                </span>
                <span className="text-caption text-gray-300">·</span>
                <span className="text-caption text-gray-400 tabular-nums">
                  {points.length} pts
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Point count badge (bottom-left) ─────────────────────────── */}
        <AnimatePresence>
          {points.length > 0 && !isClosed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 px-3 py-1.5 flex items-center gap-2"
            >
              <MapPin size={12} className="text-primary" />
              <span className="text-caption text-gray-700 tabular-nums">
                {points.length} ponto{points.length !== 1 ? 's' : ''}
                {points.length < 3 && (
                  <span className="text-gray-400">
                    {' '}· faltam {3 - points.length}
                  </span>
                )}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Base layer toggle — bottom-right, igual ao mapa satélite */}
        {!showModal && (
          <div className="absolute bottom-6 right-3 z-10 flex rounded-xl bg-white shadow-floating border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => onModeChange('real')}
              aria-pressed={mode === 'real'}
              className={['flex items-center gap-1.5 px-3 py-2 text-button transition-colors',
                mode === 'real' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'].join(' ')}
            >
              <Satellite size={14} />
              <span className="hidden sm:inline">Satélite</span>
            </button>
            <button
              type="button"
              onClick={() => onModeChange('ilustrada')}
              aria-pressed={mode === 'ilustrada'}
              className={['flex items-center gap-1.5 px-3 py-2 text-button transition-colors',
                mode === 'ilustrada' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'].join(' ')}
            >
              <Palette size={14} />
              <span className="hidden sm:inline">Ilustrada</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex items-center gap-2"
      >
        <Button
          variant="ghost"
          icon={<Undo2 size={15} />}
          onClick={handleUndo}
          disabled={points.length === 0}
        >
          Desfazer
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          fullWidth
          icon={<Check size={15} />}
          disabled={!canConclude}
          onClick={handleConclude}
        >
          Concluir Demarcação
        </Button>
      </motion.div>

      {/* ── Confirmation modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title="Confirmar Demarcação"
        description="Revise os dados antes de salvar a propriedade."
      >
        <div className="space-y-4">

          {/* Summary metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-3 rounded-xl bg-primary-bg">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
                Área
              </span>
              <span className="font-data text-h2 text-primary tabular-nums leading-tight">
                {formatArea(areaHa)}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-gray-50">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
                Perímetro
              </span>
              <span className="font-data text-h2 text-gray-900 tabular-nums leading-tight">
                {perimeterM >= 1000
                  ? `${(perimeterM / 1000).toFixed(1).replace('.', ',')} km`
                  : `${Math.round(perimeterM)} m`}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-gray-50">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
                Vértices
              </span>
              <span className="font-data text-h2 text-gray-900 tabular-nums leading-tight">
                {points.length}
              </span>
            </div>
          </div>

          {/* Property form */}
          <Input
            label="Nome da propriedade"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            required
          />

          <div className="grid grid-cols-[1fr_80px] gap-3">
            <Input
              label="Município"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            <Input
              label="UF"
              value={uf}
              maxLength={2}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleModalClose}
              disabled={saving}
            >
              Revisar
            </Button>
            <Button
              variant="primary"
              fullWidth
              loading={saving}
              icon={<Check size={15} />}
              onClick={handleSave}
              disabled={!farmName.trim() || !city.trim() || !uf.trim()}
            >
              Salvar Propriedade
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Wrapper: alterna entre demarcação ilustrada (fallback) e sobre o mapa real ─

export default function Demarcation() {
  const navigate = useNavigate()
  const toast    = useToast()
  const [mode, setMode] = useState<DemarcationMode>('real')

  function handleSatelliteFail() {
    setMode('ilustrada')
    toast.error('Imagem de satélite indisponível — usando modo ilustrado.')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header + toggle de modo */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-h1 text-gray-900">Demarcar Propriedade</h1>
          <p className="text-caption text-gray-400 mt-0.5">
            {mode === 'ilustrada'
              ? 'Modo ilustrado — desenho relativo, offline'
              : 'Satélite — captura lat/lng georreferenciada'}
          </p>
        </div>
      </motion.div>

      {mode === 'ilustrada'
        ? <IllustratedDemarcation mode={mode} onModeChange={setMode} />
        : <GeoDemarcation onCancel={() => navigate(-1)} onFail={handleSatelliteFail} mode={mode} onModeChange={setMode} />}
    </div>
  )
}
