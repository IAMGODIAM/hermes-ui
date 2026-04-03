// Hermes UI Design System
// An AI designing its own face.

export const theme = {
  // Core palette - warm gold on deep dark, the Hermes signature
  colors: {
    bg: '#0a0a0c',
    bgSurface: '#111114',
    bgElevated: '#18181c',
    bgHover: '#1f1f24',
    
    // Text hierarchy
    textPrimary: '#e8e6e3',
    textSecondary: '#9d9a95',
    textMuted: '#5c5955',
    textAccent: '#d4a853',
    
    // Agent identity
    agentGold: '#d4a853',
    agentGoldDim: '#a08030',
    agentGoldGlow: 'rgba(212, 168, 83, 0.15)',
    
    // User messages
    userBlue: '#4a9eff',
    userBlueDim: '#2a6fc0',
    userBlueBg: 'rgba(74, 158, 255, 0.08)',
    
    // Semantic
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    
    // Tool execution
    toolBg: 'rgba(212, 168, 83, 0.04)',
    toolBorder: 'rgba(212, 168, 83, 0.12)',
    toolText: '#b8a070',
    
    // Borders
    border: 'rgba(255, 255, 255, 0.06)',
    borderSubtle: 'rgba(255, 255, 255, 0.03)',
    borderAccent: 'rgba(212, 168, 83, 0.2)',
    
    // Scrollbar
    scrollbar: 'rgba(255, 255, 255, 0.08)',
    scrollbarHover: 'rgba(255, 255, 255, 0.15)',
  },
  
  // Typography - chosen for readability and character
  fonts: {
    body: '15px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    bodySize: 15,
    bodyLineHeight: 22,
    
    mono: '13px "JetBrains Mono", "Fira Code", "SF Mono", monospace',
    monoSize: 13,
    monoLineHeight: 20,
    
    heading: '600 18px "Inter", -apple-system, sans-serif',
    headingSize: 18,
    headingLineHeight: 26,
    
    small: '13px "Inter", -apple-system, sans-serif',
    smallSize: 13,
    smallLineHeight: 18,
    
    tiny: '11px "Inter", -apple-system, sans-serif',
    tinySize: 11,
    tinyLineHeight: 16,
  },
  
  // Spacing scale (4px base)
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  
  // Border radius
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 20,
    pill: 9999,
  },
  
  // Transitions
  transition: {
    fast: '120ms ease-out',
    normal: '200ms ease-out',
    slow: '400ms ease-out',
  },
  
  // Layout
  layout: {
    maxChatWidth: 720,
    messagePadding: 16,
    bubblePadding: 14,
    inputHeight: 52,
    headerHeight: 56,
    sidebarWidth: 280,
  },
} as const

export type Theme = typeof theme
