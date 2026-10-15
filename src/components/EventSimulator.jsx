import React, { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getEdgeKey } from '../utils/routing'

export default function EventSimulator() {
  const city = useGameStore((state) => state.city)
  const eventsTemplates = useGameStore((state) => state.eventsTemplates) || []
  const activeThreats = useGameStore((state) => state.activeThreats) || []
  const autoEvents = useGameStore((state) => state.autoEvents)
  const setAutoEvents = useGameStore((state) => state.setAutoEvents)
  const triggerEvent = useGameStore((state) => state.triggerEvent)
  const triggerRandomEvent = useGameStore((state) => state.triggerRandomEvent)
  const activeRoute = useGameStore((state) => state.activeRoute)
  const gameStatus = useGameStore((state) => state.gameStatus)
  const triggerDefeat = useGameStore((state) => state.triggerDefeat)

  // Local target selectors
  const [selectedZone, setSelectedZone] = useState(city.dangerZones[0]?.id || 'zone-1')
  const [selectedSurvivor, setSelectedSurvivor] = useState('aarav')
  const [selectedSupplyNode, setSelectedSupplyNode] = useState(
    city.nodes.find((n) => n.type === 'supply' || n.type === 'hospital')?.id || 'node-4'
  )
  const [selectedRoad, setSelectedRoad] = useState(
    getEdgeKey(city.edges[0].from, city.edges[0].to)
  )
  const [notice, setNotice] = useState(null)

  // Helper to trigger and display banner
  const handleTrigger = (eventId, target, customNotice) => {
    triggerEvent(eventId, target)
    setNotice(customNotice || `Event triggered: ${eventId.replace('_', ' ').toUpperCase()}`)
    setTimeout(() => setNotice(null), 6000)
  }

  const handleRandom = () => {
    triggerRandomEvent()
    setNotice('Random event rolled! Path recalculated.')
    setTimeout(() => setNotice(null), 6000)
  }

  return (
    <div className="space-y-4">
      {/* Route Change / Threat Alert Banner */}
      {notice && (
        <div className="p-3 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-mono flex items-center justify-between gap-2 shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">⚡</span>
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-amber-400 hover:text-white font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ACTIVE THREATS BOARD */}
      <div className="p-3 rounded-lg bg-wasteland-850 border border-wasteland-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-wasteland-300 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                activeThreats.length > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
              }`}
            ></span>
            Active Field Threats ({activeThreats.length})
          </span>
          <span className="text-[10px] font-mono text-wasteland-500">Auto-clears as party moves</span>
        </div>

        {activeThreats.length > 0 ? (
          <div className="space-y-2">
            {activeThreats.map((threat) => (
              <div
                key={threat.id}
                className="p-2.5 rounded bg-wasteland-900 border border-rose-900/60 text-xs font-mono space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400 flex items-center gap-1.5">
                    <span>⚠</span>
                    <span>{threat.name}</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                    {threat.stepsLeft} steps remaining
                  </span>
                </div>
                <p className="text-[11px] text-wasteland-300">{threat.description}</p>
                <div className="text-[10px] text-wasteland-500">
                  Affects {threat.edgeKeys.length} road corridors (+{threat.boost} Risk)
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 rounded bg-wasteland-900 border border-wasteland-800 text-xs font-mono text-wasteland-400">
            ✓ No active dynamic threats. Ambient quarantine risk levels normal.
          </div>
        )}
      </div>

      {/* RANDOM EVENT GENERATOR CONTROLS */}
      <div className="p-3 rounded-lg bg-wasteland-850 border border-wasteland-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-wasteland-400">
            Field Event Simulation
          </span>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
            <input
              type="checkbox"
              checked={autoEvents}
              onChange={(e) => setAutoEvents(e.target.checked)}
              className="rounded bg-wasteland-900 border-wasteland-700 text-beacon-amber focus:ring-0"
            />
            <span className={autoEvents ? 'text-beacon-amber font-bold' : 'text-wasteland-400'}>
              Auto Events (25%/step)
            </span>
          </label>
        </div>

        <button
          onClick={handleRandom}
          disabled={gameStatus !== null}
          className="w-full py-2.5 px-4 rounded bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-wasteland-950 font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>🎲 Roll Random Event</span>
        </button>

        {/* Instant Showcase Buttons for Judges / User */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-wasteland-800">
          <button
            onClick={() =>
              handleTrigger(
                'horde_spotted',
                selectedZone,
                '🚨 SUDDEN ZOMBIE HORDE DETECTED! Route pathfinder actively bypassing horde zone.'
              )
            }
            disabled={gameStatus !== null}
            className="py-2 px-2.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 font-mono text-[11px] font-bold uppercase transition-colors shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>🧟 Sudden Zombie Horde</span>
          </button>
          <button
            onClick={() => triggerDefeat()}
            disabled={gameStatus === 'lost'}
            className="py-2 px-2.5 rounded bg-rose-900/40 hover:bg-rose-800/60 border border-rose-600/80 text-rose-200 font-mono text-[11px] font-bold uppercase transition-colors shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>☠ Failed to Reach Beacon</span>
          </button>
        </div>
      </div>

      {/* MANUAL EVENT TRIGGER CATALOG */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-wasteland-400 block px-1">
          Tactical Event Catalog (6 Scenarios)
        </span>

        {/* 1. Sudden Zombie Horde */}
        <div className="p-3 rounded bg-wasteland-850 border border-wasteland-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-rose-400 font-mono flex items-center gap-1.5">
              <span>🧟</span>
              <span>1. Sudden Zombie Horde (+4 Risk)</span>
            </span>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-900 font-bold">
              5 Steps
            </span>
          </div>
          <p className="text-[11px] text-wasteland-300">
            A sudden massive horde floods into the sector. Adds +4 risk to all connecting roads and triggers Dijkstra rerouting.
          </p>
          <div className="flex gap-2">
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="flex-1 bg-wasteland-900 border border-wasteland-700 rounded px-2 py-1 text-xs font-mono text-wasteland-200"
            >
              {city.dangerZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.threatLevel})
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                handleTrigger(
                  'horde_spotted',
                  selectedZone,
                  '🚨 SUDDEN ZOMBIE HORDE DETECTED! Route pathfinder actively bypassing horde zone.'
                )
              }
              className="py-1 px-3 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-mono text-xs font-bold border border-rose-700 transition-colors cursor-pointer"
            >
              Spawn Horde
            </button>
          </div>
        </div>

        {/* 2. Road Blocked */}
        <div className="p-3 rounded bg-wasteland-850 border border-wasteland-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-wasteland-100 font-mono">
              2. Road Collapse (+10 Risk)
            </span>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-900">
              8 Steps
            </span>
          </div>
          <p className="text-[11px] text-wasteland-400">
            Blocks corridor with rubble. Forces Dijkstra pathfinder to reroute around it.
          </p>
          <div className="flex gap-2">
            <select
              value={selectedRoad}
              onChange={(e) => setSelectedRoad(e.target.value)}
              className="flex-1 bg-wasteland-900 border border-wasteland-700 rounded px-2 py-1 text-xs font-mono text-wasteland-200"
            >
              {/* Prioritize edges along the active path */}
              {activeRoute && activeRoute.path && activeRoute.path.length > 1
                ? activeRoute.path.slice(0, -1).map((nodeId, idx) => {
                    const nextId = activeRoute.path[idx + 1]
                    const key = getEdgeKey(nodeId, nextId)
                    return (
                      <option key={`path-${key}`} value={key}>
                        Active Route Road: {nodeId} ↔ {nextId}
                      </option>
                    )
                  })
                : null}
              {city.edges.slice(0, 15).map((e) => {
                const key = getEdgeKey(e.from, e.to)
                return (
                  <option key={key} value={key}>
                    Road: {e.from} ↔ {e.to} (Base Risk {e.risk})
                  </option>
                )
              })}
            </select>
            <button
              onClick={() =>
                handleTrigger(
                  'road_blocked',
                  selectedRoad,
                  'Road blocked! Route recalculated: avoiding collapsed corridor.'
                )
              }
              className="py-1 px-3 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-300 font-mono text-xs font-bold border border-rose-700 transition-colors cursor-pointer"
            >
              Block
            </button>
          </div>
        </div>

        {/* 3. Ambush */}
        <div className="p-3 rounded bg-wasteland-850 border border-wasteland-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-wasteland-100 font-mono">
              3. Stalker Ambush (-20 HP)
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-900">
              Instant
            </span>
          </div>
          <p className="text-[11px] text-wasteland-400">
            Immediate surprise attack on one survivor.
          </p>
          <div className="flex gap-2">
            <select
              value={selectedSurvivor}
              onChange={(e) => setSelectedSurvivor(e.target.value)}
              className="flex-1 bg-wasteland-900 border border-wasteland-700 rounded px-2 py-1 text-xs font-mono text-wasteland-200"
            >
              <option value="aarav">Aarav (Scout)</option>
              <option value="mira">Mira (Medic)</option>
            </select>
            <button
              onClick={() =>
                handleTrigger(
                  'ambush',
                  selectedSurvivor,
                  `Ambush triggered on ${selectedSurvivor.toUpperCase()}! -20 HP taken.`
                )
              }
              className="py-1 px-3 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-300 font-mono text-xs font-bold border border-amber-700 transition-colors cursor-pointer"
            >
              Ambush
            </button>
          </div>
        </div>

        {/* 4. Supply Drop */}
        <div className="p-3 rounded bg-wasteland-850 border border-wasteland-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-wasteland-100 font-mono">
              4. Emergency Airdrop
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-900">
              Restock
            </span>
          </div>
          <p className="text-[11px] text-wasteland-400">
            Drops sealed crates (+40 Food, +40 Water, +15 Ammo) at target node.
          </p>
          <div className="flex gap-2">
            <select
              value={selectedSupplyNode}
              onChange={(e) => setSelectedSupplyNode(e.target.value)}
              className="flex-1 bg-wasteland-900 border border-wasteland-700 rounded px-2 py-1 text-xs font-mono text-wasteland-200"
            >
              {city.nodes
                .filter((n) => n.type === 'supply' || n.type === 'hospital')
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
            </select>
            <button
              onClick={() =>
                handleTrigger(
                  'supply_drop',
                  selectedSupplyNode,
                  'Supply pod dropped! Waypoint restocked.'
                )
              }
              className="py-1 px-3 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 font-mono text-xs font-bold border border-emerald-700 transition-colors cursor-pointer"
            >
              Drop
            </button>
          </div>
        </div>

        {/* 5. Night Falls */}
        <div className="p-3 rounded bg-wasteland-850 border border-wasteland-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-wasteland-100 font-mono">
              5. Nightfall Smog (+2 Global Risk)
            </span>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-900">
              4 Steps
            </span>
          </div>
          <p className="text-[11px] text-wasteland-400">
            Increases risk by +2 across every road in the city.
          </p>
          <button
            onClick={() =>
              handleTrigger(
                'night_falls',
                null,
                'Nightfall fell: all city roads +2 risk for 4 steps.'
              )
            }
            className="w-full py-1.5 px-3 rounded bg-purple-950 hover:bg-purple-900 text-purple-300 font-mono text-xs font-bold border border-purple-800 transition-colors cursor-pointer"
          >
            Trigger Nightfall
          </button>
        </div>

        {/* 6. Radio Update */}
        <div className="p-3 rounded bg-wasteland-850 border border-wasteland-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-wasteland-100 font-mono">
              6. Radio Broadcast Intercept
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-900">
              Intel
            </span>
          </div>
          <p className="text-[11px] text-wasteland-400">
            Radio message log entry hinting safe movement corridors.
          </p>
          <button
            onClick={() =>
              handleTrigger(
                'radio_update',
                null,
                'Beacon broadcast decoded: reconnaissance logged.'
              )
            }
            className="w-full py-1.5 px-3 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-mono text-xs font-bold border border-cyan-800 transition-colors cursor-pointer"
          >
            Transmit Intel
          </button>
        </div>
      </div>
    </div>
  )
}
