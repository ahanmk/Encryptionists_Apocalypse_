import React, { useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { findRoute } from '../utils/routing'

export default function RoutePanel() {
  const city = useGameStore((state) => state.city)
  const routeMode = useGameStore((state) => state.routeMode)
  const setRouteMode = useGameStore((state) => state.setRouteMode)
  const activeRoute = useGameStore((state) => state.activeRoute)
  const currentNodeId = useGameStore((state) => state.currentNodeId)
  const beaconNodeId = useGameStore((state) => state.beaconNodeId)
  const riskBoosts = useGameStore((state) => state.riskBoosts)
  const gameStatus = useGameStore((state) => state.gameStatus)
  const moveToNextNode = useGameStore((state) => state.moveToNextNode)
  const resetJourney = useGameStore((state) => state.resetJourney)
  const triggerEvent = useGameStore((state) => state.triggerEvent)
  const triggerDefeat = useGameStore((state) => state.triggerDefeat)

  const isAtBeacon = currentNodeId === beaconNodeId || gameStatus === 'won'

  // Calculate comparison routes for all 3 modes from current position to beacon
  const comparison = useMemo(() => {
    if (!currentNodeId || !beaconNodeId) return {}
    return {
      safest: findRoute(city, currentNodeId, beaconNodeId, 'safest', riskBoosts),
      balanced: findRoute(city, currentNodeId, beaconNodeId, 'balanced', riskBoosts),
      fastest: findRoute(city, currentNodeId, beaconNodeId, 'fastest', riskBoosts),
    }
  }, [city, currentNodeId, beaconNodeId, riskBoosts])

  // Plain-language summary based on active mode
  const getModeSummary = () => {
    switch (routeMode) {
      case 'safest':
        return 'Takes the long outer perimeter trail. Circumvents the Swarm Epicenter and high-threat ruins.'
      case 'fastest':
        return 'Direct sprint straight through high-density infected downtown corridors. Minimizes distance at extreme risk.'
      case 'balanced':
      default:
        return 'Tactical compromise. Bypasses ground zero while avoiding exhausting multi-kilometer detours.'
    }
  }

  return (
    <div className="space-y-4">
      {/* Mission Defeat Banner */}
      {gameStatus === 'lost' && (
        <div className="p-4 rounded-lg bg-rose-950/80 border border-rose-500 text-center space-y-2 shadow-lg animate-pulse">
          <div className="w-10 h-10 mx-auto rounded-full bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-400 text-xl font-bold">
            ☠
          </div>
          <h3 className="text-base font-black tracking-widest text-rose-300 font-mono uppercase">
            FAILED TO REACH BEACON
          </h3>
          <div className="text-[11px] font-bold text-rose-400 font-mono uppercase tracking-wider">
            MISSION FAILED — SURVIVOR CASUALTY
          </div>
          <p className="text-xs text-wasteland-200 leading-relaxed">
            Team was wiped out in the quarantine zone. Supplies or vitals reached zero.
          </p>
          <div className="pt-2">
            <button
              onClick={resetJourney}
              className="py-2 px-4 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs tracking-wider uppercase transition-colors"
            >
              Restart Journey from Outpost
            </button>
          </div>
        </div>
      )}

      {/* Beacon Reached Banner */}
      {isAtBeacon && gameStatus !== 'lost' ? (
        <div className="p-4 rounded-lg bg-emerald-950/80 border border-emerald-500 text-center space-y-2 shadow-lg">
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 text-xl font-bold animate-bounce">
            ✓
          </div>
          <h3 className="text-base font-black tracking-widest text-emerald-300 font-mono uppercase">
            BEACON REACHED!
          </h3>
          <p className="text-xs text-wasteland-200 leading-relaxed">
            Aarav and Mira have safely crossed the quarantine zone and entered the fortified colony.
          </p>
          <div className="pt-2">
            <button
              onClick={resetJourney}
              className="py-2 px-4 rounded bg-emerald-500 hover:bg-emerald-400 text-wasteland-950 font-mono font-bold text-xs tracking-wider uppercase transition-colors"
            >
              Restart Journey from Outpost
            </button>
          </div>
        </div>
      ) : null}

      {/* Mode Selection Buttons */}
      <div>
        <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-wasteland-400 block mb-2">
          Pathfinding Algorithm Strategy
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-wasteland-950 rounded border border-wasteland-800">
          <button
            onClick={() => setRouteMode('safest')}
            className={`py-2 text-xs font-mono font-bold rounded transition-colors ${
              routeMode === 'safest'
                ? 'bg-safe-emerald text-white shadow-md'
                : 'text-wasteland-400 hover:text-wasteland-100'
            }`}
          >
            🛡 Safest
          </button>
          <button
            onClick={() => setRouteMode('balanced')}
            className={`py-2 text-xs font-mono font-bold rounded transition-colors ${
              routeMode === 'balanced'
                ? 'bg-beacon-amber text-wasteland-950 shadow-md'
                : 'text-wasteland-400 hover:text-wasteland-100'
            }`}
          >
            ⚖ Balanced
          </button>
          <button
            onClick={() => setRouteMode('fastest')}
            className={`py-2 text-xs font-mono font-bold rounded transition-colors ${
              routeMode === 'fastest'
                ? 'bg-hazard-crimson text-white shadow-md'
                : 'text-wasteland-400 hover:text-wasteland-100'
            }`}
          >
            ⚡ Fastest
          </button>
        </div>
      </div>

      {/* Quick Field Hazard Showcase Buttons */}
      <div className="p-2.5 rounded bg-wasteland-950 border border-wasteland-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-wasteland-400">
            Hazard Showcase
          </span>
          <span className="text-[10px] font-mono text-rose-400 font-bold">1-Click Test</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => triggerEvent('horde_spotted', 'zone-1')}
            disabled={gameStatus !== null}
            className="py-1.5 px-2 rounded bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 font-mono text-[10.5px] font-bold uppercase transition-colors shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <span>🧟 Sudden Horde</span>
          </button>
          <button
            onClick={() => triggerDefeat()}
            disabled={gameStatus === 'lost'}
            className="py-1.5 px-2 rounded bg-rose-900/40 hover:bg-rose-800/60 border border-rose-600/80 text-rose-200 font-mono text-[10.5px] font-bold uppercase transition-colors shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <span>☠ Fail Beacon</span>
          </button>
        </div>
      </div>

      {/* Active Route Plain-Language Tactical Summary */}
      <div className="p-3 rounded bg-wasteland-850 border border-wasteland-800 text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-beacon-amber">
            Tactical Analysis ({routeMode.toUpperCase()})
          </span>
          <span className="text-[10px] font-mono text-wasteland-400">
            {activeRoute ? `${activeRoute.hops} waypoints remaining` : 'No path'}
          </span>
        </div>
        <p className="text-wasteland-200 leading-relaxed text-[11px]">{getModeSummary()}</p>
      </div>

      {/* 3-Mode Comparison Table */}
      <div className="border border-wasteland-800 rounded bg-wasteland-900 overflow-hidden">
        <div className="px-3 py-2 bg-wasteland-950 border-b border-wasteland-800 flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-wasteland-300">
            Path Comparison to Beacon
          </span>
          <span className="text-[10px] font-mono text-wasteland-400">Dijkstra Cost Matrix</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-wasteland-800 text-[10px] text-wasteland-400">
                <th className="py-2 px-2.5">Mode</th>
                <th className="py-2 px-2 text-right">Dist</th>
                <th className="py-2 px-2 text-right">Risk</th>
                <th className="py-2 px-2 text-right">Max</th>
                <th className="py-2 px-2.5 text-right">Hops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wasteland-850 text-[11px]">
              {['safest', 'balanced', 'fastest'].map((m) => {
                const r = comparison[m]
                const isActive = routeMode === m
                return (
                  <tr
                    key={m}
                    onClick={() => setRouteMode(m)}
                    className={`cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-beacon-amber/15 text-wasteland-100 font-bold'
                        : 'hover:bg-wasteland-850/60 text-wasteland-300'
                    }`}
                  >
                    <td className="py-2 px-2.5 capitalize flex items-center gap-1.5">
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-beacon-amber"></span>}
                      {m}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {r ? `${r.totalDistance}m` : '—'}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {r ? (
                        <span
                          className={
                            r.totalRisk <= 15
                              ? 'text-emerald-400'
                              : r.totalRisk <= 30
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }
                        >
                          {r.totalRisk}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {r ? (
                        <span
                          className={
                            r.maxRisk <= 3
                              ? 'text-emerald-400'
                              : r.maxRisk <= 6
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }
                        >
                          {r.maxRisk}/10
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-right">{r ? r.hops : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controls: Advance One Step & Reset */}
      <div className="space-y-2 pt-1">
        <button
          onClick={moveToNextNode}
          disabled={isAtBeacon || !activeRoute || activeRoute.hops === 0 || gameStatus !== null}
          className={`w-full py-2.5 px-4 rounded font-mono font-bold text-xs tracking-wider uppercase transition-colors shadow-lg flex items-center justify-center gap-2 ${
            isAtBeacon || !activeRoute || activeRoute.hops === 0 || gameStatus !== null
              ? 'bg-wasteland-800 text-wasteland-500 cursor-not-allowed'
              : 'bg-beacon-amber hover:bg-beacon-glow text-wasteland-950 cursor-pointer'
          }`}
        >
          <span>Advance One Step</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>

        <button
          onClick={resetJourney}
          className="w-full py-2 px-4 rounded bg-wasteland-850 hover:bg-wasteland-800 text-wasteland-300 font-mono text-xs tracking-wider uppercase transition-colors border border-wasteland-700"
        >
          Reset Journey
        </button>
      </div>
    </div>
  )
}
