/**
 * ROUTING UTILITIES FOR "THE LAST BEACON"
 * Implements Dijkstra's Shortest Path Algorithm on an undirected graph.
 */

/**
 * Returns a consistent unique key for an undirected road between two nodes.
 * E.g., getEdgeKey('node-1', 'node-2') === getEdgeKey('node-2', 'node-1') -> "node-1--node-2"
 */
export function getEdgeKey(a, b) {
  return a < b ? `${a}--${b}` : `${b}--${a}`
}

/**
 * Calculate the traversal cost of a road based on the selected survival mode:
 * 
 * 1. "fastest": cost = distance
 *    - Ignores risk completely. The team sprints through whatever lies ahead,
 *      even if it's the swarm epicenter, to minimize physical meters traveled.
 * 
 * 2. "safest": cost = distance * 0.2 + risk * 10
 *    - Strongly prioritizes survival. High risk edges receive a massive penalty.
 *      Each point of risk is weighted as heavily as 50 meters of detour.
 * 
 * 3. "balanced": cost = distance + risk * 4
 *    - Standard operational procedure. Avoids extreme death traps without taking
 *      excessive, exhausting detours that drain supplies.
 */
function calculateEdgeCost(distance, risk, mode) {
  switch (mode) {
    case 'fastest':
      return distance

    case 'safest':
      return distance * 0.2 + risk * 10

    case 'balanced':
    default:
      return distance + risk * 4
  }
}

/**
 * Builds an adjacency list from the city edges (two-way roads).
 */
function buildAdjacencyList(edges, riskBoosts = {}) {
  const adj = new Map()

  for (const edge of edges) {
    const key = getEdgeKey(edge.from, edge.to)
    // Dynamic risk boost added from events/modifiers (minimum risk is 0)
    const extraRisk = riskBoosts[key] || 0
    const effectiveRisk = Math.max(0, edge.risk + extraRisk)

    if (!adj.has(edge.from)) adj.set(edge.from, [])
    if (!adj.has(edge.to)) adj.set(edge.to, [])

    adj.get(edge.from).push({
      neighbor: edge.to,
      distance: edge.distance,
      risk: effectiveRisk,
      edgeKey: key,
    })

    adj.get(edge.to).push({
      neighbor: edge.from,
      distance: edge.distance,
      risk: effectiveRisk,
      edgeKey: key,
    })
  }

  return adj
}

/**
 * Dijkstra's algorithm to find the optimal path from fromId to toId.
 * 
 * @param {Object} city - Full city JSON (nodes and edges)
 * @param {string} fromId - Starting node ID
 * @param {string} toId - Target beacon node ID
 * @param {string} mode - "fastest" | "safest" | "balanced"
 * @param {Object} riskBoosts - Optional dynamic risk modifiers per road
 * @returns {Object|null} { path, totalDistance, totalRisk, maxRisk, hops } or null
 */
export function findRoute(city, fromId, toId, mode = 'balanced', riskBoosts = {}) {
  if (!city || !city.nodes || !city.edges || !fromId || !toId) return null
  if (fromId === toId) {
    return {
      path: [fromId],
      totalDistance: 0,
      totalRisk: 0,
      maxRisk: 0,
      hops: 0,
    }
  }

  const adj = buildAdjacencyList(city.edges, riskBoosts)

  // Dijkstra data structures:
  // distances: minimum cost found from source to each node
  // previous: reconstructs the path backwards once target is reached
  // edgeDetails: stores distance and risk of the edge used to reach each node
  const distances = new Map()
  const previous = new Map()
  const edgeDetails = new Map()
  const unvisited = new Set()

  for (const node of city.nodes) {
    distances.set(node.id, Infinity)
    unvisited.add(node.id)
  }

  distances.set(fromId, 0)

  while (unvisited.size > 0) {
    // Pick the unvisited node with the smallest cumulative cost
    let currentId = null
    let smallestCost = Infinity

    for (const id of unvisited) {
      const cost = distances.get(id)
      if (cost < smallestCost) {
        smallestCost = cost
        currentId = id
      }
    }

    // If destination is reached or remaining nodes are unreachable
    if (!currentId || smallestCost === Infinity || currentId === toId) {
      break
    }

    unvisited.delete(currentId)

    // Evaluate neighbors
    const neighbors = adj.get(currentId) || []
    for (const edge of neighbors) {
      if (!unvisited.has(edge.neighbor)) continue

      const cost = calculateEdgeCost(edge.distance, edge.risk, mode)
      const alternateCost = distances.get(currentId) + cost

      if (alternateCost < distances.get(edge.neighbor)) {
        distances.set(edge.neighbor, alternateCost)
        previous.set(edge.neighbor, currentId)
        edgeDetails.set(edge.neighbor, {
          distance: edge.distance,
          risk: edge.risk,
        })
      }
    }
  }

  // If destination is not reachable
  if (!previous.has(toId)) return null

  // Reconstruct path from destination back to start
  const path = []
  let curr = toId
  while (curr) {
    path.unshift(curr)
    curr = previous.get(curr)
  }

  // Calculate human-readable stats for display and judging
  let totalDistance = 0
  let totalRisk = 0
  let maxRisk = 0

  for (let i = 1; i < path.length; i++) {
    const details = edgeDetails.get(path[i])
    if (details) {
      totalDistance += details.distance
      totalRisk += details.risk
      if (details.risk > maxRisk) {
        maxRisk = details.risk
      }
    }
  }

  return {
    path,
    totalDistance,
    totalRisk,
    maxRisk,
    hops: path.length - 1,
    mode,
  }
}
