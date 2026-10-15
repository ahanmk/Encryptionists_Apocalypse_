import { create } from 'zustand'
import cityData from '../data/city.json'
import eventsData from '../data/events.json'
import { findRoute, getEdgeKey } from '../utils/routing'
import {
  calculateStepCost,
  applyStepCost,
  scavengeNode,
  useMedkit,
  checkGameOver,
} from '../utils/supplies'
import { importState } from '../utils/sync'

// Find default starting node and beacon target
const startNode = cityData.nodes.find((n) => n.type === 'start') || cityData.nodes[0]
const beaconNode = cityData.nodes.find((n) => n.type === 'beacon') || cityData.nodes[cityData.nodes.length - 1]

// Compute initial route on boot
const initialRoute = findRoute(cityData, startNode.id, beaconNode.id, 'balanced', {})

const INITIAL_SUPPLIES = {
  health: 100,
  food: 100,
  water: 100,
  battery: 100,
  ammo: 10,
  medkits: 3,
}

/**
 * Derives riskBoosts map { [edgeKey]: extraRisk } by summing active threat boosts.
 */
function deriveRiskBoosts(activeThreats) {
  const boosts = {}
  for (const threat of activeThreats) {
    if (!threat.edgeKeys || !threat.boost) continue
    for (const key of threat.edgeKeys) {
      boosts[key] = (boosts[key] || 0) + threat.boost
    }
  }
  return boosts
}

export const useGameStore = create((set, get) => ({
  // City topology & event template data
  city: cityData,
  eventsTemplates: eventsData,

  // Selected node (for sidebar inspection & details)
  selectedNodeId: startNode ? startNode.id : null,

  // Current physical location of Aarav & Mira
  currentNodeId: startNode ? startNode.id : null,

  // Target destination (defaults to beacon, can be set to a detour node)
  beaconNodeId: beaconNode ? beaconNode.id : null,
  routeTarget: beaconNode ? beaconNode.id : null,

  // Routing state
  routeMode: 'balanced', // 'safest' | 'fastest' | 'balanced'
  activeRoute: initialRoute,
  visitedNodeIds: startNode ? [startNode.id] : [],

  // Dynamic threats & risk modifiers
  activeThreats: [], // [{ id, eventId, name, edgeKeys: [], boost, stepsLeft, description }]
  riskBoosts: {}, // Derived from activeThreats
  autoEvents: false, // 25% chance per step when true

  // Supply and Survival state
  lootedNodeIds: [],
  gameStatus: null, // null | 'won' | 'lost'
  eventLog: [
    `[06:00] Mission commenced at Outpost Zero. Destination: The Beacon Sanctuary.`,
  ],

  // Character supplies and status
  characters: {
    aarav: {
      name: 'Aarav',
      role: 'Scout & Navigator',
      supplies: { ...INITIAL_SUPPLIES },
    },
    mira: {
      name: 'Mira',
      role: 'Engineer & Medic',
      supplies: { ...INITIAL_SUPPLIES },
    },
  },

  // Base waypoint inspection
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setCurrentNode: (nodeId) => {
    set({ currentNodeId: nodeId })
    get().calculateRoute()
  },

  // Set detour target or reset to beacon
  setRouteTarget: (targetId) => {
    const { beaconNodeId, city, addLog } = get()
    const targetNode = city.nodes.find((n) => n.id === targetId)
    const effectiveTarget = targetId || beaconNodeId

    set({ routeTarget: effectiveTarget })
    get().calculateRoute()

    if (effectiveTarget !== beaconNodeId && targetNode) {
      addLog(`Detour planned: Navigating toward ${targetNode.name}.`)
    } else {
      addLog(`Direct course restored toward The Beacon Sanctuary.`)
    }
  },

  // Toggle automated random events on step
  setAutoEvents: (enabled) => set({ autoEvents: enabled }),

  // Add event log entry (keeps latest 30)
  addLog: (message) => {
    const { eventLog } = get()
    const updated = [message, ...eventLog].slice(0, 30)
    set({ eventLog: updated })
  },

  // Change routing mode and recompute route from current position to target
  setRouteMode: (mode) => {
    set({ routeMode: mode })
    get().calculateRoute()
  },

  // Calculate route from currentNodeId to routeTarget using active mode and riskBoosts
  calculateRoute: () => {
    const { city, currentNodeId, routeTarget, beaconNodeId, routeMode, riskBoosts } = get()
    if (!currentNodeId) return

    const target = routeTarget || beaconNodeId
    if (!target) return

    const newRoute = findRoute(city, currentNodeId, target, routeMode, riskBoosts)
    set({ activeRoute: newRoute })
  },

  // Trigger a specific threat or survival event
  triggerEvent: (eventId, target = null) => {
    const {
      city,
      eventsTemplates,
      activeThreats,
      characters,
      lootedNodeIds,
      routeTarget,
      beaconNodeId,
      addLog,
    } = get()

    const template = eventsTemplates.find((e) => e.id === eventId)
    if (!template) return

    const eventInstanceId = `threat-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    let newThreats = [...activeThreats]
    let affectedEdgeKeys = []

    switch (template.id) {
      case 'horde_spotted': {
        // Target is a danger zone ID (or first zone by default)
        const zoneId = typeof target === 'string' && target.startsWith('zone-')
          ? target
          : city.dangerZones[0]?.id || 'zone-1'
        const zone = city.dangerZones.find((z) => z.id === zoneId) || city.dangerZones[0]

        // Find all edges in or touching this danger zone
        const zoneNodeSet = new Set(zone ? zone.nodeIds : [])
        affectedEdgeKeys = city.edges
          .filter((e) => zoneNodeSet.has(e.from) || zoneNodeSet.has(e.to))
          .map((e) => getEdgeKey(e.from, e.to))

        newThreats.push({
          id: eventInstanceId,
          eventId: template.id,
          name: `${template.name} (${zone ? zone.name : 'Sector'})`,
          zoneId: zone?.id,
          zoneName: zone?.name,
          edgeKeys: affectedEdgeKeys,
          boost: template.boost || 4,
          stepsLeft: template.duration || 5,
          description: `+${template.boost} Risk in ${zone ? zone.name : 'zone'} for ${template.duration} steps.`,
        })

        addLog(`🚨 SUDDEN ZOMBIE HORDE DETECTED: Sudden zombie horde swarming in ${zone ? zone.name : 'the sector'}. Roads in zone: +${template.boost} Risk for ${template.duration} steps.`)
        break
      }

      case 'road_blocked': {
        // Target is an edgeKey (or first edge on activeRoute)
        let edgeKey = target
        if (!edgeKey || typeof edgeKey !== 'string' || !edgeKey.includes('--')) {
          const { activeRoute } = get()
          if (activeRoute && activeRoute.path && activeRoute.path.length > 1) {
            edgeKey = getEdgeKey(activeRoute.path[0], activeRoute.path[1])
          } else {
            edgeKey = getEdgeKey(city.edges[0].from, city.edges[0].to)
          }
        }

        affectedEdgeKeys = [edgeKey]
        newThreats.push({
          id: eventInstanceId,
          eventId: template.id,
          name: `${template.name} [${edgeKey}]`,
          edgeKeys: affectedEdgeKeys,
          boost: template.boost || 10,
          stepsLeft: template.duration || 8,
          description: `+${template.boost} Risk on corridor ${edgeKey} for ${template.duration} steps.`,
        })

        addLog(`🚧 CORRIDOR BLOCKED: Heavy collapse along road [${edgeKey}]. +${template.boost} Risk for ${template.duration} steps!`)
        break
      }

      case 'ambush': {
        // One survivor loses 20 health immediately
        const targetKey = target === 'mira' ? 'mira' : target === 'aarav' ? 'aarav' : Math.random() < 0.5 ? 'aarav' : 'mira'
        const victim = characters[targetKey]
        const damage = template.damageAmount || 20
        const newHp = Math.max(0, victim.supplies.health - damage)

        const updatedChar = {
          ...victim,
          supplies: {
            ...victim.supplies,
            health: newHp,
          },
        }

        const newCharacters = {
          ...characters,
          [targetKey]: updatedChar,
        }

        const status = checkGameOver(newCharacters.aarav, newCharacters.mira, false)
        set({
          characters: newCharacters,
          gameStatus: status,
        })

        addLog(`💥 AMBUSH: A feral stalker ambushed ${victim.name}! -${damage} HP sustained.`)
        if (status === 'lost') {
          addLog(`☠ CRITICAL CASUALTY: ${victim.name} died in the ambush. Mission failed.`)
        }
        return
      }

      case 'supply_drop': {
        // Adds food, water, ammo to a supply node
        const supplyNodes = city.nodes.filter((n) => n.type === 'supply' || n.type === 'hospital')
        const chosenNode = (target && city.nodes.find((n) => n.id === target)) ||
          supplyNodes[Math.floor(Math.random() * supplyNodes.length)] ||
          supplyNodes[0]

        if (chosenNode && template.supplies) {
          chosenNode.supplies = {
            food: (chosenNode.supplies?.food || 0) + template.supplies.food,
            water: (chosenNode.supplies?.water || 0) + template.supplies.water,
            ammo: (chosenNode.supplies?.ammo || 0) + template.supplies.ammo,
            medkit: chosenNode.supplies?.medkit || 1,
            battery: chosenNode.supplies?.battery || 30,
          }

          // Un-loot the node if it was previously looted
          const updatedLooted = lootedNodeIds.filter((id) => id !== chosenNode.id)
          set({ lootedNodeIds: updatedLooted })

          addLog(`🪂 AIRDROP: Automated cargo pod landed near ${chosenNode.name}! +${template.supplies.food} Food, +${template.supplies.water} Water, +${template.supplies.ammo} Ammo replenished.`)
        }
        return
      }

      case 'night_falls': {
        // +2 risk across ALL city roads for 4 steps
        affectedEdgeKeys = city.edges.map((e) => getEdgeKey(e.from, e.to))
        newThreats.push({
          id: eventInstanceId,
          eventId: template.id,
          name: template.name,
          edgeKeys: affectedEdgeKeys,
          boost: template.boost || 2,
          stepsLeft: template.duration || 4,
          description: `+${template.boost} Risk on all roads city-wide for ${template.duration} steps.`,
        })

        addLog(`🌙 NIGHTFALL: Dense toxic smog blankets the ruins. +${template.boost} Risk across all roads for ${template.duration} steps.`)
        break
      }

      case 'radio_update': {
        // Radio intel message
        const tips = [
          'Static burst: "All units, northern ridge road reports low prowler signatures."',
          'Garbled relay: "Refinery district clear of alpha stalkers for now."',
          'Beacon transmission: "Avoid the downtown metro terminal at all costs."',
        ]
        const tip = tips[Math.floor(Math.random() * tips.length)]
        addLog(`📻 RADIO INTEL: ${tip}`)
        return
      }

      default:
        return
    }

    // Derive updated riskBoosts and update store
    const updatedBoosts = deriveRiskBoosts(newThreats)
    set({
      activeThreats: newThreats,
      riskBoosts: updatedBoosts,
    })

    // Recalculate route with the new risk boosts
    get().calculateRoute()
  },

  // Trigger a random event from the catalog
  triggerRandomEvent: () => {
    const { eventsTemplates, city, activeRoute } = get()
    const template = eventsTemplates[Math.floor(Math.random() * eventsTemplates.length)]

    let target = null
    if (template.id === 'horde_spotted') {
      const z = city.dangerZones[Math.floor(Math.random() * city.dangerZones.length)]
      target = z ? z.id : 'zone-1'
    } else if (template.id === 'road_blocked') {
      if (activeRoute && activeRoute.path && activeRoute.path.length > 1) {
        // Target an edge on current active route
        const randIdx = Math.floor(Math.random() * (activeRoute.path.length - 1))
        target = getEdgeKey(activeRoute.path[randIdx], activeRoute.path[randIdx + 1])
      } else {
        const randEdge = city.edges[Math.floor(Math.random() * city.edges.length)]
        target = getEdgeKey(randEdge.from, randEdge.to)
      }
    } else if (template.id === 'ambush') {
      target = Math.random() < 0.5 ? 'aarav' : 'mira'
    } else if (template.id === 'supply_drop') {
      const sup = city.nodes.filter((n) => n.type === 'supply' || n.type === 'hospital')
      const randNode = sup[Math.floor(Math.random() * sup.length)]
      target = randNode ? randNode.id : null
    }

    get().triggerEvent(template.id, target)
  },

  // Advance party one step forward along the active planned route
  moveToNextNode: () => {
    const {
      activeRoute,
      visitedNodeIds,
      city,
      currentNodeId,
      beaconNodeId,
      routeTarget,
      routeMode,
      activeThreats,
      characters,
      gameStatus,
      autoEvents,
      addLog,
    } = get()

    // Block movement if game is won or lost
    if (gameStatus !== null) return
    if (!activeRoute || !activeRoute.path || activeRoute.path.length <= 1) return

    // Next waypoint along the calculated path
    const nextNodeId = activeRoute.path[1]
    const nextNode = city.nodes.find((n) => n.id === nextNodeId)

    // Find the edge being traversed
    const edge = city.edges.find(
      (e) =>
        (e.from === currentNodeId && e.to === nextNodeId) ||
        (e.from === nextNodeId && e.to === currentNodeId)
    )

    // Compute EFFECTIVE risk including dynamic active threats
    const currentBoosts = deriveRiskBoosts(activeThreats)
    const edgeKey = edge ? getEdgeKey(edge.from, edge.to) : ''
    const extraRisk = currentBoosts[edgeKey] || 0
    const effectiveRisk = edge ? Math.max(0, edge.risk + extraRisk) : 0

    // Calculate traversal costs with EFFECTIVE risk
    const cost = calculateStepCost({
      ...(edge || {}),
      risk: effectiveRisk,
    })

    // Apply costs to both Aarav and Mira
    const updatedAarav = applyStepCost(characters.aarav, cost)
    const updatedMira = applyStepCost(characters.mira, cost)

    // Evaluate game over condition
    const isAtBeacon = nextNodeId === beaconNodeId
    const newStatus = checkGameOver(updatedAarav, updatedMira, isAtBeacon)

    // Log the step and consumption
    const boostNote = extraRisk > 0 ? ` (Boost +${extraRisk} active!)` : ''
    const combatNote =
      cost.ammoNeeded > 0
        ? ` Fired ${cost.ammoNeeded} ammo in combat.`
        : ''
    const damageNote =
      cost.potentialHealthDamage > 0 &&
      (characters.aarav.supplies.ammo < cost.ammoNeeded ||
        characters.mira.supplies.ammo < cost.ammoNeeded)
        ? ` Sustained ${cost.potentialHealthDamage} HP swarm damage!`
        : ''

    addLog(
      `Hiked to ${nextNode ? nextNode.name : nextNodeId} (Risk ${effectiveRisk}/10)${boostNote}. Spent Food -${cost.food}, Water -${cost.water}, Battery -${cost.battery}.${combatNote}${damageNote}`
    )

    if (newStatus === 'lost') {
      if (updatedAarav.supplies.health <= 0 || updatedMira.supplies.health <= 0) {
        addLog(`☠ CRITICAL CASUALTY: A team member succumbed to fatal injuries. Mission failed.`)
      } else {
        addLog(`☠ TOTAL DEHYDRATION: Party ran completely dry of drinking water. Mission failed.`)
      }
    } else if (newStatus === 'won') {
      addLog(`★ BEACON SANCTUARY REACHED: Aarav and Mira have reached the haven safely!`)
    }

    // Advance active threats by decreasing stepsLeft
    const updatedThreats = []
    for (const threat of activeThreats) {
      const remaining = threat.stepsLeft - 1
      if (remaining <= 0) {
        addLog(`✓ Threat expired: ${threat.name}. Road safety restored.`)
      } else {
        updatedThreats.push({
          ...threat,
          stepsLeft: remaining,
        })
      }
    }

    const nextRiskBoosts = deriveRiskBoosts(updatedThreats)

    // Check detour completion
    let effectiveTarget = routeTarget || beaconNodeId
    if (nextNodeId === routeTarget && routeTarget !== beaconNodeId) {
      addLog(`✓ Arrived at detour destination: ${nextNode ? nextNode.name : nextNodeId}. Resuming heading for The Beacon Sanctuary.`)
      effectiveTarget = beaconNodeId
    }

    // Update visited waypoints
    const updatedVisited = visitedNodeIds.includes(nextNodeId)
      ? visitedNodeIds
      : [...visitedNodeIds, nextNodeId]

    // Calculate updated route from the new position onwards
    const remainingRoute = newStatus === 'won'
      ? null
      : findRoute(city, nextNodeId, effectiveTarget, routeMode, nextRiskBoosts)

    set({
      currentNodeId: nextNodeId,
      selectedNodeId: nextNodeId,
      visitedNodeIds: updatedVisited,
      activeRoute: remainingRoute,
      routeTarget: effectiveTarget,
      activeThreats: updatedThreats,
      riskBoosts: nextRiskBoosts,
      gameStatus: newStatus,
      characters: {
        aarav: updatedAarav,
        mira: updatedMira,
      },
    })

    // Auto random events roll: 25% chance per step when enabled
    if (autoEvents && newStatus === null && Math.random() < 0.25) {
      get().triggerRandomEvent()
    }
  },

  // Scavenge supplies at current waypoint
  scavengeCurrentNode: () => {
    const { city, currentNodeId, lootedNodeIds, characters, gameStatus, addLog } = get()
    if (gameStatus !== null) return
    if (lootedNodeIds.includes(currentNodeId)) return

    const node = city.nodes.find((n) => n.id === currentNodeId)
    if (!node || !node.supplies) return

    // Transfer cache: first Aarav takes what he can carry, then Mira takes the rest
    const { updatedCharacter: aaravAfter, remainingNodeSupplies: rem1 } = scavengeNode(
      node.supplies,
      characters.aarav
    )
    const { updatedCharacter: miraAfter } = scavengeNode(rem1, characters.mira)

    addLog(
      `Scavenged ${node.name}: secured Food +${node.supplies.food || 0}, Water +${node.supplies.water || 0}, Ammo +${node.supplies.ammo || 0}, Medkits +${node.supplies.medkit || 0}, Battery +${node.supplies.battery || 0}%.`
    )

    set({
      lootedNodeIds: [...lootedNodeIds, currentNodeId],
      characters: {
        aarav: aaravAfter,
        mira: miraAfter,
      },
    })
  },

  // Use 1 medkit on a specific survivor
  useMedkitOn: (characterKey) => {
    const { characters, gameStatus, addLog } = get()
    if (gameStatus !== null) return
    const char = characters[characterKey]
    if (!char || char.supplies.medkits <= 0 || char.supplies.health >= 100) return

    const updated = useMedkit(char)
    addLog(`Applied emergency medkit to ${char.name} (+30 HP).`)

    set({
      characters: {
        ...characters,
        [characterKey]: updated,
      },
    })
  },

  // Synchronize state imported from partner Base64 token
  syncState: (code) => {
    const data = importState(code)
    if (!data) return false

    const { city, beaconNodeId } = get()
    const target = data.routeTarget || beaconNodeId
    const activeThreats = data.activeThreats || []
    const derivedBoosts = deriveRiskBoosts(activeThreats)
    const newRoute = data.gameStatus === 'won'
      ? null
      : findRoute(city, data.currentNodeId, target, data.routeMode || 'balanced', derivedBoosts)

    set({
      currentNodeId: data.currentNodeId,
      selectedNodeId: data.currentNodeId,
      visitedNodeIds: data.visitedNodeIds || [data.currentNodeId],
      lootedNodeIds: data.lootedNodeIds || [],
      characters: {
        aarav: data.aarav,
        mira: data.mira,
      },
      activeThreats: activeThreats,
      riskBoosts: derivedBoosts,
      routeMode: data.routeMode || 'balanced',
      routeTarget: target,
      gameStatus: data.gameStatus || null,
      activeRoute: newRoute,
    })

    get().addLog(`State synced from partner.`)
    return true
  },

  // Instant test party casualty / failed to reach beacon (for demonstration)
  triggerDefeat: () => {
    const { characters, addLog } = get()
    const updatedAarav = {
      ...characters.aarav,
      supplies: { ...characters.aarav.supplies, health: 0 },
    }
    set({
      characters: {
        ...characters,
        aarav: updatedAarav,
      },
      gameStatus: 'lost',
    })
    addLog(`☠ CRITICAL CASUALTY: Aarav succumbed to catastrophic injuries. Failed to reach beacon.`)
  },

  // Reset party back to the starting bunker
  resetJourney: () => {
    const { city, beaconNodeId, routeMode } = get()
    const defaultStart = city.nodes.find((n) => n.type === 'start') || city.nodes[0]
    const freshRoute = findRoute(city, defaultStart.id, beaconNodeId, routeMode, {})

    set({
      currentNodeId: defaultStart.id,
      selectedNodeId: defaultStart.id,
      visitedNodeIds: [defaultStart.id],
      routeTarget: beaconNodeId,
      activeRoute: freshRoute,
      activeThreats: [],
      riskBoosts: {},
      autoEvents: false,
      lootedNodeIds: [],
      gameStatus: null,
      eventLog: [
        `[Reset] Expedition restarted at Outpost Zero. Supplies, vitals, and threat board fully refreshed.`,
      ],
      characters: {
        aarav: {
          name: 'Aarav',
          role: 'Scout & Navigator',
          supplies: { ...INITIAL_SUPPLIES },
        },
        mira: {
          name: 'Mira',
          role: 'Engineer & Medic',
          supplies: { ...INITIAL_SUPPLIES },
        },
      },
    })
  },
}))
