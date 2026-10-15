/**
 * SUPPLY & SURVIVAL LOGIC FOR "THE LAST BEACON"
 * Pure utility functions governing consumption, scavenging, healing, and game over checks.
 */

// Inventory maximum limits
export const MAX_CAPS = {
  health: 100,
  food: 100,
  water: 100,
  battery: 100,
  ammo: 20,
  medkits: 5,
}

/**
 * Calculates what traveling across a specific road costs a survivor.
 * 
 * RULES:
 * 1. Base Cost (Walking endurance):
 *    - Food: -4 (calories burned hiking under gear)
 *    - Water: -6 (hydration depleted by physical exertion)
 *    - Battery: -3 (flashlights, radios, navigation scanners)
 * 
 * 2. Combat Encounter Cost (Road Risk >= 5):
 *    - Ammo: Math.ceil(risk / 4) rounds needed for suppressive fire
 * 
 * 3. Ambush & Swarm Damage (Road Risk >= 7):
 *    - Health damage = (risk - 5)
 *    - Defense Rule: If the survivor has ammo to spend, suppressive fire
 *      keeps the infected at bay, reducing health damage to ZERO.
 *      If ammo runs dry, the survivor takes direct lacerations/bites.
 */
export function calculateStepCost(edge) {
  const risk = edge ? (edge.risk || 0) : 0

  const foodCost = 4
  const waterCost = 6
  const batteryCost = 3
  const ammoNeeded = risk >= 5 ? Math.ceil(risk / 4) : 0
  const potentialHealthDamage = risk >= 7 ? (risk - 5) : 0

  return {
    food: foodCost,
    water: waterCost,
    battery: batteryCost,
    ammoNeeded,
    potentialHealthDamage,
    risk,
  }
}

/**
 * Applies the calculated step cost to a character's inventory.
 * Guarantees no stat drops below 0.
 * 
 * @param {Object} character - Character object { name, supplies: { health, food, water, battery, ammo, medkits } }
 * @param {Object} cost - Cost object returned from calculateStepCost()
 * @returns {Object} Updated clone of character
 */
export function applyStepCost(character, cost) {
  const current = { ...character.supplies }

  // 1. Deplete base supplies (food, water, battery)
  const newFood = Math.max(0, current.food - cost.food)
  const newWater = Math.max(0, current.water - cost.water)
  const newBattery = Math.max(0, current.battery - cost.battery)

  // 2. Resolve combat & ammo defense
  let newAmmo = current.ammo
  let newHealth = current.health

  if (cost.ammoNeeded > 0) {
    if (current.ammo >= cost.ammoNeeded) {
      // Survivor has ammo: fire back and avoid taking health damage
      newAmmo = current.ammo - cost.ammoNeeded
    } else {
      // Survivor is out of ammo or has insufficient rounds: take direct zombie damage
      newAmmo = 0
      newHealth = Math.max(0, current.health - cost.potentialHealthDamage)
    }
  } else if (cost.potentialHealthDamage > 0) {
    newHealth = Math.max(0, current.health - cost.potentialHealthDamage)
  }

  // Dehydration penalty: if water hits 0, dehydration inflicts additional health damage
  if (newWater === 0) {
    newHealth = Math.max(0, newHealth - 8)
  }

  return {
    ...character,
    supplies: {
      ...current,
      health: newHealth,
      food: newFood,
      water: newWater,
      battery: newBattery,
      ammo: newAmmo,
    },
  }
}

/**
 * Scavenges a node's supplies into a character's inventory up to maximum caps.
 * 
 * @param {Object} nodeSupplies - { food, water, ammo, medkit, battery } from node
 * @param {Object} character - Target character receiving supplies
 * @returns {Object} { updatedCharacter, remainingNodeSupplies }
 */
export function scavengeNode(nodeSupplies, character) {
  if (!nodeSupplies) {
    return { updatedCharacter: character, remainingNodeSupplies: null }
  }

  const charSupplies = { ...character.supplies }
  const remaining = { ...nodeSupplies }

  // Helper to transfer an item up to cap
  const transfer = (itemKey, cap) => {
    const available = remaining[itemKey] || 0
    const space = Math.max(0, cap - (charSupplies[itemKey] || 0))
    const amountToTake = Math.min(available, space)

    charSupplies[itemKey] = (charSupplies[itemKey] || 0) + amountToTake
    remaining[itemKey] = available - amountToTake
  }

  transfer('food', MAX_CAPS.food)
  transfer('water', MAX_CAPS.water)
  transfer('battery', MAX_CAPS.battery)
  transfer('ammo', MAX_CAPS.ammo)
  transfer('medkits', MAX_CAPS.medkits)

  return {
    updatedCharacter: {
      ...character,
      supplies: charSupplies,
    },
    remainingNodeSupplies: remaining,
  }
}

/**
 * Uses 1 medkit to restore 30 HP (capped at 100).
 * 
 * @param {Object} character - Target character
 * @returns {Object} Updated character
 */
export function useMedkit(character) {
  if (!character || !character.supplies) return character
  if (character.supplies.medkits <= 0) return character
  if (character.supplies.health >= MAX_CAPS.health) return character

  const newHealth = Math.min(MAX_CAPS.health, character.supplies.health + 30)
  const newMedkits = character.supplies.medkits - 1

  return {
    ...character,
    supplies: {
      ...character.supplies,
      health: newHealth,
      medkits: newMedkits,
    },
  }
}

/**
 * Determines a survivor's status condition:
 * - "critical": Health < 30 OR any essential (food, water, battery) < 10
 * - "low": Any essential (food, water, battery) < 25 (and not critical)
 * - "ok": All stats in good operational threshold
 */
export function getStatus(character) {
  if (!character || !character.supplies) return 'ok'
  const { health, food, water, battery } = character.supplies

  if (health < 30 || food < 10 || water < 10 || battery < 10) {
    return 'critical'
  }
  if (food < 25 || water < 25 || battery < 25) {
    return 'low'
  }
  return 'ok'
}

/**
 * Evaluates whether the game is won, lost, or ongoing:
 * 
 * - "lost" if:
 *   1. Aarav's health reaches 0 (fatal casualty)
 *   2. Mira's health reaches 0 (fatal casualty)
 *   3. Both characters have 0 water (total dehydration in the wasteland)
 * 
 * - "won" if:
 *   1. Party is stationed at the beacon node and neither is lost
 * 
 * - null if the journey continues
 */
export function checkGameOver(aarav, mira, isAtBeacon) {
  if (!aarav || !mira) return null

  // Fatal health loss
  if (aarav.supplies.health <= 0 || mira.supplies.health <= 0) {
    return 'lost'
  }

  // Double dehydration
  if (aarav.supplies.water <= 0 && mira.supplies.water <= 0) {
    return 'lost'
  }

  // Reached salvation
  if (isAtBeacon) {
    return 'won'
  }

  return null
}
