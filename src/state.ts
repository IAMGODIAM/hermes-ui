// Hermes UI State Management
// Reactive state with event-driven updates

export type MessageRole = 'user' | 'assistant' | 'tool' | 'system'
export type MessageStatus = 'sending' | 'streaming' | 'complete' | 'error'
export type ToolStatus = 'running' | 'complete' | 'error'

export interface ToolExecution {
  id: string
  name: string
  displayName: string
  status: ToolStatus
  startTime: number
  endTime?: number
  args?: string
  result?: string
  collapsed: boolean
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  status: MessageStatus
  tools?: ToolExecution[]
  // For streaming
  streamBuffer?: string
  // Pretext layout cache (invalidated on resize)
  _layoutCache?: {
    width: number
    height: number
    lineCount: number
  }
}

export interface AppState {
  messages: ChatMessage[]
  isConnected: boolean
  isStreaming: boolean
  inputText: string
  scrollPosition: number
  autoScroll: boolean
  viewportWidth: number
  viewportHeight: number
  chatWidth: number
  // UI state
  showSidebar: boolean
  activePanel: 'chat' | 'tools' | 'settings'
  // Agent state
  agentModel: string
  agentStatus: 'idle' | 'thinking' | 'executing' | 'responding'
  iterationCount: number
  maxIterations: number
}

type Listener = () => void

class Store {
  private state: AppState
  private listeners: Set<Listener> = new Set()
  
  constructor() {
    this.state = {
      messages: [],
      isConnected: false,
      isStreaming: false,
      inputText: '',
      scrollPosition: 0,
      autoScroll: true,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      chatWidth: Math.min(window.innerWidth, 720),
      showSidebar: false,
      activePanel: 'chat',
      agentModel: 'claude-opus-4-6',
      agentStatus: 'idle',
      iterationCount: 0,
      maxIterations: 90,
    }
  }
  
  getState(): Readonly<AppState> {
    return this.state
  }
  
  update(partial: Partial<AppState>): void {
    Object.assign(this.state, partial)
    this.notify()
  }
  
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  
  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
  
  // Message operations
  addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const message: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    }
    this.state.messages.push(message)
    this.notify()
    return message
  }
  
  updateMessage(id: string, update: Partial<ChatMessage>): void {
    const msg = this.state.messages.find(m => m.id === id)
    if (msg) {
      Object.assign(msg, update)
      // Invalidate layout cache on content change
      if (update.content !== undefined) {
        msg._layoutCache = undefined
      }
      this.notify()
    }
  }
  
  appendToStream(id: string, chunk: string): void {
    const msg = this.state.messages.find(m => m.id === id)
    if (msg) {
      msg.content += chunk
      msg._layoutCache = undefined
      this.notify()
    }
  }
  
  addToolToMessage(messageId: string, tool: Omit<ToolExecution, 'id' | 'startTime' | 'collapsed'>): ToolExecution {
    const msg = this.state.messages.find(m => m.id === messageId)
    if (!msg) throw new Error(`Message ${messageId} not found`)
    
    const execution: ToolExecution = {
      ...tool,
      id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startTime: Date.now(),
      collapsed: true,
    }
    
    if (!msg.tools) msg.tools = []
    msg.tools.push(execution)
    this.notify()
    return execution
  }
  
  updateTool(messageId: string, toolId: string, update: Partial<ToolExecution>): void {
    const msg = this.state.messages.find(m => m.id === messageId)
    const tool = msg?.tools?.find(t => t.id === toolId)
    if (tool) {
      Object.assign(tool, update)
      this.notify()
    }
  }
  
  clearMessages(): void {
    this.state.messages = []
    this.notify()
  }
  
  invalidateAllLayouts(): void {
    for (const msg of this.state.messages) {
      msg._layoutCache = undefined
    }
    this.notify()
  }
}

export const store = new Store()
