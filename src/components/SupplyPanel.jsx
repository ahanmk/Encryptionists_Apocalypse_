import React from 'react'
import { useGameStore } from '../store/useGameStore'
import { getStatus } from '../utils/supplies'

/**
 * Helper to get progress bar styling based on stat percentage and critical levels.
 */
function getBarColor(val, isHealth = false) {
  if (isHealth) {
    if (val <= 30) return 'bg-rose-500'
    if (val <= 60) return 'bg-amber-500'
    return 'bg-emerald-500'
  }
  if (val <= 10) return 'bg-rose-500'
  if (val <= 25) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function getStatusBadge(status) {
  switch (status) {
    case 'critical':
      return {
        text: 'CRITICAL',
        class: 'bg-rose-950/80 text-rose-400 border-rose-800 animate-pulse',
      }
    case 'low':
      return {
        text: 'LOW',
        class: 'bg-amber-950/80 text-amber-400 border-amber-800',
      }
    case 'ok':
    default:
      return {
        text: 'OPTIMAL',
        class: 'bg-emerald-950/80 text-emerald-400 border-emerald-800',
      }
  }
}

export default function SupplyPanel() {
  const city = useGameStore((state) => state.city)
  const currentNodeId = useGameStore((state) => state.currentNodeId)
  const characters = useGameStore((state) => state.characters)
  const lootedNodeIds = useGameStore((state) => state.lootedNodeIds)
  const gameStatus = useGameStore((state) => state.gameStatus)
  const eventLog = useGameStore((state) => state.eventLog)
  const scavengeCurrentNode = useGameStore((state) => state.scavengeCurrentNode)
  const useMedkitOn = useGameStore((state) => state.useMedkitOn)
  const resetJourney = useGameStore((state) => state.resetJourney)

  // Current node information
  const currentNode = city.nodes.find((n) => n.id === currentNodeId)
  const isLooted = lootedNodeIds.includes(currentNodeId)
  const isScavengeableType =
    currentNode &&
    (currentNode.type === 'supply' ||
      currentNode.type === 'hospital' ||
      currentNode.type === 'safehouse')
  const hasSupplies = currentNode?.supplies != null
  const canScavenge =
    isScavengeableType && hasSupplies && !isLooted && gameStatus === null

  return (
    <div className="space-y-4">
      {/* GAME STATUS BANNERS */}
      {gameStatus === 'lost' && (
        <div className="p-4 rounded-lg bg-rose-950/90 border border-rose-600 text-center space-y-2 shadow-2xl animate-pulse">
          <div className="w-10 h-10 mx-auto rounded-full bg-rose-600/20 border border-rose-500 flex items-center justify-center text-rose-400 text-xl font-bold">
            ☠
          </div>
          <h3 className="text-base font-black tracking-widest text-rose-300 font-mono uppercase">
            FAILED TO REACH BEACON
          </h3>
          <div className="text-[11px] font-bold text-rose-400 font-mono uppercase tracking-wider">
            MISSION FAILED — CRITICAL CASUALTIES
          </div>
          <p className="text-xs text-wasteland-200 leading-relaxed">
            Party sustained fatal trauma or succumbed to dehydration in the wasteland.
          </p>
          <div className="pt-2">
            <button
              onClick={resetJourney}
              className="py-2 px-4 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs tracking-wider uppercase transition-colors shadow-lg"
            >
              Restart From Outpost Zero
            </button>
          </div>
        </div>
      )}

      {gameStatus === 'won' && (
        <div className="p-4 rounded-lg bg-emerald-950/90 border border-emerald-500 text-center space-y-2 shadow-2xl">
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 text-xl font-bold animate-bounce">
            ✓
          </div>
          <h3 className="text-base font-black tracking-widest text-emerald-300 font-mono uppercase">
            BEACON SANCTUARY REACHED!
          </h3>
          <p className="text-xs text-wasteland-200 leading-relaxed">
            Aarav and Mira have survived the quarantine zone with their supplies intact.
          </p>
          <div className="pt-2">
            <button
              onClick={resetJourney}
              className="py-2 px-4 rounded bg-emerald-500 hover:bg-emerald-400 text-wasteland-950 font-mono font-bold text-xs tracking-wider uppercase transition-colors shadow-lg"
            >
              Start New Run
            </button>
          </div>
        </div>
      )}

      {/* TWO COLUMNS: AARAV & MIRA SURVIVAL VITALS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(characters).map(([key, char]) => {
          const status = getStatus(char)
          const badge = getStatusBadge(status)
          const sup = char.supplies

          return (
            <div
              key={key}
              className="p-3 rounded-lg bg-wasteland-850 border border-wasteland-800 space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-wasteland-800 pb-2">
                <div>
                  <h4 className="font-bold text-sm text-wasteland-100 font-mono">
                    {char.name}
                  </h4>
                  <span className="text-[10px] text-wasteland-400 font-mono">
                    {char.role}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${badge.class}`}
                >
                  {badge.text}
                </span>
              </div>

              {/* Progress Bars for Health, Food, Water, Battery */}
              <div className="space-y-2 text-xs font-mono">
                {/* Health */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-wasteland-400">Health</span>
                    <span
                      className={`font-bold ${
                        sup.health <= 30
                          ? 'text-rose-400'
                          : sup.health <= 60
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {sup.health}/100 HP
                    </span>
                  </div>
                  <div className="w-full h-2 rounded bg-wasteland-950 overflow-hidden border border-wasteland-800">
                    <div
                      className={`h-full transition-all duration-300 ${getBarColor(
                        sup.health,
                        true
                      )}`}
                      style={{ width: `${sup.health}%` }}
                    />
                  </div>
                </div>

                {/* Food */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-wasteland-400">Rations</span>
                    <span className="text-wasteland-200">{sup.food}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded bg-wasteland-950 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getBarColor(
                        sup.food
                      )}`}
                      style={{ width: `${sup.food}%` }}
                    />
                  </div>
                </div>

                {/* Water */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-wasteland-400">Water</span>
                    <span className="text-wasteland-200">{sup.water}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded bg-wasteland-950 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getBarColor(
                        sup.water
                      )}`}
                      style={{ width: `${sup.water}%` }}
                    />
                  </div>
                </div>

                {/* Battery */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-wasteland-400">Battery</span>
                    <span className="text-wasteland-200">{sup.battery}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded bg-wasteland-950 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getBarColor(
                        sup.battery
                      )}`}
                      style={{ width: `${sup.battery}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Ammo, Medkits & Action */}
              <div className="pt-1 border-t border-wasteland-800 space-y-2">
                <div className="flex justify-between text-xs font-mono text-[11px]">
                  <span className="text-wasteland-400">
                    Ammo: <b className="text-wasteland-200">{sup.ammo} rds</b>
                  </span>
                  <span className="text-wasteland-400">
                    Medkits: <b className="text-wasteland-200">{sup.medkits}</b>
                  </span>
                </div>

                <button
                  onClick={() => useMedkitOn(key)}
                  disabled={sup.medkits <= 0 || sup.health >= 100 || gameStatus !== null}
                  className={`w-full py-1.5 px-2 rounded font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
                    sup.medkits <= 0 || sup.health >= 100 || gameStatus !== null
                      ? 'bg-wasteland-800/60 text-wasteland-500 cursor-not-allowed'
                      : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 shadow cursor-pointer'
                  }`}
                >
                  <span>Use Medkit</span>
                  <span className="text-[10px] text-rose-400">(+30 HP)</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* SCAVENGING AT CURRENT WAYPOINT */}
      <div className="p-3 rounded-lg bg-wasteland-850 border border-wasteland-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-wasteland-400">
            Current Waypoint Intel
          </span>
          <span className="text-[11px] font-mono text-beacon-amber">
            {currentNode ? currentNode.name : 'Unknown'}
          </span>
        </div>

        {/* Display supplies available at this node */}
        {hasSupplies ? (
          <div className="p-2 rounded bg-wasteland-900 border border-wasteland-800 text-xs font-mono">
            <span className="text-[10px] text-wasteland-400 block mb-1">
              {isLooted ? '❌ CACHE DEPLETED' : '📦 DETECTED CACHE CONTENT:'}
            </span>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {currentNode.supplies.food > 0 && (
                <span className="text-emerald-400 font-bold">
                  +{currentNode.supplies.food} Food
                </span>
              )}
              {currentNode.supplies.water > 0 && (
                <span className="text-sky-400 font-bold">
                  +{currentNode.supplies.water} Water
                </span>
              )}
              {currentNode.supplies.ammo > 0 && (
                <span className="text-amber-400 font-bold">
                  +{currentNode.supplies.ammo} Ammo
                </span>
              )}
              {currentNode.supplies.medkit > 0 && (
                <span className="text-rose-400 font-bold">
                  +{currentNode.supplies.medkit} Medkits
                </span>
              )}
              {currentNode.supplies.battery > 0 && (
                <span className="text-yellow-400 font-bold">
                  +{currentNode.supplies.battery}% Battery
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2 rounded bg-wasteland-900 border border-wasteland-800 text-xs font-mono text-wasteland-500">
            No scavengeable emergency lockers recorded at this location.
          </div>
        )}

        {/* Scavenge Button */}
        <button
          onClick={scavengeCurrentNode}
          disabled={!canScavenge}
          className={`w-full py-2 px-3 rounded font-mono font-bold text-xs uppercase tracking-wider transition-colors shadow flex items-center justify-center gap-2 ${
            canScavenge
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
              : 'bg-wasteland-800 text-wasteland-500 cursor-not-allowed'
          }`}
        >
          <span>📦 Scavenge Here</span>
          {isLooted && <span className="text-[10px]">(Already Looted)</span>}
        </button>
      </div>

      {/* EVENT & LOG TERMINAL */}
      <div className="border border-wasteland-800 rounded-lg bg-wasteland-900 overflow-hidden">
        <div className="px-3 py-2 bg-wasteland-950 border-b border-wasteland-800 flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-wasteland-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Survival Field Log
          </span>
          <span className="text-[10px] font-mono text-wasteland-500">Latest 30 Events</span>
        </div>
        <div className="p-2.5 max-h-40 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-[#0a0c0e]">
          {eventLog.map((log, index) => {
            const isDefeat = log.includes('MISSION FAILED') || log.includes('CRITICAL')
            const isVictory = log.includes('BEACON')
            const isScavenge = log.includes('Scavenged')
            const isHeal = log.includes('medkit')

            return (
              <div
                key={index}
                className={`leading-relaxed border-l-2 pl-2 ${
                  isDefeat
                    ? 'border-rose-500 text-rose-400 bg-rose-950/20'
                    : isVictory
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20 font-bold'
                    : isScavenge
                    ? 'border-sky-400 text-sky-300'
                    : isHeal
                    ? 'border-purple-400 text-purple-300'
                    : 'border-wasteland-700 text-wasteland-300'
                }`}
              >
                {log}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
