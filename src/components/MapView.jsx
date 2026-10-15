import React, { useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getEdgeKey } from '../utils/routing'

/**
 * Helper to map edge risk (0 to 10) to a post-apocalyptic danger color.
 * Low risk = muted safe green, high risk = intense hazard crimson.
 */
function getRiskColor(risk) {
  if (risk <= 2) return '#10b981' // Emerald safe
  if (risk <= 4) return '#84cc16' // Yellow-green low threat
  if (risk <= 6) return '#eab308' // Amber moderate threat
  if (risk <= 8) return '#f97316' // Orange high danger
  return '#ef4444' // Crimson deadly hazard
}

/**
 * Node style config by type
 */
const NODE_STYLES = {
  start: {
    color: '#fbbf24',
    bg: '#78350f',
    label: 'START',
    radius: 12,
  },
  beacon: {
    color: '#38bdf8',
    bg: '#0c4a6e',
    label: 'BEACON',
    radius: 14,
  },
  safehouse: {
    color: '#60a5fa',
    bg: '#1e3a8a',
    label: 'SAFEHOUSE',
    radius: 9,
  },
  supply: {
    color: '#34d399',
    bg: '#064e3b',
    label: 'SUPPLY',
    radius: 9,
  },
  hospital: {
    color: '#f43f5e',
    bg: '#881337',
    label: 'MEDIC',
    radius: 10,
  },
  normal: {
    color: '#94a3b8',
    bg: '#1e293b',
    label: 'WAYPOINT',
    radius: 7,
  },
}

export default function MapView() {
  const city = useGameStore((state) => state.city)
  const selectedNodeId = useGameStore((state) => state.selectedNodeId)
  const currentNodeId = useGameStore((state) => state.currentNodeId)
  const activeRoute = useGameStore((state) => state.activeRoute)
  const routeMode = useGameStore((state) => state.routeMode)
  const moveToNextNode = useGameStore((state) => state.moveToNextNode)
  const visitedNodeIds = useGameStore((state) => state.visitedNodeIds) || []
  const lootedNodeIds = useGameStore((state) => state.lootedNodeIds) || []
  const gameStatus = useGameStore((state) => state.gameStatus)
  const activeThreats = useGameStore((state) => state.activeThreats) || []
  const routeTarget = useGameStore((state) => state.routeTarget)
  const beaconNodeId = useGameStore((state) => state.beaconNodeId)
  const selectNode = useGameStore((state) => state.selectNode)
  const characters = useGameStore((state) => state.characters)
  const resetJourney = useGameStore((state) => state.resetJourney)
  const triggerEvent = useGameStore((state) => state.triggerEvent)
  const triggerDefeat = useGameStore((state) => state.triggerDefeat)

  const isAtBeacon = currentNodeId === beaconNodeId || gameStatus === 'won'
  const activeHordeThreat = activeThreats.find((t) => t.eventId === 'horde_spotted')

  // Fast node lookup by ID
  const nodeMap = useMemo(() => {
    const map = new Map()
    city.nodes.forEach((node) => map.set(node.id, node))
    return map
  }, [city.nodes])

  // Build polygon coordinate points string for danger zones
  const dangerZonePolygons = useMemo(() => {
    return (city.dangerZones || []).map((zone) => {
      const zoneNodes = zone.nodeIds
        .map((id) => nodeMap.get(id))
        .filter(Boolean)

      if (zoneNodes.length < 3) return null

      // Calculate centroid
      const cx = zoneNodes.reduce((acc, n) => acc + n.x, 0) / zoneNodes.length
      const cy = zoneNodes.reduce((acc, n) => acc + n.y, 0) / zoneNodes.length

      // Sort points clockwise by angle around centroid for a clean polygon
      const sorted = [...zoneNodes].sort((a, b) => {
        const angleA = Math.atan2(a.y - cy, a.x - cx)
        const angleB = Math.atan2(b.y - cy, b.x - cx)
        return angleA - angleB
      })

      // Expand polygon slightly outward from centroid for visual breathing room
      const points = sorted
        .map((n) => {
          const dx = n.x - cx
          const dy = n.y - cy
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const padding = 45 // padding radius around nodes
          const exX = n.x + (dx / dist) * padding
          const exY = n.y + (dy / dist) * padding
          return `${exX},${exY}`
        })
        .join(' ')

      return {
        ...zone,
        points,
        cx,
        cy,
      }
    }).filter(Boolean)
  }, [city.dangerZones, nodeMap])

  // Segments for the active planned route (with midpoint arrows)
  const routeSegments = useMemo(() => {
    if (!activeRoute || !activeRoute.path || activeRoute.path.length < 2) return []

    const segments = []
    for (let i = 0; i < activeRoute.path.length - 1; i++) {
      const from = nodeMap.get(activeRoute.path[i])
      const to = nodeMap.get(activeRoute.path[i + 1])
      if (from && to) {
        const dx = to.x - from.x
        const dy = to.y - from.y
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)
        const mx = (from.x + to.x) / 2
        const my = (from.y + to.y) / 2
        segments.push({ from, to, mx, my, angle })
      }
    }
    return segments
  }, [activeRoute, nodeMap])

  // Collect edge keys under active dynamic threats
  const threatEdgeKeys = useMemo(() => {
    const keys = new Set()
    for (const t of activeThreats) {
      if (t.edgeKeys) {
        t.edgeKeys.forEach((k) => keys.add(k))
      }
    }
    return keys
  }, [activeThreats])

  return (
    <div className="relative w-full h-full bg-wasteland-950 flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-hidden">
      {/* Map HUD Legend */}
      <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-2 px-2 py-1 mb-2 text-xs font-mono text-wasteland-400 bg-wasteland-900/80 border border-wasteland-800 rounded-md backdrop-blur">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-wasteland-500 font-bold uppercase tracking-wider">Nodes:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Start
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Beacon
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Supply
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Hospital
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> Safehouse
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Normal
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-wasteland-500 font-bold uppercase tracking-wider">Road Risk:</span>
          <span className="text-emerald-400">0 (Safe)</span>
          <div className="w-16 h-1.5 rounded bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600"></div>
          <span className="text-rose-500">10 (Deadly)</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-square max-w-5xl max-h-[80vh] rounded-lg border border-wasteland-800 bg-[#0a0c0e] shadow-2xl overflow-hidden">
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <style>
              {`
                @keyframes march {
                  from { stroke-dashoffset: 28; }
                  to { stroke-dashoffset: 0; }
                }
                .route-march {
                  animation: march 1.2s linear infinite;
                }
              `}
            </style>

            {/* Subtle grid pattern */}
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1f2429" strokeWidth="0.8" />
            </pattern>

            {/* Danger zone hatch patterns */}
            <pattern id="hatch-high" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#ef4444" strokeWidth="2.5" opacity="0.35" />
            </pattern>
            <pattern id="hatch-medium" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="16" stroke="#f59e0b" strokeWidth="2" opacity="0.3" />
            </pattern>
            <pattern id="hatch-low" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="20" stroke="#10b981" strokeWidth="1.5" opacity="0.25" />
            </pattern>

            {/* Beacon pulse glow */}
            <filter id="beacon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Active Route golden glow */}
            <filter id="route-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Node selection drop shadow */}
            <filter id="selection-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background grid */}
          <rect width="1000" height="1000" fill="url(#grid)" />

          {/* Compass Rose / Sector Overlay */}
          <g opacity="0.12" stroke="#ced4da" strokeWidth="1" fill="none">
            <circle cx="500" cy="500" r="420" strokeDasharray="4 8" />
            <circle cx="500" cy="500" r="240" strokeDasharray="3 6" />
            <line x1="500" y1="40" x2="500" y2="960" strokeDasharray="4 6" />
            <line x1="40" y1="500" x2="960" y2="500" strokeDasharray="4 6" />
          </g>

          {/* DANGER ZONES (Rendered as translucent shaded regions) */}
          <g id="danger-zones">
            {dangerZonePolygons.map((zone) => {
              const isHordeActive = activeThreats.some(
                (t) => t.eventId === 'horde_spotted' && (t.zoneId === zone.id || (!t.zoneId && zone.threatLevel === 'high'))
              )
              const isHigh = zone.threatLevel === 'high'
              const isMed = zone.threatLevel === 'medium'
              const strokeColor = isHordeActive ? '#ef4444' : isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#10b981'
              const patternId = isHordeActive || isHigh ? 'url(#hatch-high)' : isMed ? 'url(#hatch-medium)' : 'url(#hatch-low)'

              return (
                <g key={zone.id} className="pointer-events-none transition-opacity duration-300">
                  <polygon
                    points={zone.points}
                    fill={patternId}
                    stroke={strokeColor}
                    strokeWidth={isHordeActive ? "3.5" : "1.5"}
                    strokeDasharray={isHordeActive ? "8 4" : "6 4"}
                    opacity={isHordeActive ? "0.95" : "0.8"}
                    className={isHordeActive ? "animate-pulse" : undefined}
                  />
                  <text
                    x={zone.cx}
                    y={zone.cy - (isHordeActive ? 18 : 10)}
                    textAnchor="middle"
                    fill={strokeColor}
                    fontSize={isHordeActive ? "14" : "13"}
                    fontWeight="bold"
                    letterSpacing="1.5"
                    fontFamily="monospace"
                    opacity="0.95"
                    className="select-none"
                  >
                    {isHordeActive ? '🚨 SUDDEN ZOMBIE HORDE INFESTATION' : `⚠ ${zone.name.toUpperCase()} [${zone.threatLevel.toUpperCase()}]`}
                  </text>
                  {isHordeActive && (
                    <g transform={`translate(${zone.cx}, ${zone.cy + 12})`}>
                      <rect
                        x="-75"
                        y="-13"
                        width="150"
                        height="26"
                        rx="4"
                        fill="#881337"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        🧟 SUDDEN ZOMBIE HORDE
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>

          {/* ROADS / EDGES */}
          <g id="edges">
            {city.edges.map((edge, idx) => {
              const fromNode = nodeMap.get(edge.from)
              const toNode = nodeMap.get(edge.to)
              if (!fromNode || !toNode) return null

              const edgeColor = getRiskColor(edge.risk)
              const edgeKey = getEdgeKey(edge.from, edge.to)
              const isThreatened = threatEdgeKeys.has(edgeKey)
              const isSelectedEdge =
                selectedNodeId && (edge.from === selectedNodeId || edge.to === selectedNodeId)

              return (
                <g key={`edge-${idx}`}>
                  {/* Shadow/halo line for readability against dark bg */}
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="#08090a"
                    strokeWidth={isSelectedEdge ? "6" : "4"}
                    strokeLinecap="round"
                  />
                  {/* Road colored by risk */}
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={edgeColor}
                    strokeWidth={isSelectedEdge ? "3.5" : "2"}
                    strokeOpacity={isSelectedEdge ? "1" : "0.75"}
                    strokeDasharray={edge.risk >= 8 ? "6 3" : undefined}
                    strokeLinecap="round"
                    className="transition-all duration-200"
                  />
                  {/* Active Threat Pulsing Highlight on this road */}
                  {isThreatened && (
                    <g>
                      <line
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke="#ef4444"
                        strokeWidth="5"
                        strokeDasharray="6 4"
                        strokeOpacity="0.9"
                        className="animate-pulse"
                      />
                      <text
                        x={(fromNode.x + toNode.x) / 2}
                        y={(fromNode.y + toNode.y) / 2 + 3}
                        fill="#ef4444"
                        fontSize="10"
                        textAnchor="middle"
                        fontWeight="bold"
                        className="select-none pointer-events-none"
                      >
                        ⚠
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>

          {/* ACTIVE PLANNED ROUTE OVERLAY */}
          <g id="active-route" className="pointer-events-none">
            {routeSegments.map((seg, idx) => (
              <g key={`route-seg-${idx}`}>
                {/* Broad glowing path aura */}
                <line
                  x1={seg.from.x}
                  y1={seg.from.y}
                  x2={seg.to.x}
                  y2={seg.to.y}
                  stroke="#fbbf24"
                  strokeWidth="8"
                  strokeOpacity="0.45"
                  filter="url(#route-glow)"
                  strokeLinecap="round"
                />
                {/* Foreground animated dashed line */}
                <line
                  x1={seg.from.x}
                  y1={seg.from.y}
                  x2={seg.to.x}
                  y2={seg.to.y}
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeDasharray="10 6"
                  strokeLinecap="round"
                  className="route-march"
                />
                {/* Directional arrow chevron at segment midpoint */}
                <g transform={`translate(${seg.mx}, ${seg.my}) rotate(${seg.angle})`}>
                  <polygon
                    points="-6,-4 4,0 -6,4 -3,0"
                    fill="#fbbf24"
                    stroke="#08090a"
                    strokeWidth="0.8"
                  />
                </g>
              </g>
            ))}
          </g>

          {/* NODES / WAYPOINTS */}
          <g id="nodes">
            {city.nodes.map((node) => {
              const style = NODE_STYLES[node.type] || NODE_STYLES.normal
              const isSelected = selectedNodeId === node.id
              const isCurrent = currentNodeId === node.id
              const isBeacon = node.type === 'beacon'
              const isVisited = visitedNodeIds.includes(node.id) && !isCurrent

              return (
                <g
                  key={node.id}
                  onClick={() => selectNode(node.id)}
                  className={`cursor-pointer group transition-opacity duration-300 ${
                    isVisited ? 'opacity-40 hover:opacity-85' : 'opacity-100'
                  }`}
                >
                  {/* Radar pulse around current position (Aarav & Mira) */}
                  {isCurrent && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={style.radius + 14}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="2"
                      className="animate-pulse-ring"
                    />
                  )}

                  {/* Beacon extra halo */}
                  {isBeacon && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={style.radius + 12}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      filter="url(#beacon-glow)"
                      className="animate-spin"
                      style={{ transformOrigin: `${node.x}px ${node.y}px`, animationDuration: '18s' }}
                    />
                  )}

                  {/* Selection Reticle Ring */}
                  {isSelected && (
                    <g filter="url(#selection-glow)">
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={style.radius + 8}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2.5"
                        strokeDasharray="3 3"
                      />
                      <line x1={node.x - style.radius - 12} y1={node.y} x2={node.x - style.radius - 4} y2={node.y} stroke="#fbbf24" strokeWidth="2" />
                      <line x1={node.x + style.radius + 4} y1={node.y} x2={node.x + style.radius + 12} y2={node.y} stroke="#fbbf24" strokeWidth="2" />
                      <line x1={node.x} y1={node.y - style.radius - 12} x2={node.x} y2={node.y - style.radius - 4} stroke="#fbbf24" strokeWidth="2" />
                      <line x1={node.x} y1={node.y + style.radius + 4} x2={node.x} y2={node.y + style.radius + 12} stroke="#fbbf24" strokeWidth="2" />
                    </g>
                  )}

                  {/* Base node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? style.radius + 3 : style.radius}
                    fill={isVisited ? '#1e293b' : style.bg}
                    stroke={isVisited ? '#64748b' : style.color}
                    strokeWidth={isSelected ? '3' : '2'}
                    className="transition-transform duration-200 group-hover:scale-125"
                    filter={isBeacon ? 'url(#beacon-glow)' : undefined}
                  />

                  {/* Visited Checkmark Badge */}
                  {isVisited && (
                    <text
                      x={node.x}
                      y={node.y + 3}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ✓
                    </text>
                  )}

                  {/* Icon glyph inside special unvisited nodes */}
                  {!isVisited && node.type === 'hospital' && (
                    <g stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round">
                      <line x1={node.x - 4} y1={node.y} x2={node.x + 4} y2={node.y} />
                      <line x1={node.x} y1={node.y - 4} x2={node.x} y2={node.y + 4} />
                    </g>
                  )}

                  {!isVisited && node.type === 'beacon' && (
                    <circle cx={node.x} cy={node.y} r="3" fill="#ffffff" />
                  )}

                  {!isVisited && node.type === 'start' && (
                    <circle cx={node.x} cy={node.y} r="3.5" fill="#ffffff" />
                  )}

                  {/* Node label */}
                  <text
                    x={node.x}
                    y={node.y + style.radius + 13}
                    textAnchor="middle"
                    fill={isVisited ? '#64748b' : isSelected ? '#ffffff' : '#cbd5e1'}
                    fontSize="10.5"
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    className="select-none pointer-events-none drop-shadow-md"
                  >
                    {node.name.length > 18 ? node.name.substring(0, 16) + '…' : node.name}
                  </text>

                  {/* Looted Cache Badge */}
                  {lootedNodeIds.includes(node.id) && (
                    <g transform={`translate(${node.x + style.radius - 2}, ${node.y - style.radius - 6})`}>
                      <rect
                        width="24"
                        height="10"
                        rx="2"
                        fill="#0f172a"
                        stroke="#64748b"
                        strokeWidth="0.8"
                      />
                      <text
                        x="12"
                        y="7.5"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="6.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        LOOTED
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>

          {/* Detour Target Marker (when routing to a non-beacon target) */}
          {routeTarget && routeTarget !== beaconNodeId && nodeMap.get(routeTarget) && (
            <g
              transform={`translate(${nodeMap.get(routeTarget).x}, ${nodeMap.get(routeTarget).y - 28})`}
              className="pointer-events-none"
            >
              <rect
                x="-36"
                y="-13"
                width="72"
                height="15"
                rx="3"
                fill="#0369a1"
                stroke="#38bdf8"
                strokeWidth="1.2"
                className="animate-pulse"
              />
              <text
                x="0"
                y="-2.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                DETOUR TARGET
              </text>
              <polygon points="-4,2 4,2 0,7" fill="#38bdf8" />
            </g>
          )}

          {/* Current Team Location Flag */}
          {currentNodeId && nodeMap.get(currentNodeId) && (
            <g
              transform={`translate(${nodeMap.get(currentNodeId).x - 28}, ${nodeMap.get(currentNodeId).y - 28})`}
              className="pointer-events-none"
            >
              <rect
                x="0"
                y="0"
                width="56"
                height="14"
                rx="3"
                fill="#b45309"
                stroke="#fbbf24"
                strokeWidth="1"
              />
              <text
                x="28"
                y="10.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                AARAV & MIRA
              </text>
            </g>
          )}
        </svg>

        {/* Top-Right Quick Hazard Showcase Pill Bar directly on Map */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 font-mono text-xs pointer-events-auto">
          <button
            onClick={() => triggerEvent('horde_spotted', 'zone-1')}
            disabled={gameStatus !== null}
            title="Spawn a sudden zombie horde in Zone 1"
            className="py-1.5 px-2.5 rounded bg-rose-950/95 hover:bg-rose-900 border border-rose-500 text-rose-300 font-bold text-[11px] shadow-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          >
            <span>🧟</span>
            <span className="hidden sm:inline">Sudden Zombie Horde</span>
            <span className="sm:hidden">Horde</span>
          </button>
          <button
            onClick={() => triggerDefeat()}
            disabled={gameStatus === 'lost'}
            title="Simulate party casualties / failed to reach beacon"
            className="py-1.5 px-2.5 rounded bg-rose-900/50 hover:bg-rose-800/70 border border-rose-500 text-rose-200 font-bold text-[11px] shadow-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          >
            <span>☠</span>
            <span className="hidden sm:inline">Fail Beacon</span>
            <span className="sm:hidden">Fail</span>
          </button>
        </div>

        {/* Floating Sudden Zombie Horde Alert Banner */}
        {activeHordeThreat && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-30 bg-rose-950/95 border-2 border-rose-500 rounded-lg p-2.5 shadow-2xl backdrop-blur animate-pulse flex items-center gap-2.5">
            <span className="text-2xl flex-shrink-0">🧟</span>
            <div className="flex-1 font-mono text-xs">
              <div className="text-rose-400 font-black tracking-wider uppercase flex items-center justify-between">
                <span>🚨 SUDDEN ZOMBIE HORDE ACTIVE</span>
                <span className="text-[10px] bg-rose-900 text-rose-200 px-1.5 py-0.5 rounded font-bold">
                  {activeHordeThreat.stepsLeft} STEPS LEFT
                </span>
              </div>
              <p className="text-[11px] text-rose-200 mt-0.5 leading-snug">
                {activeHordeThreat.name}: Swarming corridors (+{activeHordeThreat.boost} Risk). Dijkstra path is actively rerouting around the horde!
              </p>
            </div>
          </div>
        )}

        {/* No Viable Route Alert (Path Blocked / Cannot Reach Beacon) */}
        {!isAtBeacon && gameStatus !== 'lost' && (!activeRoute || !activeRoute.path || activeRoute.path.length <= 1) && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-30 bg-rose-950/95 border-2 border-rose-500 rounded-lg p-3 text-center text-rose-200 font-mono text-xs shadow-2xl animate-pulse">
            <div className="font-bold text-rose-400 text-xs mb-1 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <span>⚠️ FAILED TO REACH BEACON</span>
            </div>
            <p className="text-[11px] text-wasteland-200 leading-snug">
              No viable pathway connects current position to the Beacon Sanctuary! Hostile rubble or collapses have completely severed access.
            </p>
          </div>
        )}

        {/* High-Impact Fullscreen Overlay for FAILED TO REACH BEACON */}
        {gameStatus === 'lost' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-wasteland-950 border-2 border-rose-600 rounded-xl p-6 text-center space-y-4 shadow-2xl animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-950/80 border-2 border-rose-500 flex items-center justify-center text-rose-500 text-3xl font-bold animate-pulse">
                ☠
              </div>
              <div>
                <h2 className="text-xl font-black tracking-widest text-rose-400 font-mono uppercase">
                  FAILED TO REACH BEACON
                </h2>
                <p className="text-xs font-bold text-rose-300 font-mono mt-1 tracking-wider uppercase">
                  MISSION FAILED — PARTY INCAPACITATED
                </p>
              </div>
              <p className="text-xs text-wasteland-300 leading-relaxed font-mono bg-wasteland-900 p-3 rounded border border-rose-950">
                The survivor party was overwhelmed by quarantine hazards. Health or water reserves reached zero before reaching the safe haven.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-left bg-wasteland-900/60 p-2.5 rounded border border-wasteland-800">
                <div>
                  <span className="text-wasteland-400">Aarav:</span>{' '}
                  <span className={(characters?.aarav?.supplies?.health ?? 100) <= 0 ? 'text-rose-400 font-bold' : 'text-wasteland-200'}>
                    {characters?.aarav?.supplies?.health ?? 0} HP • {characters?.aarav?.supplies?.water ?? 0}% Water
                  </span>
                </div>
                <div>
                  <span className="text-wasteland-400">Mira:</span>{' '}
                  <span className={(characters?.mira?.supplies?.health ?? 100) <= 0 ? 'text-rose-400 font-bold' : 'text-wasteland-200'}>
                    {characters?.mira?.supplies?.health ?? 0} HP • {characters?.mira?.supplies?.water ?? 0}% Water
                  </span>
                </div>
              </div>
              <button
                onClick={resetJourney}
                className="w-full py-3 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-sm tracking-wider uppercase transition-all shadow-lg cursor-pointer"
              >
                ↺ Restart Journey from Outpost Zero
              </button>
            </div>
          </div>
        )}

        {/* Floating Tactical Route HUD directly on the map */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-wasteland-950/90 border border-wasteland-700/80 rounded-lg px-3 py-2 backdrop-blur shadow-2xl flex items-center justify-between gap-3 text-xs font-mono z-10 pointer-events-auto">
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${gameStatus === 'lost' ? 'bg-rose-500' : 'bg-beacon-amber'} animate-ping`}></span>
              <span className="text-[10px] text-wasteland-400 font-bold uppercase tracking-wider">
                {gameStatus === 'lost' ? 'STATUS:' : 'ACTIVE ROUTE:'}
              </span>
              <span className={`font-bold uppercase ${gameStatus === 'lost' ? 'text-rose-400' : 'text-beacon-amber'}`}>
                {gameStatus === 'lost' ? 'DEFEAT' : routeMode}
              </span>
            </div>
            <div className="text-[11px] text-wasteland-300 mt-0.5">
              {gameStatus === 'lost' ? (
                <span className="text-rose-400 font-bold">☠ FAILED TO REACH BEACON: Party incapacitated.</span>
              ) : gameStatus === 'won' ? (
                <span className="text-emerald-400 font-bold">✓ Beacon Sanctuary Reached!</span>
              ) : activeRoute && activeRoute.hops > 0 ? (
                <span>{activeRoute.totalDistance}m • Risk {activeRoute.totalRisk} • {activeRoute.hops} waypoints left</span>
              ) : (
                <span className="text-rose-400 font-bold">⚠️ FAILED TO REACH BEACON: Route blocked!</span>
              )}
            </div>
          </div>

          <button
            onClick={moveToNextNode}
            disabled={!activeRoute || activeRoute.hops === 0 || gameStatus !== null}
            className={`py-1.5 px-3 rounded font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-colors flex-shrink-0 ${
              !activeRoute || activeRoute.hops === 0 || gameStatus !== null
                ? 'bg-wasteland-800 text-wasteland-500 cursor-not-allowed'
                : 'bg-beacon-amber hover:bg-beacon-glow text-wasteland-950 shadow-md cursor-pointer'
            }`}
          >
            <span>Advance Step</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
