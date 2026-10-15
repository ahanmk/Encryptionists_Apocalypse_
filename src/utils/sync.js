/**
 * OFFLINE P2P STATE SYNCHRONIZATION FOR "THE LAST BEACON"
 * Encodes and decodes party progression into compact portable Base64 strings.
 * Requires zero internet connection, servers, or external libraries.
 */

/**
 * Serializes the crucial game progression state into a portable Base64 token.
 * 
 * @param {Object} state - Current game store state
 * @returns {string} Base64 encoded state string
 */
export function exportState(state) {
  if (!state) return ''

  const payload = {
    currentNodeId: state.currentNodeId,
    visitedNodeIds: state.visitedNodeIds || [],
    lootedNodeIds: state.lootedNodeIds || [],
    aarav: state.characters?.aarav || state.aarav,
    mira: state.characters?.mira || state.mira,
    activeThreats: state.activeThreats || [],
    routeMode: state.routeMode || 'balanced',
    routeTarget: state.routeTarget || state.beaconNodeId,
    gameStatus: state.gameStatus || null,
    exportedAt: Date.now(),
  }

  try {
    const jsonStr = JSON.stringify(payload)
    // UTF-8 safe Base64 encoding in vanilla JavaScript
    return btoa(
      encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode('0x' + p1)
      )
    )
  } catch (err) {
    console.error('Failed to export state:', err)
    return ''
  }
}

/**
 * Validates and parses an incoming Base64 synchronization code from a partner.
 * 
 * @param {string} code - Base64 encoded string
 * @returns {Object|null} Decoded state object or null if corrupted/invalid
 */
export function importState(code) {
  if (!code || typeof code !== 'string') return null

  try {
    const clean = code.trim()
    // UTF-8 safe Base64 decoding in vanilla JavaScript
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(clean), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const data = JSON.parse(jsonStr)

    // Structural validation to prevent malformed injections
    if (
      !data.currentNodeId ||
      !data.aarav ||
      !data.mira ||
      !Array.isArray(data.visitedNodeIds)
    ) {
      return null
    }

    return data
  } catch (err) {
    return null
  }
}
