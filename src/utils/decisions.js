/**
 * DECISION & TACTICAL ADVISORY ENGINE FOR "THE LAST BEACON"
 * Evaluates game state and provides high-priority survival recommendations and route projections.
 */

import { getEdgeKey, findRoute } from './routing.js'
import { getStatus } from './supplies.js'

/**
 * Returns prioritized tactical recommendation for the party.
 * 
 * PRIORITY ORDER:
 * 1. Critical survivor with a medkit -> Action: "medkit"
 * 2. Unlooted cache at current node when vitals are low -> Action: "scavenge"
 * 3. Low essentials (water/food/battery) with nearby supply node -> Action: "detour"
 * 4. Upcoming road risk >= 7 with low ammo (< 5) -> Action: "switch-safest"
 * 5. Default operational push -> Action: "advance"
 * 
 * @param {Object} state - Full Zustand game state
 * @returns {Object} { action, reason, urgency: "info" | "warning" | "danger", detail, target }
 */
export function getRecommendation(state) {
  const {
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
  } = state

  if (gameStatus === 'lost') {
    return {
      action: 'reset',
      reason: 'Expedition failed due to casualties. Reset journey from Outpost Zero.',
      urgency: 'danger',
      detail: 'Restart from Outpost',
    }
  }

  if (gameStatus === 'won') {
    return {
      action: 'reset',
      reason: 'Beacon Sanctuary reached safely. Mission complete!',
      urgency: 'info',
      detail: 'New expedition',
    }
  }

  const aarav = characters.aarav
  const mira = characters.mira

  // RULE 1: Critical Survivor with Medkit Available
  if (
    (getStatus(aarav) === 'critical' || aarav.supplies.health < 35) &&
    aarav.supplies.medkits > 0
  ) {
    return {
      action: 'medkit',
      target: 'aarav',
      reason: `Aarav is in critical condition (${aarav.supplies.health} HP). Use field trauma kit immediately.`,
      urgency: 'danger',
      detail: 'Heal Aarav (+30 HP)',
    }
  }

  if (
    (getStatus(mira) === 'critical' || mira.supplies.health < 35) &&
    mira.supplies.medkits > 0
  ) {
    return {
      action: 'medkit',
      target: 'mira',
      reason: `Mira is in critical condition (${mira.supplies.health} HP). Use field trauma kit immediately.`,
      urgency: 'danger',
      detail: 'Heal Mira (+30 HP)',
    }
  }

  // Cross-medkit sharing: if Aarav is critical and Mira has medkits
  if (aarav.supplies.health < 35 && mira.supplies.medkits > 0) {
    return {
      action: 'medkit',
      target: 'mira',
      reason: `Aarav is bleeding out (${aarav.supplies.health} HP). Have Mira apply one of her medkits.`,
      urgency: 'danger',
      detail: 'Use Medkit on party',
    }
  }

  // RULE 2: Scavenge Current Node if Unlooted and Vitals are Depleted
  const currentNode = city.nodes.find((n) => n.id === currentNodeId)
  const isUnlooted = currentNode?.supplies && !lootedNodeIds.includes(currentNodeId)
  const anyoneLow =
    aarav.supplies.food < 60 ||
    aarav.supplies.water < 60 ||
    aarav.supplies.ammo < 8 ||
    mira.supplies.food < 60 ||
    mira.supplies.water < 60 ||
    mira.supplies.ammo < 8

  if (isUnlooted && anyoneLow) {
    return {
      action: 'scavenge',
      reason: `Unlooted cache detected at ${currentNode.name}. Forage rations, water, and ammunition before advancing.`,
      urgency: 'warning',
      detail: 'Scavenge Waypoint Supplies',
    }
  }

  // RULE 3: Detour to Nearby Supply Node if Essentials Are Running Dry
  const minWater = Math.min(aarav.supplies.water, mira.supplies.water)
  const minFood = Math.min(aarav.supplies.food, mira.supplies.food)
  const minBattery = Math.min(aarav.supplies.battery, mira.supplies.battery)
  const isDetouring = routeTarget && routeTarget !== beaconNodeId

  if ((minWater < 35 || minFood < 35 || minBattery < 35) && !isDetouring) {
    // Find unlooted supply nodes within 1-3 hops
    const potentialCaches = city.nodes.filter(
      (n) =>
        (n.type === 'supply' || n.type === 'hospital') &&
        !lootedNodeIds.includes(n.id) &&
        n.id !== currentNodeId
    )

    let closestNode = null
    let shortestHops = Infinity

    for (const node of potentialCaches) {
      const pathResult = findRoute(city, currentNodeId, node.id, 'safest', riskBoosts)
      if (pathResult && pathResult.hops <= 3 && pathResult.hops < shortestHops) {
        shortestHops = pathResult.hops
        closestNode = node
      }
    }

    if (closestNode) {
      return {
        action: 'detour',
        target: closestNode.id,
        nodeName: closestNode.name,
        reason: `Rations & hydration are depleting (${minWater}% Water, ${minFood}% Food). Detour ${shortestHops} hops to ${closestNode.name}.`,
        urgency: 'warning',
        detail: `Detour to ${closestNode.name}`,
      }
    }
  }

  // RULE 4: Next Road Risk >= 7 and Ammo Low (< 5) -> Switch to Safest
  if (activeRoute && activeRoute.path && activeRoute.path.length > 1) {
    const nextHopId = activeRoute.path[1]
    const nextEdge = city.edges.find(
      (e) =>
        (e.from === currentNodeId && e.to === nextHopId) ||
        (e.from === nextHopId && e.to === currentNodeId)
    )

    if (nextEdge) {
      const edgeKey = getEdgeKey(nextEdge.from, nextEdge.to)
      const effectiveRisk = Math.max(0, nextEdge.risk + (riskBoosts[edgeKey] || 0))
      const minAmmo = Math.min(aarav.supplies.ammo, mira.supplies.ammo)

      if (effectiveRisk >= 7 && minAmmo <= 4 && routeMode !== 'safest') {
        return {
          action: 'switch-safest',
          reason: `Corridor ahead has deadly threat (Risk ${effectiveRisk}/10) and ammo is nearly depleted (${minAmmo} rds). Reroute to Safest strategy.`,
          urgency: 'danger',
          detail: 'Switch Route to Safest',
        }
      }
    }
  }

  // RULE 5: Default Safe Advance
  return {
    action: 'advance',
    reason: 'Operational parameters green. Corridor risk acceptable. Advance toward destination.',
    urgency: 'info',
    detail: 'Advance One Step',
  }
}

/**
 * Projects whether current supplies are sufficient to reach the destination along activeRoute.
 * 
 * @param {Object} state - Zustand game state
 * @returns {Object} { enough: boolean, shortBy: { food, water, battery, ammo }, required: {...} }
 */
export function getProjection(state) {
  const { activeRoute, city, riskBoosts, characters } = state

  if (!activeRoute || !activeRoute.path || activeRoute.path.length <= 1) {
    return {
      enough: true,
      shortBy: {},
      required: { food: 0, water: 0, battery: 0, ammo: 0 },
    }
  }

  let totalFoodReq = 0
  let totalWaterReq = 0
  let totalBatteryReq = 0
  let totalAmmoReq = 0

  for (let i = 0; i < activeRoute.path.length - 1; i++) {
    const from = activeRoute.path[i]
    const to = activeRoute.path[i + 1]
    const edge = city.edges.find(
      (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from)
    )
    const edgeKey = edge ? getEdgeKey(edge.from, edge.to) : ''
    const risk = edge ? Math.max(0, edge.risk + (riskBoosts[edgeKey] || 0)) : 0

    totalFoodReq += 4
    totalWaterReq += 6
    totalBatteryReq += 3
    if (risk >= 5) {
      totalAmmoReq += Math.ceil(risk / 4)
    }
  }

  // Check each character against requirements
  const minFood = Math.min(characters.aarav.supplies.food, characters.mira.supplies.food)
  const minWater = Math.min(characters.aarav.supplies.water, characters.mira.supplies.water)
  const minBattery = Math.min(characters.aarav.supplies.battery, characters.mira.supplies.battery)
  const minAmmo = Math.min(characters.aarav.supplies.ammo, characters.mira.supplies.ammo)

  const shortBy = {}
  if (minFood < totalFoodReq) shortBy.food = totalFoodReq - minFood
  if (minWater < totalWaterReq) shortBy.water = totalWaterReq - minWater
  if (minBattery < totalBatteryReq) shortBy.battery = totalBatteryReq - minBattery
  if (minAmmo < totalAmmoReq) shortBy.ammo = totalAmmoReq - minAmmo

  const enough = Object.keys(shortBy).length === 0

  return {
    enough,
    shortBy,
    required: {
      food: totalFoodReq,
      water: totalWaterReq,
      battery: totalBatteryReq,
      ammo: totalAmmoReq,
    },
    hops: activeRoute.path.length - 1,
  }
}
