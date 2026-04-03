// Hermes UI — Main Entry
// An AI's interface, designed by the AI itself.

import { initRenderer } from './renderer'
import { store } from './state'

// Boot
document.addEventListener('DOMContentLoaded', () => {
  initRenderer()
  
  // Mark as connected (simulation mode)
  setTimeout(() => {
    store.update({ isConnected: true })
  }, 800)
  
  // Show welcome state if no messages
  showWelcome()
})

function showWelcome(): void {
  const container = document.querySelector('.messages-container')
  if (!container) return
  
  const welcome = document.createElement('div')
  welcome.className = 'welcome-container'
  welcome.id = 'welcome'
  welcome.innerHTML = `
    <div class="welcome-logo">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="2"/>
        <path d="M20 24C20 24 22 20 25 20M44 24C44 24 42 20 39 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M22 38C22 38 26 44 32 44C38 44 42 38 42 38" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="welcome-text">
      The Visionary Intelligence Layer.<br>
      <span style="opacity: 0.5; font-size: 13px;">Vision first. Systems over scattered effort.</span>
    </div>
  `
  container.insertBefore(welcome, container.firstChild)
  
  // Remove welcome when first message arrives
  const unsub = store.subscribe(() => {
    if (store.getState().messages.length > 0) {
      welcome.remove()
      unsub()
    }
  })
}
