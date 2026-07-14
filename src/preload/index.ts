import { contextBridge, ipcRenderer } from 'electron'
import type { NexusApi } from '../shared/contracts'

const api: NexusApi = {
  getSnapshot: () => ipcRenderer.invoke('snapshot:get'),
  saveProviderKey: (provider, key) => ipcRenderer.invoke('provider:save', provider, key),
  removeProviderKey: (provider) => ipcRenderer.invoke('provider:remove', provider),
  discoverModels: (provider) => ipcRenderer.invoke('models:discover', provider),
  testModelResponse: (model) => ipcRenderer.invoke('models:test-response', model),
  createConversation: (mode) => ipcRenderer.invoke('conversation:create', mode),
  setConversationPinned: (id, pinned) => ipcRenderer.invoke('conversation:pin', id, pinned),
  setConversationArchived: (id, archived) => ipcRenderer.invoke('conversation:archive', id, archived),
  deleteConversation: (id) => ipcRenderer.invoke('conversation:delete', id),
  selectConversationWorkspace: (id) => ipcRenderer.invoke('conversation:workspace:select', id),
  clearConversationWorkspace: (id) => ipcRenderer.invoke('conversation:workspace:clear', id),
  sendMessage: (request) => ipcRenderer.invoke('chat:send', request),
  selectFiles: () => ipcRenderer.invoke('files:select'),
  generateImage: (prompt, model) => ipcRenderer.invoke('image:generate', prompt, model),
  transcribeFile: () => ipcRenderer.invoke('audio:transcribe'),
  createRealtimeSession: (model, reasoningEffort) => ipcRenderer.invoke('realtime:create', model, reasoningEffort),
  saveRecording: (data, mime) => ipcRenderer.invoke('recording:save', data, mime),
  startResearch: (request) => ipcRenderer.invoke('research:start', request),
  cancelJob: (id) => ipcRenderer.invoke('job:cancel', id),
  runCommand: (command, cwd) => ipcRenderer.invoke('command:run', command, cwd),
  runSystemAction: (action, value) => ipcRenderer.invoke('system:run', action, value),
  connectMcp: (connector) => ipcRenderer.invoke('mcp:connect', connector),
  callMcpTool: (connectorId, name, args) => ipcRenderer.invoke('mcp:call', connectorId, name, args),
  generateSkill: (description, model) => ipcRenderer.invoke('skill:generate', description, model),
  getPrivacySettings: () => ipcRenderer.invoke('privacy:get'),
  updatePrivacySettings: (settings) => ipcRenderer.invoke('privacy:update', settings),
  exportLocalData: () => ipcRenderer.invoke('privacy:export'),
  deleteLocalData: () => ipcRenderer.invoke('privacy:delete'),
  previewFeedback: (draft) => ipcRenderer.invoke('feedback:preview', draft),
  exportFeedback: (draft) => ipcRenderer.invoke('feedback:export', draft),
  onSnapshot: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: Parameters<typeof listener>[0]): void => listener(snapshot)
    ipcRenderer.on('snapshot:changed', handler)
    return () => ipcRenderer.removeListener('snapshot:changed', handler)
  },
  onChatDelta: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, value: { conversationId: string; delta: string }): void => listener(value)
    ipcRenderer.on('chat:delta', handler)
    return () => ipcRenderer.removeListener('chat:delta', handler)
  }
}

contextBridge.exposeInMainWorld('nexus', Object.freeze(api))
