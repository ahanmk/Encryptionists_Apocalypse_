import React, { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getStatus } from '../utils/supplies'
import RoutePanel from './RoutePanel'
import SupplyPanel from './SupplyPanel'
import EventSimulator from './EventSimulator'
import DecisionPanel from './DecisionPanel'
import SyncPanel from './SyncPanel'

export default function Sidebar() {
  // Default to 'routes' tab so the Step 2 route planner features are immediately visible
  const [activeTab, setActiveTab] = useState('routes') // 'routes' | 'intel' | 'supplies' | 'events' | 'decisions' | 'sync'

  const city = useGameStore((state) => state.city)
  const selectedNodeId = useGameStore((state) => state.selectedNodeId)
  const currentNodeId = useGameStore((state) => state.currentNodeId)
  const setCurrentNode = useGameStore((state) => state.setCurrentNode)
  const characters = useGameStore((state) => state.characters)
  const gameStatus = useGameStore((state) => state.gameStatus)
  const resetJourney = useGameStore((state) => state.resetJourney)

  // Find currently selected node object
  const selectedNode = city.nodes.find((n) => n.id === selectedNodeId) || city.nodes[0]

  // Find danger zone if selected node belongs to any
  const containingDangerZones = (city.dangerZones || []).filter((zone) =>
    zone.nodeIds.includes(selectedNode?.id)
  )

  // Find edges connected to selected node
  const connectedEdges = (city.edges || [])
    .filter((e) => e.from === selectedNode?.id || e.to === selectedNode?.id)
    .map((e) => {
      const neighborId = e.from === selectedNode?.id ? e.to : e.from
      const neighborNode = city.nodes.find((n) => n.id === neighborId)
      return {
        ...e,
        neighbor: neighborNode,
      }
    })

  const isCurrentLocation = selectedNode?.id === currentNodeId

  return (
    <aside className="w-full lg:w-96 flex flex-col bg-wasteland-900 border-l border-wasteland-800 h-full overflow-y-auto">
      {/* Survivor Party Status Widget */}
      <div className="p-3 sm:p-4 border-b border-wasteland-800 bg-wasteland-950/60">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-wasteland-400">
            Field Unit Status
          </span>
          {gameStatus === 'lost' ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-950/80 text-rose-400 border border-rose-800 animate-pulse font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              FAILED TO REACH BEACON
            </span>
          ) : gameStatus === 'won' ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              BEACON REACHED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-safe-emerald/20 text-safe-green border border-safe-emerald/40 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-safe-green animate-pulse"></span>
              ACTIVE
            </span>
          )}
        </div>

        {/* Prominent FAILED TO REACH BEACON Alert Card */}
        {gameStatus === 'lost' && (
          <div className="mb-2.5 p-2.5 rounded bg-rose-950/90 border border-rose-500 text-center space-y-1 shadow-lg">
            <div className="text-rose-400 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
              <span>☠</span>
              <span>FAILED TO REACH BEACON</span>
            </div>
            <p className="text-[10px] text-rose-200 font-mono leading-tight">
              Party incapacitated in quarantine zone. Mission failed.
            </p>
            <button
              onClick={resetJourney}
              className="mt-1 w-full py-1.5 px-2.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-[10px] tracking-wider uppercase transition-colors"
            >
              ↺ Restart Journey
            </button>
          </div>
        )}

        {/* Aarav & Mira Supplies Bar */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {Object.entries(characters).map(([key, char]) => {
            const status = getStatus(char)
            const sup = char.supplies
            return (
              <div
                key={key}
                className={`p-2 rounded bg-wasteland-900 border flex flex-col justify-between ${
                  status === 'critical'
                    ? 'border-rose-700/80 bg-rose-950/20'
                    : status === 'low'
                    ? 'border-amber-700/80 bg-amber-950/20'
                    : 'border-wasteland-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-wasteland-800 pb-1 mb-1.5">
                  <span className="font-bold text-beacon-amber text-[11px]">{char.name}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                      status === 'critical'
                        ? 'text-rose-400'
                        : status === 'low'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="space-y-0.5 text-[10.5px]">
                  <div className="flex justify-between font-bold">
                    <span className="text-wasteland-400">Health</span>
                    <span
                      className={
                        sup.health <= 30
                          ? 'text-rose-400'
                          : sup.health <= 60
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {sup.health} HP
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wasteland-400">Food</span>
                    <span className={sup.food < 25 ? 'text-amber-400 font-bold' : 'text-wasteland-200'}>
                      {sup.food}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wasteland-400">Water</span>
                    <span className={sup.water < 25 ? 'text-amber-400 font-bold' : 'text-wasteland-200'}>
                      {sup.water}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wasteland-400">Battery</span>
                    <span className={sup.battery < 25 ? 'text-amber-400 font-bold' : 'text-wasteland-200'}>
                      {sup.battery}%
                    </span>
                  </div>
                  <div className="flex justify-between pt-0.5 border-t border-wasteland-800/60 text-[10px]">
                    <span className="text-wasteland-400">Ammo: {sup.ammo}</span>
                    <span className="text-wasteland-400">Meds: {sup.medkits}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs Navigation - 2 rows x 3 columns grid: ALL 6 TABS 100% VISIBLE WITH ZERO OVERFLOW */}
      <div className="p-2 border-b border-wasteland-800 bg-wasteland-950/80 flex-none">
        <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
          <button
            onClick={() => setActiveTab('routes')}
            className={`py-2 px-1 text-center rounded font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'routes'
                ? 'bg-beacon-amber text-wasteland-950 shadow-md font-black'
                : 'bg-wasteland-900 hover:bg-wasteland-800 text-wasteland-300 border border-wasteland-800'
            }`}
          >
            <span>🗺</span>
            <span>Routes</span>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 px-1 text-center rounded font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'events'
                ? 'bg-rose-600 text-white shadow-md font-black animate-pulse'
                : 'bg-wasteland-900 hover:bg-wasteland-800 text-rose-300 border border-rose-900/80 font-bold'
            }`}
          >
            <span>🧟</span>
            <span>Events</span>
          </button>
          <button
            onClick={() => setActiveTab('supplies')}
            className={`py-2 px-1 text-center rounded font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'supplies'
                ? 'bg-safe-emerald text-white shadow-md font-black'
                : 'bg-wasteland-900 hover:bg-wasteland-800 text-wasteland-300 border border-wasteland-800'
            }`}
          >
            <span>🎒</span>
            <span>Supplies</span>
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`py-1.5 px-1 text-center rounded font-bold transition-all flex items-center justify-center gap-1 text-[11px] cursor-pointer ${
              activeTab === 'decisions'
                ? 'bg-amber-600 text-white shadow-md font-black'
                : 'bg-wasteland-900 hover:bg-wasteland-800 text-wasteland-400 border border-wasteland-800'
            }`}
          >
            <span>🧠</span>
            <span>Decide</span>
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-1.5 px-1 text-center rounded font-bold transition-all flex items-center justify-center gap-1 text-[11px] cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-cyan-600 text-white shadow-md font-black'
                : 'bg-wasteland-900 hover:bg-wasteland-800 text-wasteland-400 border border-wasteland-800'
            }`}
          >
            <span>📻</span>
            <span>Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('intel')}
            className={`py-1.5 px-1 text-center rounded font-bold transition-all flex items-center justify-center gap-1 text-[11px] cursor-pointer ${
              activeTab === 'intel'
                ? 'bg-slate-700 text-white shadow-md font-black'
                : 'bg-wasteland-900 hover:bg-wasteland-800 text-wasteland-400 border border-wasteland-800'
            }`}
          >
            <span>📍</span>
            <span>Waypoint</span>
          </button>
        </div>
      </div>

      {/* Tab Panels Content */}
      <div className="flex-1 p-4">
        {activeTab === 'intel' && selectedNode && (
          <div className="space-y-4">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-wasteland-400">
                  {selectedNode.type} NODE • ID: {selectedNode.id}
                </span>
                {isCurrentLocation && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    Current Location
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-wasteland-100 mt-1">{selectedNode.name}</h2>
              <p className="text-xs text-wasteland-300 mt-1 leading-relaxed">{selectedNode.description}</p>
            </div>

            {/* Coordinates and Location Actions */}
            <div className="flex items-center justify-between p-2.5 rounded bg-wasteland-850 border border-wasteland-800 text-xs font-mono">
              <span className="text-wasteland-400">Sector Coordinates:</span>
              <span className="text-wasteland-200 font-bold">X: {selectedNode.x} | Y: {selectedNode.y}</span>
            </div>

            {/* Danger Zone Warning */}
            {containingDangerZones.length > 0 ? (
              <div className="p-3 rounded bg-hazard-dark/30 border border-hazard-red/50 text-xs">
                {containingDangerZones.map((zone) => (
                  <div key={zone.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-hazard-red uppercase tracking-wider">
                        ⚠ Danger Zone: {zone.name}
                      </span>
                      <span className="font-mono px-1.5 py-0.5 rounded text-[10px] bg-hazard-red text-black font-bold uppercase">
                        {zone.threatLevel}
                      </span>
                    </div>
                    <p className="text-wasteland-300 text-[11px]">{zone.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded bg-wasteland-850 border border-wasteland-800 text-xs text-wasteland-400 flex items-center gap-2">
                <span className="text-safe-green font-bold">✓</span> No active high-density swarm recorded in this sector.
              </div>
            )}

            {/* Supply Cache Breakdown */}
            {selectedNode.supplies ? (
              <div className="p-3 rounded bg-wasteland-850 border border-wasteland-800 space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-safe-green flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-safe-green"></span>
                  Scavengeable Cache
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-wasteland-900 p-2 rounded border border-wasteland-800/80">
                    <span className="text-wasteland-400 block text-[10px]">Rations</span>
                    <span className="text-wasteland-100 font-bold">+{selectedNode.supplies.food} Food</span>
                  </div>
                  <div className="bg-wasteland-900 p-2 rounded border border-wasteland-800/80">
                    <span className="text-wasteland-400 block text-[10px]">Water</span>
                    <span className="text-wasteland-100 font-bold">+{selectedNode.supplies.water} Water</span>
                  </div>
                  <div className="bg-wasteland-900 p-2 rounded border border-wasteland-800/80">
                    <span className="text-wasteland-400 block text-[10px]">Ammunition</span>
                    <span className="text-wasteland-100 font-bold">+{selectedNode.supplies.ammo} Rounds</span>
                  </div>
                  <div className="bg-wasteland-900 p-2 rounded border border-wasteland-800/80">
                    <span className="text-wasteland-400 block text-[10px]">Medical</span>
                    <span className="text-wasteland-100 font-bold">+{selectedNode.supplies.medkit} Medkits</span>
                  </div>
                  <div className="col-span-2 bg-wasteland-900 p-2 rounded border border-wasteland-800/80">
                    <span className="text-wasteland-400 block text-[10px]">Energy</span>
                    <span className="text-wasteland-100 font-bold">+{selectedNode.supplies.battery}% Battery</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Connected Corridors / Roads */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-wasteland-400 block">
                Connected Corridors ({connectedEdges.length})
              </span>
              <div className="space-y-1.5">
                {connectedEdges.map((edge, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-wasteland-850 border border-wasteland-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-wasteland-200">
                        {edge.neighbor ? edge.neighbor.name : 'Unknown Road'}
                      </span>
                      <span className="text-[11px] font-mono text-wasteland-400 block">
                        Distance: {edge.distance}m
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          edge.risk <= 3
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                            : edge.risk <= 6
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                        }`}
                      >
                        Risk: {edge.risk}/10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2">
              {!isCurrentLocation ? (
                <button
                  onClick={() => setCurrentNode(selectedNode.id)}
                  className="w-full py-2.5 px-4 rounded bg-beacon-dim hover:bg-beacon-amber text-wasteland-950 font-mono font-bold text-xs tracking-wider uppercase transition-colors shadow-lg"
                >
                  Move Aarav & Mira Here
                </button>
              ) : (
                <div className="w-full py-2.5 px-4 rounded bg-wasteland-800 text-wasteland-400 font-mono text-center text-xs">
                  Party Stationed at this Waypoint
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Placeholders */}
        {activeTab === 'routes' && <RoutePanel />}
        {activeTab === 'supplies' && <SupplyPanel />}
        {activeTab === 'events' && <EventSimulator />}
        {activeTab === 'decisions' && <DecisionPanel />}
        {activeTab === 'sync' && <SyncPanel />}
      </div>
    </aside>
  )
}
