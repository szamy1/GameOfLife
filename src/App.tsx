import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRightLeft,
  Eraser,
  Gauge,
  Grid,
  Infinity,
  Palette,
  Pause,
  Play,
  RefreshCcw,
  Shuffle,
  Sparkles,
  StepForward,
  Wand2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import './App.css'

type ThemeId = 'light' | 'dark' | 'neon' | 'dawn'

type ThemeConfig = {
  label: string
  description: string
  properties: Record<string, string>
}

type Pattern = {
  id: string
  label: string
  description: string
  minWidth: number
  minHeight: number
  rows: string[]
  offsets: Array<[number, number]>
}

type SavedState = {
  width: number
  height: number
  speed: number
  wrap: boolean
  theme: ThemeId
  cells: string | null
}

const STORAGE_KEY = 'life-ui-state-v1'
const MIN_SIZE = 10
const MAX_SIZE = 150
const DEFAULT_WIDTH = 42
const DEFAULT_HEIGHT = 28

const THEMES: Record<ThemeId, ThemeConfig> = {
  light: {
    label: 'Light Quartz',
    description: 'Bright studio lighting with sharp grid lines.',
    properties: {
      '--bg': '#f6f8fb',
      '--bg-strong': '#eef1f8',
      '--panel': 'rgba(255, 255, 255, 0.9)',
      '--panel-strong': 'rgba(15, 23, 42, 0.06)',
      '--text': '#0f172a',
      '--text-muted': '#4b5563',
      '--accent': '#2563eb',
      '--accent-strong': '#0ea5e9',
      '--grid': 'rgba(15, 23, 42, 0.1)',
      '--cell-live': '#0ea5e9',
      '--cell-dead': 'rgba(15, 23, 42, 0.06)',
      '--glow': '#38bdf8',
    },
  },
  dark: {
    label: 'Midnight',
    description: 'Moody contrast with soft neon highlights.',
    properties: {
      '--bg': '#05060c',
      '--bg-strong': '#0b1224',
      '--panel': 'rgba(255, 255, 255, 0.06)',
      '--panel-strong': 'rgba(255, 255, 255, 0.12)',
      '--text': '#e6edf7',
      '--text-muted': '#8ba0c3',
      '--accent': '#60a5fa',
      '--accent-strong': '#7dd3fc',
      '--grid': 'rgba(255, 255, 255, 0.08)',
      '--cell-live': '#8b5cf6',
      '--cell-dead': 'rgba(255, 255, 255, 0.05)',
      '--glow': '#60a5fa',
    },
  },
  neon: {
    label: 'Neon Grid',
    description: 'Club lighting, electric cyan and ultraviolet glow.',
    properties: {
      '--bg': '#060712',
      '--bg-strong': '#0e1022',
      '--panel': 'rgba(15, 23, 42, 0.65)',
      '--panel-strong': 'rgba(99, 102, 241, 0.18)',
      '--text': '#e6ecff',
      '--text-muted': '#96a5c7',
      '--accent': '#22d3ee',
      '--accent-strong': '#a855f7',
      '--grid': 'rgba(255, 255, 255, 0.1)',
      '--cell-live': '#7c3aed',
      '--cell-dead': 'rgba(255, 255, 255, 0.08)',
      '--glow': '#22d3ee',
    },
  },
  dawn: {
    label: 'Solar Dawn',
    description: 'Warm sunrise amber and raspberry glow.',
    properties: {
      '--bg': '#0f0a0a',
      '--bg-strong': '#1b1012',
      '--panel': 'rgba(255, 255, 255, 0.05)',
      '--panel-strong': 'rgba(249, 115, 22, 0.14)',
      '--text': '#fde7ef',
      '--text-muted': '#f4b5c3',
      '--accent': '#fb923c',
      '--accent-strong': '#f43f5e',
      '--grid': 'rgba(255, 255, 255, 0.08)',
      '--cell-live': '#fb7185',
      '--cell-dead': 'rgba(255, 255, 255, 0.09)',
      '--glow': '#f59e0b',
    },
  },
}

const isThemeId = (value: string): value is ThemeId => value in THEMES

const rowsToOffsets = (rows: string[]): Array<[number, number]> => {
  const offsets: Array<[number, number]> = []
  const height = rows.length
  const width = rows[0]?.length ?? 0
  const cx = Math.floor(width / 2)
  const cy = Math.floor(height / 2)

  rows.forEach((row, y) => {
    row.split('').forEach((char, x) => {
      if (char === 'O' || char === 'X' || char === '1') {
        offsets.push([x - cx, y - cy])
      }
    })
  })
  return offsets
}

const PATTERNS: Pattern[] = [
  {
    id: 'glider',
    label: 'Glider',
    description: 'Diagonal traveler that never stops.',
    minWidth: 8,
    minHeight: 8,
    rows: ['.O.', '..O', 'OOO'],
    offsets: [],
  },
  {
    id: 'small-exploder',
    label: 'Small Exploder',
    description: 'Quick symmetric burst.',
    minWidth: 10,
    minHeight: 10,
    rows: ['.O.', 'OOO', 'O.O', '.O.'],
    offsets: [],
  },
  {
    id: 'pulsar',
    label: 'Pulsar',
    description: 'Period-3 oscillator with 48 cells.',
    minWidth: 18,
    minHeight: 18,
    rows: [
      '..OOO...OOO..',
      '.............',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '..OOO...OOO..',
      '.............',
      '..OOO...OOO..',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '.............',
      '..OOO...OOO..',
    ],
    offsets: [],
  },
  {
    id: 'gosper',
    label: 'Gosper Glider Gun',
    description: 'Fires an endless stream of gliders.',
    minWidth: 45,
    minHeight: 25,
    rows: [
      '........................O...........',
      '......................O.O...........',
      '............OO......OO............OO',
      '...........O...O....OO............OO',
      'OO........O.....O...OO..............',
      'OO........O...O.OO....O.O...........',
      '..........O.....O.......O...........',
      '...........O...O....................',
      '............OO......................',
    ],
    offsets: [],
  },
]

PATTERNS.forEach((pattern) => {
  pattern.offsets = rowsToOffsets(pattern.rows)
})

const clampSize = (value: number) => Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(value)))

const createEmptyBoard = (width: number, height: number) => new Uint8Array(width * height)

const randomBoard = (width: number, height: number, density: number) => {
  const next = new Uint8Array(width * height)
  for (let i = 0; i < next.length; i++) {
    next[i] = Math.random() < density ? 1 : 0
  }
  return next
}

const serializeCells = (cells: Uint8Array) => Array.from(cells).join('')

const deserializeCells = (raw: string, width: number, height: number) => {
  const total = width * height
  const normalized = raw.replace(/[^01]/g, '')
  const arr = new Uint8Array(total)
  for (let i = 0; i < total && i < normalized.length; i++) {
    arr[i] = normalized[i] === '1' ? 1 : 0
  }
  return arr
}

const loadSavedState = (): SavedState | null => {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    const width = clampSize(parsed.width ?? DEFAULT_WIDTH)
    const height = clampSize(parsed.height ?? DEFAULT_HEIGHT)
    const themeValue = typeof parsed.theme === 'string' && isThemeId(parsed.theme) ? parsed.theme : 'neon'
    return {
      width,
      height,
      speed: typeof parsed.speed === 'number' ? Math.min(30, Math.max(1, parsed.speed)) : 8,
      wrap: parsed.wrap !== undefined ? Boolean(parsed.wrap) : true,
      theme: themeValue,
      cells: typeof parsed.cells === 'string' ? parsed.cells : null,
    }
  } catch {
    return null
  }
}

const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/60 hover:text-[var(--accent-strong)] active:translate-y-0'

const pillClass =
  'flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[var(--text-muted)]'

function App() {
  const saved = loadSavedState()
  const [config, setConfig] = useState({
    width: saved?.width ?? DEFAULT_WIDTH,
    height: saved?.height ?? DEFAULT_HEIGHT,
    speed: saved?.speed ?? 10,
    wrap: saved?.wrap ?? true,
    theme: saved?.theme ?? ('neon' as ThemeId),
  })
  const [cells, setCells] = useState<Uint8Array>(() =>
    saved?.cells
      ? deserializeCells(saved.cells, saved.width, saved.height)
      : createEmptyBoard(saved?.width ?? DEFAULT_WIDTH, saved?.height ?? DEFAULT_HEIGHT),
  )
  const [generation, setGeneration] = useState(0)
  const [running, setRunning] = useState(false)
  const [density, setDensity] = useState(0.32)
  const [toast, setToast] = useState<string | null>(null)
  const [draftSize, setDraftSize] = useState({ width: config.width, height: config.height })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const lastFrameRef = useRef<number>(0)
  const paintValueRef = useRef<0 | 1>(1)
  const [isPainting, setIsPainting] = useState(false)

  const liveCount = useMemo(() => cells.reduce((sum, cell) => sum + cell, 0), [cells])

  const palette = useMemo(() => {
    const style = getComputedStyle(document.documentElement)
    return {
      live: style.getPropertyValue('--cell-live').trim(),
      dead: style.getPropertyValue('--cell-dead').trim(),
      grid: style.getPropertyValue('--grid').trim(),
      glow: style.getPropertyValue('--glow').trim(),
    }
  }, [config.theme])

  const saveState = useCallback(
    (nextCells: Uint8Array) => {
      if (typeof window === 'undefined') return
      const payload: SavedState = {
        width: config.width,
        height: config.height,
        speed: config.speed,
        wrap: config.wrap,
        theme: config.theme,
        cells: serializeCells(nextCells),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    },
    [config],
  )

  const drawBoard = useCallback(
    (current: Uint8Array) => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)

      const cellW = rect.width / config.width
      const cellH = rect.height / config.height

      ctx.fillStyle = palette.dead
      ctx.fillRect(0, 0, rect.width, rect.height)

      ctx.fillStyle = palette.live
      ctx.shadowColor = palette.glow
      ctx.shadowBlur = 8

      for (let y = 0; y < config.height; y++) {
        for (let x = 0; x < config.width; x++) {
          const idx = y * config.width + x
          if (current[idx]) {
            ctx.fillRect(x * cellW + 0.6, y * cellH + 0.6, cellW - 1.2, cellH - 1.2)
          }
        }
      }
      ctx.shadowBlur = 0

      ctx.strokeStyle = palette.grid
      ctx.lineWidth = 0.6
      for (let i = 1; i < config.width; i++) {
        const x = i * cellW
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, rect.height)
        ctx.stroke()
      }
      for (let j = 1; j < config.height; j++) {
        const y = j * cellH
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(rect.width, y)
        ctx.stroke()
      }
    },
    [config.height, config.width, palette.dead, palette.grid, palette.glow, palette.live],
  )

  useEffect(() => {
    document.documentElement.dataset.theme = config.theme
    const themeProps = THEMES[config.theme].properties
    Object.entries(themeProps).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
  }, [config.theme])

  useEffect(() => {
    drawBoard(cells)
    saveState(cells)
  }, [cells, drawBoard, saveState])

  useEffect(() => {
    const handleResize = () => drawBoard(cells)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [cells, drawBoard])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(id)
  }, [toast])

  const computeNext = useCallback(
    (board: Uint8Array, width: number, height: number, wrap: boolean) => {
      const next = new Uint8Array(board.length)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let neighbors = 0
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue
              let nx = x + dx
              let ny = y + dy
              if (wrap) {
                if (nx < 0) nx = width - 1
                if (nx >= width) nx = 0
                if (ny < 0) ny = height - 1
                if (ny >= height) ny = 0
              } else {
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
              }
              neighbors += board[ny * width + nx]
            }
          }
          const idx = y * width + x
          if (board[idx]) {
            next[idx] = neighbors === 2 || neighbors === 3 ? 1 : 0
          } else {
            next[idx] = neighbors === 3 ? 1 : 0
          }
        }
      }
      return next
    },
    [],
  )

  useEffect(() => {
    if (!running) return
    const stepInterval = 1000 / config.speed
    let frameId = 0

    const tick = (now: number) => {
      if (now - lastFrameRef.current >= stepInterval) {
        setCells((prev) => {
          const next = computeNext(prev, config.width, config.height, config.wrap)
          setGeneration((g) => g + 1)
          return next
        })
        lastFrameRef.current = now
      }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [computeNext, config.height, config.speed, config.width, config.wrap, running])

  const toggleCellAt = useCallback(
    (clientX: number, clientY: number, forceValue?: 0 | 1) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = Math.floor(((clientX - rect.left) / rect.width) * config.width)
      const y = Math.floor(((clientY - rect.top) / rect.height) * config.height)
      if (x < 0 || y < 0 || x >= config.width || y >= config.height) return
      setCells((prev) => {
        const idx = y * config.width + x
        const target = forceValue ?? (prev[idx] ? 0 : 1)
        if (prev[idx] === target) return prev
        const next = new Uint8Array(prev)
        next[idx] = target
        return next
      })
    },
    [config.height, config.width],
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * config.width)
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * config.height)
    const idx = y * config.width + x
    const initialValue = cells[idx] ? 0 : 1
    paintValueRef.current = initialValue as 0 | 1
    toggleCellAt(event.clientX, event.clientY, paintValueRef.current)
    setIsPainting(true)
    canvas.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPainting) return
    event.preventDefault()
    toggleCellAt(event.clientX, event.clientY, paintValueRef.current)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    setIsPainting(false)
    try {
      canvasRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      // ignore if no capture
    }
  }

  const clearBoard = () => {
    setCells(createEmptyBoard(config.width, config.height))
    setGeneration(0)
  }

  const randomizeBoard = () => {
    const next = randomBoard(config.width, config.height, density)
    setCells(next)
    setGeneration(0)
  }

  const stepOnce = () => {
    setCells((prev) => computeNext(prev, config.width, config.height, config.wrap))
    setGeneration((g) => g + 1)
  }

  const applyPattern = (patternId: string) => {
    const pattern = PATTERNS.find((p) => p.id === patternId)
    if (!pattern) return
    if (config.width < pattern.minWidth || config.height < pattern.minHeight) {
      setToast(`Make the board at least ${pattern.minWidth}×${pattern.minHeight} to fit ${pattern.label}.`)
      return
    }
    const cx = Math.floor(config.width / 2)
    const cy = Math.floor(config.height / 2)
    setCells((prev) => {
      const next = new Uint8Array(prev)
      pattern.offsets.forEach(([dx, dy]) => {
        const x = cx + dx
        const y = cy + dy
        if (x >= 0 && x < config.width && y >= 0 && y < config.height) {
          next[y * config.width + x] = 1
        }
      })
      return next
    })
    setGeneration(0)
    setToast(`${pattern.label} placed at center.`)
  }

  const applySize = () => {
    const width = clampSize(draftSize.width)
    const height = clampSize(draftSize.height)
    if (width === config.width && height === config.height) return
    setCells((prev) => {
      const next = createEmptyBoard(width, height)
      const copyWidth = Math.min(config.width, width)
      const copyHeight = Math.min(config.height, height)
      for (let y = 0; y < copyHeight; y++) {
        for (let x = 0; x < copyWidth; x++) {
          next[y * width + x] = prev[y * config.width + x]
        }
      }
      return next
    })
    setGeneration(0)
    setConfig((c) => ({ ...c, width, height }))
  }

  const setTheme = (nextTheme: ThemeId) => {
    setConfig((c) => ({ ...c, theme: nextTheme }))
  }

  const toggleWrap = () => setConfig((c) => ({ ...c, wrap: !c.wrap }))

  const densityPercent = Math.round(density * 100)
  const livePercent = config.width && config.height ? Math.round((liveCount / (config.width * config.height)) * 100) : 0

  return (
    <div className="min-h-screen px-4 pb-10 pt-6 text-[var(--text)] sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--accent)]">Game of Life Studio</p>
            <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Conway&apos;s Game of Life</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
              Paint, seed, and evolve. Switch themes, tweak board size, wrap edges, and explore famous patterns on desktop or
              mobile.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={pillClass}>
              <Sparkles size={16} /> {config.width} × {config.height}
            </span>
            <span className={pillClass}>
              <Gauge size={16} /> {config.speed.toFixed(0)} gen/s
            </span>
            <span className={pillClass}>
              <Grid size={16} /> Density {livePercent}%
            </span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.5fr,1fr]">
          <div className="glass-panel relative flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <span className="mono text-[13px] text-[var(--accent-strong)]">B3/S23</span>
                <span className="hidden sm:inline">Classic rules</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <span className="mono text-[13px]">Generation {generation}</span>
                <span className="mono text-[13px]">Live {liveCount}</span>
              </div>
            </div>
            <div className="relative flex-1">
              <div ref={containerRef} className="absolute inset-0 rounded-2xl p-3">
                <canvas
                  ref={canvasRef}
                  className="h-full w-full rounded-xl bg-[color:var(--panel)]"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
              </div>
              <div className="pointer-events-none absolute inset-x-6 bottom-4 flex justify-between text-[11px] text-[var(--text-muted)]">
                <span>Tap or click to paint</span>
                <span className="hidden sm:block">Drag to toggle multiple cells</span>
              </div>
            </div>
            <div className="border-t border-white/5 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button className={buttonClass} onClick={() => setRunning((r) => !r)}>
                  {running ? <Pause size={16} /> : <Play size={16} />}
                  {running ? 'Pause' : 'Play'}
                </button>
                <button className={buttonClass} onClick={stepOnce}>
                  <StepForward size={16} /> Step
                </button>
                <button className={buttonClass} onClick={randomizeBoard}>
                  <Shuffle size={16} /> Random
                </button>
                <button className={buttonClass} onClick={clearBoard}>
                  <Eraser size={16} /> Clear
                </button>
                <button className={buttonClass} onClick={() => setRunning(false)}>
                  <RefreshCcw size={16} /> Stop
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl border border-white/10 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Controls</h2>
                <span className="text-xs text-[var(--text-muted)]">Everything you need to tweak the sim</span>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold">
                      <Gauge size={16} /> Speed
                    </span>
                    <span className="mono text-[12px] text-[var(--text-muted)]">{config.speed.toFixed(0)} gen/s</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={config.speed}
                    onChange={(e) => setConfig((c) => ({ ...c, speed: Number(e.target.value) }))}
                    className="w-full accent-[var(--accent)]"
                  />
                </label>

                <label className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold">
                      <Sparkles size={16} /> Random fill
                    </span>
                    <span className="mono text-[12px] text-[var(--text-muted)]">{densityPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={90}
                    value={densityPercent}
                    onChange={(e) => setDensity(Number(e.target.value) / 100)}
                    className="w-full accent-[var(--accent)]"
                  />
                </label>

                <div className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <Grid size={16} /> Board size
                    </span>
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {MIN_SIZE}–{MAX_SIZE}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={MIN_SIZE}
                      max={MAX_SIZE}
                      value={draftSize.width}
                      onChange={(e) => setDraftSize((s) => ({ ...s, width: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm text-[var(--text)]"
                      aria-label="Board width"
                    />
                    <input
                      type="number"
                      min={MIN_SIZE}
                      max={MAX_SIZE}
                      value={draftSize.height}
                      onChange={(e) => setDraftSize((s) => ({ ...s, height: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm text-[var(--text)]"
                      aria-label="Board height"
                    />
                  </div>
                  <button className={clsx(buttonClass, 'w-full')} onClick={applySize}>
                    <RefreshCcw size={16} /> Resize grid
                  </button>
                </div>

                <div className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <ArrowRightLeft size={16} /> Edge behavior
                    </span>
                    <span className="mono text-[12px] text-[var(--text-muted)]">{config.wrap ? 'Wrap' : 'Bounded'}</span>
                  </div>
                  <button className={clsx(buttonClass, 'w-full')} onClick={toggleWrap}>
                    {config.wrap ? <Infinity size={16} /> : <ArrowRightLeft size={16} />}
                    {config.wrap ? 'Wrap edges' : 'Solid edges'}
                  </button>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl border border-white/10 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Patterns</h2>
                <span className="text-xs text-[var(--text-muted)]">Drop classics onto the board</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {PATTERNS.map((pattern) => (
                  <button
                    key={pattern.id}
                    className={clsx(
                      buttonClass,
                      'w-full justify-start border-white/5 bg-white/5 text-left hover:border-[var(--accent)]/50',
                    )}
                    onClick={() => applyPattern(pattern.id)}
                  >
                    <Wand2 size={16} />
                    <div className="flex flex-col text-left">
                      <span className="font-semibold">{pattern.label}</span>
                      <span className="text-xs text-[var(--text-muted)]">{pattern.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl border border-white/10 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Themes</h2>
                <Palette size={18} className="text-[var(--accent-strong)]" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.entries(THEMES) as [ThemeId, ThemeConfig][]).map(([id, theme]) => (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className={clsx(
                      buttonClass,
                      'w-full justify-start border-white/10 bg-white/5 text-left',
                      config.theme === id && 'border-[var(--accent)] text-[var(--accent-strong)] shadow-[0_0_0_1px_var(--accent)]',
                    )}
                  >
                    <div
                      className="h-9 w-9 rounded-lg"
                      style={{
                        background: `linear-gradient(135deg, ${theme.properties['--accent']}, ${theme.properties['--accent-strong']})`,
                        boxShadow: `0 10px 30px ${theme.properties['--accent']}55`,
                      }}
                    />
                    <div className="flex flex-col text-left">
                      <span className="font-semibold">{theme.label}</span>
                      <span className="text-xs text-[var(--text-muted)]">{theme.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl border border-white/10 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Rules & Tips</h2>
                <Sparkles size={18} className="text-[var(--accent-strong)]" />
              </div>
              <div className="space-y-2 text-sm text-[var(--text-muted)]">
                <p>
                  <span className="mono font-semibold text-[var(--accent)]">B3 / S23</span> — A cell is born with exactly three
                  neighbors and survives with two or three. Everything else fades.
                </p>
                <p>
                  Use <strong>wrap edges</strong> to simulate a torus, or keep edges solid to watch waves collapse at the border.
                </p>
                <p>
                  The current board, theme, speed, and wrap mode persist in your browser (localStorage) so you can leave and
                  return later.
                </p>
                <p>
                  Ready for more? The state is serialized, so adding sharable URLs or custom rule sets is straightforward when
                  you want them.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 rounded-xl border border-white/10 bg-[color:var(--panel)] px-4 py-3 text-sm text-[var(--text)] shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
