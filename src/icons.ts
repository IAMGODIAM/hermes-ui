// Minimal SVG icons - inline for zero network requests

export const icons = {
  send: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 10L17 3L10 17L9 11L3 10Z" fill="currentColor"/></svg>`,
  
  stop: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="4" width="12" height="12" rx="2" fill="currentColor"/></svg>`,
  
  terminal: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3L6 7L2 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 11H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  
  file: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2H10L13 5V14H4V2Z" stroke="currentColor" stroke-width="1.2"/><path d="M10 2V5H13" stroke="currentColor" stroke-width="1.2"/></svg>`,
  
  search: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4" stroke="currentColor" stroke-width="1.2"/><path d="M10 10L14 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  
  globe: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M2 8H14M8 2C6 4 6 12 8 14M8 2C10 4 10 12 8 14" stroke="currentColor" stroke-width="1.2"/></svg>`,
  
  code: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 4L1 8L5 12M11 4L15 8L11 12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  
  memory: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 6V10L8 14L2 10V6L8 2Z" stroke="currentColor" stroke-width="1.2"/></svg>`,
  
  check: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8L6 11L13 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  
  error: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M5 5L11 11M11 5L5 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  
  spinner: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2A6 6 0 1 0 14 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  
  chevronDown: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  
  chevronRight: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  
  hermie: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="currentColor" stroke-width="1.5"/><path d="M9 11C9 11 10 9 11 9M17 11C17 11 18 9 19 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M10 16C10 16 12 19 14 19C16 19 18 16 18 16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  
  user: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="10" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M6 24C6 19 10 16 14 16C18 16 22 19 22 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
}

export function getToolIcon(toolName: string): string {
  if (toolName.includes('terminal')) return icons.terminal
  if (toolName.includes('file') || toolName.includes('read') || toolName.includes('write') || toolName.includes('patch')) return icons.file
  if (toolName.includes('search')) return icons.search
  if (toolName.includes('browser') || toolName.includes('web') || toolName.includes('navigate')) return icons.globe
  if (toolName.includes('code') || toolName.includes('execute')) return icons.code
  if (toolName.includes('memory') || toolName.includes('skill')) return icons.memory
  return icons.terminal
}
