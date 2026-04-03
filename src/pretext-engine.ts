// Pretext Engine - The core text measurement layer
// Uses @chenglou/pretext for DOM-free text layout

import { prepare, prepareWithSegments, layout, layoutWithLines, walkLineRanges } from '@chenglou/pretext'
import type { PreparedText, PreparedTextWithSegments, LayoutResult, LayoutLinesResult } from '@chenglou/pretext'
import { theme } from './theme'

// Cache prepared texts to avoid re-measurement
const preparedCache = new Map<string, PreparedText>()
const preparedSegmentsCache = new Map<string, PreparedTextWithSegments>()

function cacheKey(text: string, font: string): string {
  return `${font}::${text}`
}

export function measureText(text: string, font: string = theme.fonts.body): PreparedText {
  const key = cacheKey(text, font)
  let prepared = preparedCache.get(key)
  if (!prepared) {
    prepared = prepare(text, font)
    preparedCache.set(key, prepared)
    // Evict old entries if cache gets too large
    if (preparedCache.size > 2000) {
      const firstKey = preparedCache.keys().next().value
      if (firstKey) preparedCache.delete(firstKey)
    }
  }
  return prepared
}

export function measureTextWithSegments(text: string, font: string = theme.fonts.body): PreparedTextWithSegments {
  const key = cacheKey(text, font)
  let prepared = preparedSegmentsCache.get(key)
  if (!prepared) {
    prepared = prepareWithSegments(text, font)
    preparedSegmentsCache.set(key, prepared)
    if (preparedSegmentsCache.size > 1000) {
      const firstKey = preparedSegmentsCache.keys().next().value
      if (firstKey) preparedSegmentsCache.delete(firstKey)
    }
  }
  return prepared
}

export function getTextLayout(text: string, maxWidth: number, font: string = theme.fonts.body, lineHeight: number = theme.fonts.bodyLineHeight): LayoutResult {
  const prepared = measureText(text, font)
  return layout(prepared, maxWidth, lineHeight)
}

export function getTextLayoutWithLines(text: string, maxWidth: number, font: string = theme.fonts.body, lineHeight: number = theme.fonts.bodyLineHeight): LayoutLinesResult {
  const prepared = measureTextWithSegments(text, font)
  return layoutWithLines(prepared, maxWidth, lineHeight)
}

// Shrinkwrap: find the tightest width that doesn't increase line count
export function shrinkwrapWidth(text: string, maxWidth: number, font: string = theme.fonts.body): number {
  const prepared = measureTextWithSegments(text, font)
  
  let lineCount = 0
  walkLineRanges(prepared, maxWidth, () => { lineCount++ })
  
  if (lineCount <= 1) {
    // Single line - just return the actual width
    const result = layoutWithLines(prepared, maxWidth, theme.fonts.bodyLineHeight)
    if (result.lines.length > 0) {
      return Math.ceil(result.lines[0].width)
    }
    return 0
  }
  
  // Binary search for tightest width
  let lo = 0
  let hi = maxWidth
  
  while (hi - lo > 1) {
    const mid = (lo + hi) / 2
    let midLines = 0
    walkLineRanges(prepared, mid, () => { midLines++ })
    
    if (midLines <= lineCount) {
      hi = mid
    } else {
      lo = mid
    }
  }
  
  return Math.ceil(hi)
}

// Get exact height for a text block
export function getTextHeight(text: string, maxWidth: number, font: string = theme.fonts.body, lineHeight: number = theme.fonts.bodyLineHeight): number {
  return getTextLayout(text, maxWidth, font, lineHeight).height
}

// Clear caches (call on font change or memory pressure)
export function clearMeasurementCache(): void {
  preparedCache.clear()
  preparedSegmentsCache.clear()
}
