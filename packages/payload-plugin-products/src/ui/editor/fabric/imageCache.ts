/* Decoded-image LRU cache keyed by media id.
 *
 *   Why cache the HTMLImageElement, not the FabricImage?
 *   A FabricImage instance is canvas-bound — reusing it across canvases (or
 *   across remounts of the same canvas) breaks Fabric's bookkeeping. The
 *   decoded HTMLImageElement, on the other hand, can be wrapped in any number
 *   of fresh FabricImage instances. Reusing it skips the network round-trip
 *   AND the JPEG/PNG decode — which is the actual cost when switching color
 *   chips between already-loaded mockups.
 *
 *   Bounded LRU, cap 64. Admin sessions are short (minutes, not days) and a
 *   product with 6 views × 4 colors = 24 mockups fits comfortably. Eviction
 *   is O(1) via insertion-order delete-then-set on a Map.
 */

const CACHE_CAP = 64
const cache = new Map<string, HTMLImageElement>()

export function getCachedElement(mediaId: string): HTMLImageElement | undefined {
  const hit = cache.get(mediaId)
  if (hit) {
    cache.delete(mediaId)
    cache.set(mediaId, hit) // bump to MRU
  }
  return hit
}

export function setCachedElement(mediaId: string, el: HTMLImageElement): void {
  if (cache.has(mediaId)) cache.delete(mediaId)
  cache.set(mediaId, el)
  if (cache.size > CACHE_CAP) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
}

export function clearImageCache(): void {
  cache.clear()
}
