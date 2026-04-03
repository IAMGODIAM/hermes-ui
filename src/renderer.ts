// Hermes UI Renderer
// Pretext-powered layout engine with DOM pooling
// Zero DOM measurement, zero reflow, 120fps scroll

import { getTextLayout, getTextLayoutWithLines, shrinkwrapWidth } from './pretext-engine'
import { store, type ChatMessage, type ToolExecution } from './state'
import { theme } from './theme'
import { icons, getToolIcon } from './icons'

// ─── DOM Element Pools ──────────────────────────────────────────

interface MessageNode {
  root: HTMLDivElement
  avatar: HTMLDivElement
  bubble: HTMLDivElement
  textContainer: HTMLDivElement
  toolsContainer: HTMLDivElement
  toolNodes: ToolNode[]
  timestamp: HTMLDivElement
  messageId: string | null
}

interface ToolNode {
  root: HTMLDivElement
  header: HTMLDivElement
  icon: HTMLSpanElement
  label: HTMLSpanElement
  status: HTMLSpanElement
  duration: HTMLSpanElement
  body: HTMLDivElement
  toolId: string | null
}

const messagePool: MessageNode[] = []

function createMessageNode(): MessageNode {
  const root = document.createElement('div')
  root.className = 'msg-row'
  
  const avatar = document.createElement('div')
  avatar.className = 'msg-avatar'
  root.appendChild(avatar)
  
  const column = document.createElement('div')
  column.className = 'msg-column'
  root.appendChild(column)
  
  const bubble = document.createElement('div')
  bubble.className = 'msg-bubble'
  column.appendChild(bubble)
  
  const textContainer = document.createElement('div')
  textContainer.className = 'msg-text'
  bubble.appendChild(textContainer)
  
  const toolsContainer = document.createElement('div')
  toolsContainer.className = 'msg-tools'
  column.appendChild(toolsContainer)
  
  const timestamp = document.createElement('div')
  timestamp.className = 'msg-time'
  column.appendChild(timestamp)
  
  return { root, avatar, bubble, textContainer, toolsContainer, toolNodes: [], timestamp, messageId: null }
}

function createToolNode(): ToolNode {
  const root = document.createElement('div')
  root.className = 'tool-execution'
  
  const header = document.createElement('div')
  header.className = 'tool-header'
  root.appendChild(header)
  
  const icon = document.createElement('span')
  icon.className = 'tool-icon'
  header.appendChild(icon)
  
  const label = document.createElement('span')
  label.className = 'tool-label'
  header.appendChild(label)
  
  const status = document.createElement('span')
  status.className = 'tool-status'
  header.appendChild(status)
  
  const duration = document.createElement('span')
  duration.className = 'tool-duration'
  header.appendChild(duration)
  
  const body = document.createElement('div')
  body.className = 'tool-body'
  root.appendChild(body)
  
  header.addEventListener('click', () => {
    root.classList.toggle('expanded')
  })
  
  return { root, header, icon, label, status, duration, body, toolId: null }
}

function syncPool<T extends { root: HTMLElement }>(pool: T[], length: number, create: () => T, parent: HTMLElement): void {
  while (pool.length < length) {
    const node = create()
    pool.push(node)
    parent.appendChild(node.root)
  }
  for (let i = 0; i < pool.length; i++) {
    pool[i].root.style.display = i < length ? '' : 'none'
  }
}

// ─── Main Renderer ──────────────────────────────────────────────

let messagesContainer: HTMLDivElement
let inputContainer: HTMLDivElement
let inputField: HTMLTextAreaElement
let sendButton: HTMLButtonElement
let headerStatus: HTMLDivElement
let typingIndicator: HTMLDivElement
let renderScheduled = false

export function initRenderer(): void {
  const app = document.getElementById('app')!
  
  // Inject global styles
  injectStyles()
  
  // Build layout
  app.innerHTML = ''
  app.className = 'hermes-app'
  
  // Header
  const header = createElement('div', 'hermes-header', app)
  const headerLeft = createElement('div', 'header-left', header)
  const logo = createElement('div', 'header-logo', headerLeft)
  logo.innerHTML = icons.hermie
  const title = createElement('div', 'header-title', headerLeft)
  title.textContent = 'Hermie'
  const subtitle = createElement('div', 'header-subtitle', headerLeft)
  subtitle.textContent = 'Visionary Intelligence'
  headerStatus = createElement('div', 'header-status', header)
  headerStatus.textContent = 'Connecting...'
  
  // Chat area
  const chatArea = createElement('div', 'chat-area', app)
  messagesContainer = createElement('div', 'messages-container', chatArea) as HTMLDivElement
  
  // Typing indicator
  typingIndicator = createElement('div', 'typing-indicator', messagesContainer) as HTMLDivElement
  typingIndicator.innerHTML = `
    <div class="typing-avatar">${icons.hermie}</div>
    <div class="typing-dots">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  `
  typingIndicator.style.display = 'none'
  
  // Input area
  inputContainer = createElement('div', 'input-area', app) as HTMLDivElement
  const inputWrapper = createElement('div', 'input-wrapper', inputContainer)
  inputField = document.createElement('textarea')
  inputField.className = 'input-field'
  inputField.placeholder = 'Message Hermie...'
  inputField.rows = 1
  inputWrapper.appendChild(inputField)
  
  sendButton = document.createElement('button')
  sendButton.className = 'send-button'
  sendButton.innerHTML = icons.send
  inputWrapper.appendChild(sendButton)
  
  // Event listeners
  inputField.addEventListener('input', handleInput)
  inputField.addEventListener('keydown', handleKeyDown)
  sendButton.addEventListener('click', handleSend)
  window.addEventListener('resize', handleResize)
  messagesContainer.addEventListener('scroll', handleScroll)
  
  // Subscribe to state changes
  store.subscribe(scheduleRender)
  
  // Wait for fonts then render
  document.fonts.ready.then(() => {
    scheduleRender()
  })
  
  // Initial state
  updateDimensions()
}

function createElement(tag: string, className: string, parent: HTMLElement): HTMLElement {
  const el = document.createElement(tag)
  el.className = className
  parent.appendChild(el)
  return el
}

// ─── Event Handlers ─────────────────────────────────────────────

function handleInput(): void {
  store.update({ inputText: inputField.value })
  autoResizeInput()
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSend(): void {
  const text = store.getState().inputText.trim()
  if (!text || store.getState().isStreaming) return
  
  // Add user message
  store.addMessage({
    role: 'user',
    content: text,
    status: 'complete',
  })
  
  store.update({ inputText: '', autoScroll: true })
  inputField.value = ''
  autoResizeInput()
  
  // Simulate agent response (will be replaced by WebSocket)
  simulateResponse(text)
}

function handleResize(): void {
  updateDimensions()
  store.invalidateAllLayouts()
}

function handleScroll(): void {
  const el = messagesContainer
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  store.update({ autoScroll: atBottom, scrollPosition: el.scrollTop })
}

function updateDimensions(): void {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const chatWidth = Math.min(vw - 32, theme.layout.maxChatWidth)
  store.update({ viewportWidth: vw, viewportHeight: vh, chatWidth })
}

function autoResizeInput(): void {
  inputField.style.height = 'auto'
  inputField.style.height = Math.min(inputField.scrollHeight, 160) + 'px'
}

// ─── Render Loop ────────────────────────────────────────────────

function scheduleRender(): void {
  if (!renderScheduled) {
    renderScheduled = true
    requestAnimationFrame(render)
  }
}

function render(): void {
  renderScheduled = false
  const state = store.getState()
  
  // Update header
  headerStatus.textContent = state.isConnected ? state.agentModel : 'Connecting...'
  headerStatus.className = `header-status ${state.isConnected ? 'connected' : 'disconnected'}`
  
  // Render messages
  renderMessages(state.messages, state.chatWidth)
  
  // Typing indicator
  typingIndicator.style.display = state.agentStatus === 'thinking' ? 'flex' : 'none'
  
  // Update send button
  sendButton.innerHTML = state.isStreaming ? icons.stop : icons.send
  sendButton.className = `send-button ${state.inputText.trim() || state.isStreaming ? 'active' : ''}`
  
  // Auto-scroll
  if (state.autoScroll) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }
}

function renderMessages(messages: ChatMessage[], chatWidth: number): void {
  syncPool(messagePool, messages.length, createMessageNode, messagesContainer)
  
  const bubbleMaxWidth = chatWidth * 0.78
  const contentMaxWidth = bubbleMaxWidth - theme.layout.bubblePadding * 2
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const node = messagePool[i]
    
    if (node.messageId === msg.id && msg._layoutCache?.width === contentMaxWidth && msg.status === 'complete') {
      continue // Skip unchanged messages
    }
    
    node.messageId = msg.id
    const isUser = msg.role === 'user'
    const isAssistant = msg.role === 'assistant'
    
    // Row layout
    node.root.className = `msg-row ${isUser ? 'msg-user' : 'msg-agent'} ${msg.status === 'streaming' ? 'streaming' : ''}`
    
    // Avatar
    node.avatar.innerHTML = isUser ? icons.user : icons.hermie
    node.avatar.className = `msg-avatar ${isUser ? 'avatar-user' : 'avatar-agent'}`
    
    // Text content with Pretext-computed layout
    if (msg.content) {
      const font = theme.fonts.body
      const lineHeight = theme.fonts.bodyLineHeight
      
      // Use Pretext to compute shrinkwrap width for agent messages
      let bubbleWidth: number
      if (isAssistant && msg.status === 'complete') {
        const tightWidth = shrinkwrapWidth(msg.content, contentMaxWidth, font)
        bubbleWidth = Math.min(tightWidth + theme.layout.bubblePadding * 2, bubbleMaxWidth)
      } else {
        bubbleWidth = bubbleMaxWidth
      }
      
      // Get layout with lines for rendering
      const result = getTextLayoutWithLines(msg.content, bubbleWidth - theme.layout.bubblePadding * 2, font, lineHeight)
      
      // Render lines as positioned spans
      renderTextLines(node.textContainer, result, font, lineHeight)
      node.textContainer.style.height = result.height + 'px'
      node.textContainer.style.position = 'relative'
      
      node.bubble.style.width = bubbleWidth + 'px'
      node.bubble.style.display = ''
      
      // Cache layout
      msg._layoutCache = { width: contentMaxWidth, height: result.height, lineCount: result.lineCount }
    } else {
      node.bubble.style.display = 'none'
    }
    
    // Tools
    if (msg.tools && msg.tools.length > 0) {
      node.toolsContainer.style.display = ''
      renderTools(node, msg.tools)
    } else {
      node.toolsContainer.style.display = 'none'
    }
    
    // Timestamp
    node.timestamp.textContent = formatTime(msg.timestamp)
  }
}

function renderTextLines(container: HTMLElement, result: ReturnType<typeof getTextLayoutWithLines>, font: string, lineHeight: number): void {
  // Pool line elements
  const existing = container.children
  const needed = result.lines.length
  
  while (container.children.length < needed) {
    const span = document.createElement('span')
    span.className = 'text-line'
    span.style.position = 'absolute'
    span.style.left = '0'
    span.style.font = font
    span.style.lineHeight = lineHeight + 'px'
    span.style.whiteSpace = 'pre'
    container.appendChild(span)
  }
  
  for (let i = 0; i < container.children.length; i++) {
    const span = container.children[i] as HTMLSpanElement
    if (i < needed) {
      const line = result.lines[i]
      span.style.display = ''
      span.style.top = (i * lineHeight) + 'px'
      if (span.textContent !== line.text) {
        span.textContent = line.text
      }
    } else {
      span.style.display = 'none'
    }
  }
}

function renderTools(node: MessageNode, tools: ToolExecution[]): void {
  syncPool(node.toolNodes, tools.length, createToolNode, node.toolsContainer)
  
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i]
    const tn = node.toolNodes[i]
    
    if (tn.toolId === tool.id && tool.status === 'complete') continue
    
    tn.toolId = tool.id
    tn.icon.innerHTML = getToolIcon(tool.name)
    tn.label.textContent = tool.displayName || tool.name
    
    // Status indicator
    if (tool.status === 'running') {
      tn.status.innerHTML = icons.spinner
      tn.status.className = 'tool-status spinning'
    } else if (tool.status === 'complete') {
      tn.status.innerHTML = icons.check
      tn.status.className = 'tool-status complete'
    } else {
      tn.status.innerHTML = icons.error
      tn.status.className = 'tool-status error'
    }
    
    // Duration
    if (tool.endTime && tool.startTime) {
      const ms = tool.endTime - tool.startTime
      tn.duration.textContent = ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
    } else if (tool.status === 'running') {
      tn.duration.textContent = '...'
    }
    
    // Result preview in body
    if (tool.result) {
      const preview = tool.result.length > 200 ? tool.result.slice(0, 200) + '...' : tool.result
      tn.body.textContent = preview
    }
    
    tn.root.className = `tool-execution ${tool.collapsed ? '' : 'expanded'}`
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Simulation (replaced by WebSocket in production) ───────────

async function simulateResponse(userText: string): Promise<void> {
  store.update({ agentStatus: 'thinking', isStreaming: true })
  
  // Simulate thinking delay
  await sleep(600 + Math.random() * 800)
  
  // Add assistant message (streaming)
  const msg = store.addMessage({
    role: 'assistant',
    content: '',
    status: 'streaming',
  })
  
  store.update({ agentStatus: 'responding' })
  
  // Simulate tool execution for certain queries
  if (userText.toLowerCase().includes('search') || userText.toLowerCase().includes('find') || userText.toLowerCase().includes('look')) {
    const tool = store.addToolToMessage(msg.id, {
      name: 'search_files',
      displayName: 'search_files',
      status: 'running',
    })
    await sleep(800)
    store.updateTool(msg.id, tool.id, {
      status: 'complete',
      endTime: Date.now(),
      result: '{"matches": [{"file": "src/main.ts", "line": 42}]}',
    })
  }
  
  if (userText.toLowerCase().includes('file') || userText.toLowerCase().includes('read') || userText.toLowerCase().includes('code')) {
    const tool = store.addToolToMessage(msg.id, {
      name: 'read_file',
      displayName: 'read_file',
      status: 'running',
    })
    await sleep(500)
    store.updateTool(msg.id, tool.id, {
      status: 'complete',
      endTime: Date.now(),
      result: '{"content": "// file contents here...", "total_lines": 150}',
    })
  }
  
  // Stream response text
  const response = generateResponse(userText)
  for (let i = 0; i < response.length; i++) {
    store.appendToStream(msg.id, response[i])
    if (response[i] === ' ' || response[i] === '\n') {
      await sleep(8 + Math.random() * 15)
    }
  }
  
  store.updateMessage(msg.id, { status: 'complete' })
  store.update({ agentStatus: 'idle', isStreaming: false })
}

function generateResponse(input: string): string {
  const responses = [
    "I've analyzed the situation. Here's what I see:\n\nThe core issue is structural, not tactical. You're trying to solve a systems problem with a point solution. Let me lay out the strategic frame:\n\n1. The bottleneck isn't where you think it is\n2. The leverage point is upstream of execution\n3. The correct move is to architect the constraint away, not power through it\n\nShall I draft the full execution plan?",
    
    "Done. I've reviewed the codebase and here's the assessment:\n\nThe architecture is sound but the implementation has drift. Three files need attention, and there's a latent bug in the event handling that will surface under load.\n\nI can fix all three issues in one pass. The changes are safe and backwards-compatible.",
    
    "Interesting question. Let me think through this carefully.\n\nThe conventional wisdom here is actually wrong. Most people optimize for the wrong variable. The real constraint is time-to-feedback, not throughput.\n\nIf you restructure the pipeline to prioritize signal over volume, you get a 3x improvement in decision quality with less effort. It's counterintuitive but the math is clear.",
    
    "Understood. Moving on this now.\n\nI'll handle the research, synthesis, and draft. You'll get a clean deliverable — no fluff, no filler, just the strategic core and the execution steps.\n\nExpect the first version within the hour. I'll flag any decision points that need your input rather than guessing.",
    
    "This is the right move at the right time. Here's why:\n\nThe market window is narrow but real. The technology is mature enough to build on but early enough that positioning matters. First-mover advantage in this specific niche is worth more than perfection.\n\nShip the minimum credible version. Iterate from real feedback. Don't let perfect be the enemy of deployed.",
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Styles ─────────────────────────────────────────────────────

function injectStyles(): void {
  const style = document.createElement('style')
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html, body {
      height: 100%;
      overflow: hidden;
      background: ${theme.colors.bg};
      color: ${theme.colors.textPrimary};
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 15px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    #app {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    /* ─── Header ─── */
    .hermes-header {
      height: ${theme.layout.headerHeight}px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 ${theme.space.xl}px;
      border-bottom: 1px solid ${theme.colors.border};
      background: ${theme.colors.bgSurface};
      flex-shrink: 0;
      z-index: 10;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: ${theme.space.md}px;
    }
    
    .header-logo {
      color: ${theme.colors.agentGold};
      display: flex;
      align-items: center;
    }
    
    .header-title {
      font-weight: 600;
      font-size: 17px;
      color: ${theme.colors.textPrimary};
    }
    
    .header-subtitle {
      font-size: 12px;
      color: ${theme.colors.textMuted};
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    
    .header-status {
      font-size: 12px;
      color: ${theme.colors.textMuted};
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .header-status.connected::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${theme.colors.success};
      display: inline-block;
    }
    
    .header-status.disconnected::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${theme.colors.error};
      display: inline-block;
    }
    
    /* ─── Chat Area ─── */
    .chat-area {
      flex: 1;
      overflow: hidden;
      display: flex;
      justify-content: center;
    }
    
    .messages-container {
      width: 100%;
      max-width: ${theme.layout.maxChatWidth + 80}px;
      overflow-y: auto;
      overflow-x: hidden;
      padding: ${theme.space.xl}px ${theme.space.lg}px;
      scroll-behavior: smooth;
    }
    
    .messages-container::-webkit-scrollbar {
      width: 6px;
    }
    
    .messages-container::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .messages-container::-webkit-scrollbar-thumb {
      background: ${theme.colors.scrollbar};
      border-radius: 3px;
    }
    
    .messages-container::-webkit-scrollbar-thumb:hover {
      background: ${theme.colors.scrollbarHover};
    }
    
    /* ─── Message Row ─── */
    .msg-row {
      display: flex;
      gap: ${theme.space.md}px;
      margin-bottom: ${theme.space.lg}px;
      animation: msgIn 300ms ease-out;
      align-items: flex-start;
    }
    
    .msg-row.msg-user {
      flex-direction: row-reverse;
    }
    
    .msg-row.msg-user .msg-column {
      align-items: flex-end;
    }
    
    @keyframes msgIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .msg-column {
      display: flex;
      flex-direction: column;
      gap: ${theme.space.xs}px;
      min-width: 0;
    }
    
    /* ─── Avatar ─── */
    .msg-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    
    .avatar-agent {
      color: ${theme.colors.agentGold};
      background: ${theme.colors.agentGoldGlow};
    }
    
    .avatar-user {
      color: ${theme.colors.userBlue};
      background: ${theme.colors.userBlueBg};
    }
    
    .msg-avatar svg {
      width: 20px;
      height: 20px;
    }
    
    /* ─── Bubble ─── */
    .msg-bubble {
      padding: ${theme.layout.bubblePadding}px;
      border-radius: ${theme.radius.lg}px;
      max-width: 100%;
      overflow: hidden;
    }
    
    .msg-agent .msg-bubble {
      background: ${theme.colors.bgElevated};
      border: 1px solid ${theme.colors.border};
      border-bottom-left-radius: ${theme.radius.sm}px;
    }
    
    .msg-user .msg-bubble {
      background: linear-gradient(135deg, rgba(74, 158, 255, 0.12), rgba(74, 158, 255, 0.06));
      border: 1px solid rgba(74, 158, 255, 0.15);
      border-bottom-right-radius: ${theme.radius.sm}px;
    }
    
    .msg-text {
      position: relative;
      overflow: hidden;
    }
    
    .text-line {
      color: ${theme.colors.textPrimary};
      display: block;
    }
    
    .msg-user .text-line {
      color: ${theme.colors.textPrimary};
    }
    
    .msg-time {
      font-size: 11px;
      color: ${theme.colors.textMuted};
      padding: 0 4px;
    }
    
    /* ─── Streaming cursor ─── */
    .msg-row.streaming .msg-text::after {
      content: '';
      display: inline-block;
      width: 2px;
      height: 16px;
      background: ${theme.colors.agentGold};
      margin-left: 2px;
      animation: blink 600ms infinite;
      vertical-align: text-bottom;
    }
    
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    
    /* ─── Tool Execution ─── */
    .msg-tools {
      display: flex;
      flex-direction: column;
      gap: ${theme.space.xs}px;
      padding-left: 4px;
    }
    
    .tool-execution {
      border-left: 2px solid ${theme.colors.toolBorder};
      padding-left: ${theme.space.md}px;
      font-size: 13px;
    }
    
    .tool-header {
      display: flex;
      align-items: center;
      gap: ${theme.space.sm}px;
      cursor: pointer;
      padding: 3px 0;
      color: ${theme.colors.toolText};
      transition: color ${theme.transition.fast};
    }
    
    .tool-header:hover {
      color: ${theme.colors.agentGold};
    }
    
    .tool-icon {
      display: flex;
      align-items: center;
      opacity: 0.7;
    }
    
    .tool-icon svg {
      width: 14px;
      height: 14px;
    }
    
    .tool-label {
      font-family: "JetBrains Mono", monospace;
      font-size: 12px;
    }
    
    .tool-status {
      display: flex;
      align-items: center;
      margin-left: auto;
    }
    
    .tool-status svg {
      width: 14px;
      height: 14px;
    }
    
    .tool-status.complete {
      color: ${theme.colors.success};
    }
    
    .tool-status.error {
      color: ${theme.colors.error};
    }
    
    .tool-status.spinning svg {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .tool-duration {
      font-size: 11px;
      color: ${theme.colors.textMuted};
      font-family: "JetBrains Mono", monospace;
      min-width: 40px;
      text-align: right;
    }
    
    .tool-body {
      display: none;
      padding: ${theme.space.sm}px 0;
      font-family: "JetBrains Mono", monospace;
      font-size: 11px;
      color: ${theme.colors.textMuted};
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 120px;
      overflow-y: auto;
    }
    
    .tool-execution.expanded .tool-body {
      display: block;
    }
    
    .tool-execution.expanded {
      border-left-color: ${theme.colors.agentGoldDim};
    }
    
    /* ─── Typing Indicator ─── */
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: ${theme.space.md}px;
      padding: ${theme.space.sm}px 0;
      margin-bottom: ${theme.space.md}px;
    }
    
    .typing-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${theme.colors.agentGold};
      background: ${theme.colors.agentGoldGlow};
    }
    
    .typing-avatar svg {
      width: 20px;
      height: 20px;
    }
    
    .typing-dots {
      display: flex;
      gap: 4px;
      padding: 10px 16px;
      background: ${theme.colors.bgElevated};
      border: 1px solid ${theme.colors.border};
      border-radius: ${theme.radius.lg}px;
      border-bottom-left-radius: ${theme.radius.sm}px;
    }
    
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${theme.colors.agentGoldDim};
      animation: dotPulse 1.4s infinite;
    }
    
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes dotPulse {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1); }
    }
    
    /* ─── Input Area ─── */
    .input-area {
      flex-shrink: 0;
      padding: ${theme.space.lg}px ${theme.space.xl}px ${theme.space.xl}px;
      display: flex;
      justify-content: center;
      background: ${theme.colors.bg};
    }
    
    .input-wrapper {
      width: 100%;
      max-width: ${theme.layout.maxChatWidth}px;
      display: flex;
      align-items: flex-end;
      gap: ${theme.space.sm}px;
      background: ${theme.colors.bgElevated};
      border: 1px solid ${theme.colors.border};
      border-radius: ${theme.radius.xl}px;
      padding: ${theme.space.sm}px ${theme.space.sm}px ${theme.space.sm}px ${theme.space.lg}px;
      transition: border-color ${theme.transition.normal};
    }
    
    .input-wrapper:focus-within {
      border-color: ${theme.colors.agentGoldDim};
      box-shadow: 0 0 0 1px ${theme.colors.agentGoldGlow};
    }
    
    .input-field {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      color: ${theme.colors.textPrimary};
      font-family: Inter, -apple-system, sans-serif;
      font-size: 15px;
      line-height: 1.5;
      resize: none;
      max-height: 160px;
      padding: 6px 0;
    }
    
    .input-field::placeholder {
      color: ${theme.colors.textMuted};
    }
    
    .send-button {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: ${theme.colors.bgHover};
      color: ${theme.colors.textMuted};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all ${theme.transition.fast};
      flex-shrink: 0;
    }
    
    .send-button.active {
      background: ${theme.colors.agentGold};
      color: ${theme.colors.bg};
    }
    
    .send-button.active:hover {
      background: ${theme.colors.agentGoldDim};
    }
    
    .send-button svg {
      width: 18px;
      height: 18px;
    }
    
    /* ─── Responsive ─── */
    @media (max-width: 640px) {
      .hermes-header {
        padding: 0 ${theme.space.lg}px;
      }
      
      .header-subtitle {
        display: none;
      }
      
      .messages-container {
        padding: ${theme.space.lg}px ${theme.space.md}px;
      }
      
      .input-area {
        padding: ${theme.space.md}px;
      }
      
      .msg-avatar {
        width: 28px;
        height: 28px;
      }
      
      .msg-avatar svg {
        width: 16px;
        height: 16px;
      }
    }
    
    /* ─── Welcome state ─── */
    .welcome-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: ${theme.space.xxxl}px ${theme.space.xl}px;
      text-align: center;
      gap: ${theme.space.lg}px;
      opacity: 0.8;
    }
    
    .welcome-logo {
      color: ${theme.colors.agentGold};
      opacity: 0.4;
    }
    
    .welcome-logo svg {
      width: 64px;
      height: 64px;
    }
    
    .welcome-text {
      color: ${theme.colors.textMuted};
      font-size: 15px;
      max-width: 400px;
      line-height: 1.6;
    }
  `
  document.head.appendChild(style)
}
