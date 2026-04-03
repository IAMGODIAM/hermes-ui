// Hermes UI — Main Entry
// An AI's interface, designed by the AI itself.

import { initRenderer } from './renderer'
import { store } from './state'
import { configure, startHealthMonitor, checkHealth } from './api'

// ─── Boot ───────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Load saved config from localStorage
  loadConfig()

  // Register settings dialog for renderer access
  ;(window as any).__showSettingsDialog = showSettingsDialog

  // Initialize renderer
  initRenderer()

  // Start health monitor (checks every 10s)
  startHealthMonitor(10000)

  // Show welcome state if no messages
  showWelcome()
})

// ─── Config Persistence ─────────────────────────────────────────

function loadConfig(): void {
  const saved = localStorage.getItem('hermes-ui-config')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      configure(config)
    } catch { /* use defaults */ }
  }
}

export function saveConfig(baseUrl: string, apiKey?: string): void {
  const config: any = { baseUrl }
  if (apiKey) config.apiKey = apiKey
  localStorage.setItem('hermes-ui-config', JSON.stringify(config))
  configure(config)
  // Re-check health with new config
  checkHealth()
}

// ─── Welcome Screen ─────────────────────────────────────────────

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
    <button class="welcome-config-btn" id="config-btn">Configure Connection</button>
  `
  container.insertBefore(welcome, container.firstChild)

  // Config button handler
  const configBtn = document.getElementById('config-btn')
  if (configBtn) {
    configBtn.addEventListener('click', showSettingsDialog)
  }

  // Remove welcome when first message arrives
  const unsub = store.subscribe(() => {
    if (store.getState().messages.length > 0) {
      welcome.remove()
      unsub()
    }
  })
}

// ─── Settings Dialog ────────────────────────────────────────────

export function showSettingsDialog(): void {
  // Remove existing dialog if open
  const existing = document.getElementById('settings-dialog')
  if (existing) {
    existing.remove()
    return
  }

  const saved = localStorage.getItem('hermes-ui-config')
  let currentUrl = 'http://localhost:8642'
  let currentKey = ''
  if (saved) {
    try {
      const c = JSON.parse(saved)
      currentUrl = c.baseUrl || currentUrl
      currentKey = c.apiKey || ''
    } catch { /* defaults */ }
  }

  const overlay = document.createElement('div')
  overlay.id = 'settings-dialog'
  overlay.className = 'settings-overlay'
  overlay.innerHTML = `
    <div class="settings-panel">
      <div class="settings-header">
        <span class="settings-title">Connection Settings</span>
        <button class="settings-close" id="settings-close">✕</button>
      </div>
      <div class="settings-body">
        <label class="settings-label">
          API Server URL
          <input type="text" class="settings-input" id="settings-url" value="${currentUrl}" placeholder="http://localhost:8642" />
          <span class="settings-hint">The Hermes gateway API server endpoint</span>
        </label>
        <label class="settings-label">
          API Key (optional)
          <input type="password" class="settings-input" id="settings-key" value="${currentKey}" placeholder="Leave empty for local" />
          <span class="settings-hint">Required if API_SERVER_KEY is set on the gateway</span>
        </label>
        <div class="settings-status" id="settings-status"></div>
      </div>
      <div class="settings-footer">
        <button class="settings-btn secondary" id="settings-test">Test Connection</button>
        <button class="settings-btn primary" id="settings-save">Save</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  // Event handlers
  const close = () => overlay.remove()
  document.getElementById('settings-close')!.addEventListener('click', close)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })

  document.getElementById('settings-test')!.addEventListener('click', async () => {
    const url = (document.getElementById('settings-url') as HTMLInputElement).value.trim()
    const statusEl = document.getElementById('settings-status')!
    statusEl.textContent = 'Testing...'
    statusEl.className = 'settings-status testing'

    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        statusEl.textContent = '✓ Connected to Hermes gateway'
        statusEl.className = 'settings-status success'
      } else {
        statusEl.textContent = `✗ Server responded with ${res.status}`
        statusEl.className = 'settings-status error'
      }
    } catch {
      statusEl.textContent = '✗ Cannot reach server'
      statusEl.className = 'settings-status error'
    }
  })

  document.getElementById('settings-save')!.addEventListener('click', () => {
    const url = (document.getElementById('settings-url') as HTMLInputElement).value.trim()
    const key = (document.getElementById('settings-key') as HTMLInputElement).value.trim()
    saveConfig(url, key || undefined)
    close()
  })
}
