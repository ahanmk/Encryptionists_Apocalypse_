import React, { useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getRecommendation, getProjection } from '../utils/decisions'

export default function DecisionPanel() {
  const store = useGameStore()
  const {
    characters,
    city,
    currentNodeId,
    activeRoute,
    riskBoosts,
    lootedNodeIds,
    routeMode,
    setRouteMode,
    moveToNextNode,
    scavengeCurrentNode,
    useMedkitOn,
    setRouteTarget,
    resetJourney,
    gameStatus,
    routeTarget,
    beaconNodeId,
  } = store

  // Compute recommendation & projection
  const recommendation = useMemo(() => getRecommendation(store), [
    characters,
    city,
    currentNodeId,
    activeRoute,
    riskBoosts,
    lootedNodeIds,
    routeMode,
    gameStatus,
    routeTarget,
    beaconNodeId,
  ])

  const projection = useMemo(() => getProjection(store), [
    activeRoute,
    city,
    riskBoosts,
    characters,
  ])

  // Execute the recommended action
  const handleApply = () => {
    if (!recommendation) return

    switch (recommendation.action) {
      case 'medkit':
        useMedkitOn(recommendation.target || 'aarav')
        break
      case 'scavenge':
        scavengeCurrentNode()
        break
      case 'detour':
        if (recommendation.target) {
          setRouteTarget(recommendation.target)
        }
        break
      case 'switch-safest':
        setRouteMode('safest')
        break
      case 'advance':
        moveToNextNode()
        break
      case 'reset':
        resetJourney()
        break
      default:
        break
    }
  }

  // Get style colors by urgency
  const getUrgencyStyles = (urgency) => {
    switch (urgency) {
      case 'danger':
        return {
          border: 'border-rose-500',
          bg: 'bg-rose-950/40',
          badge: 'bg-rose-900 text-rose-300 border-rose-700',
          text: 'text-rose-400',
          btn: 'bg-rose-600 hover:bg-rose-500 text-white',
        }
      case 'warning':
        return {
          border: 'border-amber-500',
          bg: 'bg-amber-950/40',
          badge: 'bg-amber-900 text-amber-300 border-amber-700',
          text: 'text-amber-400',
          btn: 'bg-amber-500 hover:bg-amber-400 text-wasteland-950 font-bold',
        }
      case 'info':
      default:
        return {
          border: 'border-emerald-500',
          bg: 'bg-emerald-950/40',
          badge: 'bg-emerald-900 text-emerald-300 border-emerald-700',
          text: 'text-emerald-400',
          btn: 'bg-emerald-500 hover:bg-emerald-400 text-wasteland-950 font-bold',
        }
    }
  }

  const styles = getUrgencyStyles(recommendation?.urgency)

  return (
    <div className="space-y-4">
      {/* PRIMARY RECOMMENDATION CARD */}
      {recommendation ? (
        <div
          className={`p-4 rounded-lg border-2 ${styles.border} ${styles.bg} shadow-xl space-y-3 font-mono`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${styles.badge}`}>
              {recommendation.urgency.toUpperCase()} PRIORITY
            </span>
            <span className="text-xs text-wasteland-400">Tactical Advisor</span>
          </div>

          <div>
            <h3 className={`text-base font-black tracking-wide uppercase ${styles.text}`}>
              Action: {recommendation.action.replace('-', ' ')}
            </h3>
            <p className="text-xs text-wasteland-200 mt-1 leading-relaxed font-sans">
              {recommendation.reason}
            </p>
          </div>

          <button
            onClick={handleApply}
            className={`w-full py-2.5 px-4 rounded font-mono text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${styles.btn}`}
          >
            <span>Apply Recommendation</span>
            <span>({recommendation.detail})</span>
          </button>
        </div>
      ) : null}

      {/* SUPPLY PROJECTION CARD */}
      <div className="p-3 rounded-lg bg-wasteland-850 border border-wasteland-800 space-y-2.5 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-wasteland-300">
            Route Supply Projection
          </span>
          <span className="text-[10px] text-wasteland-400">
            {projection.hops} waypoints ahead
          </span>
        </div>

        {projection.enough ? (
          <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/80 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
              <span>✓</span>
              <span>Supplies Sufficient to Reach Target</span>
            </div>
            <p className="text-[11px] text-wasteland-300 font-sans leading-relaxed">
              Carried food, water, and battery reserves exceed the calculated cost for this trajectory.
            </p>
          </div>
        ) : (
          <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/80 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span>⚠</span>
              <span>Deficit Projected Along Route</span>
            </div>
            <div className="text-[11px] text-rose-300">
              {Object.entries(projection.shortBy).map(([item, val]) => (
                <span key={item} className="inline-block mr-2 font-bold">
                  • Short by {val} {item}
                </span>
              ))}
            </div>
            <p className="text-[10.5px] text-wasteland-400 font-sans">
              Consider planning a detour to a supply node or foraging before attempting the final stretch.
            </p>
          </div>
        )}

        {/* Required Costs Summary */}
        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
          <div className="p-1.5 rounded bg-wasteland-900 border border-wasteland-800">
            <span className="text-wasteland-400 block">Food Req</span>
            <span className="text-wasteland-200 font-bold">{projection.required.food}</span>
          </div>
          <div className="p-1.5 rounded bg-wasteland-900 border border-wasteland-800">
            <span className="text-wasteland-400 block">Water Req</span>
            <span className="text-wasteland-200 font-bold">{projection.required.water}</span>
          </div>
          <div className="p-1.5 rounded bg-wasteland-900 border border-wasteland-800">
            <span className="text-wasteland-400 block">Power Req</span>
            <span className="text-wasteland-200 font-bold">{projection.required.battery}%</span>
          </div>
          <div className="p-1.5 rounded bg-wasteland-900 border border-wasteland-800">
            <span className="text-wasteland-400 block">Ammo Est</span>
            <span className="text-wasteland-200 font-bold">{projection.required.ammo} rds</span>
          </div>
        </div>
      </div>

      {/* TACTICAL ALTERNATIVES */}
      <div className="space-y-2 font-mono">
        <span className="text-[11px] font-bold uppercase tracking-wider text-wasteland-400 block px-1">
          Alternative Tactical Options
        </span>

        {/* Option A: Manual Advance */}
        {recommendation?.action !== 'advance' && (
          <div className="p-2.5 rounded bg-wasteland-850 border border-wasteland-800 text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-wasteland-200 block">Force Step Ahead</span>
              <span className="text-[10px] text-wasteland-400 font-sans">
                Override recommendation and advance one waypoint immediately.
              </span>
            </div>
            <button
              onClick={moveToNextNode}
              disabled={gameStatus !== null}
              className="py-1 px-3 rounded bg-wasteland-800 hover:bg-wasteland-700 text-wasteland-200 font-bold text-xs uppercase cursor-pointer"
            >
              Step
            </button>
          </div>
        )}

        {/* Option B: Mode Switch */}
        {routeMode !== 'safest' && (
          <div className="p-2.5 rounded bg-wasteland-850 border border-wasteland-800 text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-safe-green block">Reroute to Safest</span>
              <span className="text-[10px] text-wasteland-400 font-sans">
                Prioritize perimeter roads and avoid active threat corridors.
              </span>
            </div>
            <button
              onClick={() => setRouteMode('safest')}
              className="py-1 px-3 rounded bg-safe-emerald/20 hover:bg-safe-emerald/40 text-safe-green border border-safe-emerald/50 font-bold text-xs uppercase cursor-pointer"
            >
              Safest
            </button>
          </div>
        )}

        {/* Option C: Clear Detour if Active */}
        {routeTarget && routeTarget !== beaconNodeId && (
          <div className="p-2.5 rounded bg-wasteland-850 border border-wasteland-800 text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-sky-400 block">Cancel Detour</span>
              <span className="text-[10px] text-wasteland-400 font-sans">
                Abort current detour and resume direct bearing to the Beacon.
              </span>
            </div>
            <button
              onClick={() => setRouteTarget(beaconNodeId)}
              className="py-1 px-3 rounded bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800 font-bold text-xs uppercase cursor-pointer"
            >
              Direct
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
